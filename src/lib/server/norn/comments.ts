/**
 * Comments, @mentions and the issue timeline. Any member may comment; only
 * the author (or an admin) may delete a comment, and its mention
 * notifications go with it.
 */
import { randomUUID } from 'node:crypto';
import type { Db } from '../db';
import { stamp } from './clock';
import { requireMember } from './access';
import { notify } from './activity';
import type { Caller, Person } from './caller';
import { forbidden, notFound } from './errors';
import { issueInProject } from './issues';
import { memberIds } from './members';
import { parseMentions } from './mentions';
import { lookup, unknownPerson } from './users';
import { parse, schemas } from './validate';

const SNIPPET_LENGTH = 140;

interface CommentRow {
	id: string;
	issue_id: string;
	author_id: string | null;
	body: string;
	created_at: string;
}

interface ActivityRow {
	id: string;
	actor_id: string | null;
	kind: string;
	data: string;
	created_at: string;
}

function person(id: string | null, people: Map<string, Person>) {
	if (!id) return null;
	const p = people.get(id) ?? unknownPerson(id);
	return { id: p.id, name: p.name, email: p.email };
}

function commentOut(c: CommentRow, people: Map<string, Person>) {
	return { id: c.id, issue_id: c.issue_id, author: person(c.author_id, people), body: c.body, created_at: c.created_at };
}

/** Comments and activity merged, oldest first. */
export function timeline(db: Db, caller: Caller, projectId: string, issueId: string) {
	requireMember(db, caller, projectId);
	issueInProject(db, projectId, issueId);
	const comments = db
		.prepare(`SELECT *, rowid AS seq FROM comments WHERE issue_id = ? ORDER BY created_at, rowid`)
		.all(issueId) as (CommentRow & { seq: number })[];
	const events = db
		.prepare(`SELECT *, rowid AS seq FROM activity WHERE issue_id = ? ORDER BY created_at, rowid`)
		.all(issueId) as (ActivityRow & { seq: number })[];
	const people = lookup(db, [...comments.map((c) => c.author_id), ...events.map((a) => a.actor_id)]);
	const entries = [
		...comments.map((c) => ({ type: 'comment' as const, created_at: c.created_at, comment: commentOut(c, people) })),
		...events.map((a) => ({
			type: 'activity' as const,
			created_at: a.created_at,
			activity: { id: a.id, actor: person(a.actor_id, people), kind: a.kind, data: JSON.parse(a.data), created_at: a.created_at }
		}))
	];
	// Stable sort: equal times keep comments-then-activity insertion order per kind.
	return entries.sort((x, y) => x.created_at.localeCompare(y.created_at));
}

export function addComment(db: Db, caller: Caller, projectId: string, issueId: string, body: unknown) {
	const access = requireMember(db, caller, projectId);
	const issue = issueInProject(db, projectId, issueId);
	const input = parse(schemas.commentCreate, body);
	const id = randomUUID();
	const people = lookup(db, [...memberIds(db, projectId), caller.userId]);
	db.transaction(() => {
		db.prepare(`INSERT INTO comments (id, issue_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)`).run(
			id,
			issue.id,
			caller.userId,
			input.body,
			stamp()
		);
		const candidates = [...people.values()].filter((p) => p.id !== caller.userId);
		notify(db, {
			recipients: parseMentions(input.body, candidates),
			actorId: caller.userId,
			kind: 'mention',
			projectId,
			issueId: issue.id,
			commentId: id,
			data: { issue_title: issue.title, project_name: access.project.name, snippet: input.body.slice(0, SNIPPET_LENGTH) }
		});
	})();
	const row = db.prepare(`SELECT * FROM comments WHERE id = ?`).get(id) as CommentRow;
	return commentOut(row, people);
}

export function deleteComment(db: Db, caller: Caller, projectId: string, issueId: string, commentId: string): void {
	requireMember(db, caller, projectId);
	issueInProject(db, projectId, issueId);
	const comment = db.prepare(`SELECT * FROM comments WHERE id = ? AND issue_id = ?`).get(commentId, issueId) as
		| CommentRow
		| undefined;
	if (!comment) throw notFound('Comment');
	if (comment.author_id !== caller.userId && !caller.isAdmin) throw forbidden('You can only delete your own comments');
	db.prepare(`DELETE FROM comments WHERE id = ?`).run(commentId);
}
