/** Issues: create, edit, move between and within columns, delete. Any member may. */
import { randomUUID } from 'node:crypto';
import type { Db } from '../db';
import { stamp } from './clock';
import { requireMember, type ProjectAccess } from './access';
import { logActivity, notify } from './activity';
import { label, type Caller } from './caller';
import { invalid, notFound } from './errors';
import { memberIds } from './members';
import { statusInProject } from './statuses';
import { lookup, unknownPerson } from './users';
import { parse, schemas } from './validate';

export interface IssueOut {
	id: string;
	project_id: string;
	status_id: string;
	title: string;
	description: string | null;
	kind: 'task' | 'bug';
	assignee_id: string | null;
	due_date: string | null;
	position: number;
	estimate_minutes: number | null;
	actual_minutes: number | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
	comment_count: number;
}

type IssueRow = Omit<IssueOut, 'comment_count'>;
type Patchable = 'title' | 'description' | 'assignee_id' | 'due_date' | 'kind' | 'estimate_minutes' | 'actual_minutes';

/** field -> activity kind. Description edits are not logged. */
const LOGGED: Partial<Record<Patchable, string>> = {
	title: 'renamed',
	due_date: 'due_changed',
	kind: 'kind_changed',
	estimate_minutes: 'estimate_changed',
	actual_minutes: 'actual_changed'
};
const NOT_NULLABLE: readonly Patchable[] = ['title', 'kind'];
const COMMENT_COUNT = `(SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) AS comment_count`;

export function listIssues(db: Db, projectId: string): IssueOut[] {
	return db
		.prepare(`SELECT i.*, ${COMMENT_COUNT} FROM issues i WHERE i.project_id = ? ORDER BY i.position, i.created_at, i.rowid`)
		.all(projectId) as IssueOut[];
}

export function issueOut(db: Db, issueId: string): IssueOut {
	return db.prepare(`SELECT i.*, ${COMMENT_COUNT} FROM issues i WHERE i.id = ?`).get(issueId) as IssueOut;
}

/** The issue, only if it belongs to this project. */
export function issueInProject(db: Db, projectId: string, issueId: string): IssueRow {
	const row = db.prepare(`SELECT * FROM issues WHERE id = ? AND project_id = ?`).get(issueId, projectId) as
		| IssueRow
		| undefined;
	if (!row) throw notFound('Issue');
	return row;
}

function column(db: Db, projectId: string, statusId: string) {
	const found = statusInProject(db, projectId, statusId);
	if (!found) throw invalid('Column is not on this board');
	return found;
}

export function createIssue(db: Db, caller: Caller, projectId: string, body: unknown): IssueOut {
	requireMember(db, caller, projectId);
	const input = parse(schemas.issueCreate, body);
	const status = column(db, projectId, input.status_id);
	const id = randomUUID();
	const now = stamp();
	db.transaction(() => {
		db.prepare(
			`INSERT INTO issues (id, project_id, status_id, title, kind, position, created_by, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM issues WHERE status_id = ?), ?, ?, ?)`
		).run(id, projectId, status.id, input.title, input.kind, status.id, caller.userId, now, now);
		logActivity(db, { issueId: id, projectId, actorId: caller.userId, kind: 'created', data: {} });
	})();
	return issueOut(db, id);
}

export function updateIssue(db: Db, caller: Caller, projectId: string, issueId: string, body: unknown): IssueOut {
	const access = requireMember(db, caller, projectId);
	const issue = issueInProject(db, projectId, issueId);
	const fields = parse(schemas.issueUpdate, body) as Partial<Record<Patchable, unknown>>;
	const assignee = fields.assignee_id;
	if (typeof assignee === 'string' && assignee !== issue.assignee_id && !memberIds(db, projectId).has(assignee)) {
		throw invalid('The assignee must be a project member');
	}
	db.transaction(() => applyChanges(db, access, issue, fields))();
	return issueOut(db, issueId);
}

function applyChanges(db: Db, access: ProjectAccess, issue: IssueRow, fields: Partial<Record<Patchable, unknown>>): void {
	const actorId = access.caller.userId;
	let next: IssueRow = issue;
	for (const [field, value] of Object.entries(fields) as [Patchable, unknown][]) {
		if (value === undefined || (NOT_NULLABLE.includes(field) && value === null)) continue;
		if (next[field] === value) continue;
		const before = next[field];
		next = { ...next, [field]: value };
		const kind = LOGGED[field];
		if (kind) {
			logActivity(db, { issueId: issue.id, projectId: issue.project_id, actorId, kind, data: { from: before, to: value } });
		} else if (field === 'assignee_id') {
			logAssignment(db, access, next);
		}
	}
	if (next === issue) return;
	db.prepare(
		`UPDATE issues SET title = ?, description = ?, assignee_id = ?, due_date = ?, kind = ?,
		 estimate_minutes = ?, actual_minutes = ?, updated_at = ? WHERE id = ?`
	).run(next.title, next.description, next.assignee_id, next.due_date, next.kind, next.estimate_minutes, next.actual_minutes, stamp(), issue.id);
}

function logAssignment(db: Db, access: ProjectAccess, issue: IssueRow): void {
	const toId = issue.assignee_id;
	const person = toId ? (lookup(db, [toId]).get(toId) ?? unknownPerson(toId)) : null;
	logActivity(db, {
		issueId: issue.id,
		projectId: issue.project_id,
		actorId: access.caller.userId,
		kind: 'assigned',
		data: { to: person ? label(person) : null, to_id: toId }
	});
	if (toId) {
		notify(db, {
			recipients: [toId],
			actorId: access.caller.userId,
			kind: 'assigned',
			projectId: access.project.id,
			issueId: issue.id,
			data: { issue_title: issue.title, project_name: access.project.name }
		});
	}
}

/**
 * Put the issue in the target column and renumber that column in the given
 * order. Ids that are not cards of that column are ignored, so a stale client
 * cannot touch another project. One transaction.
 */
export function moveIssue(db: Db, caller: Caller, projectId: string, issueId: string, body: unknown): IssueOut {
	requireMember(db, caller, projectId);
	const issue = issueInProject(db, projectId, issueId);
	const input = parse(schemas.issueMove, body);
	if (!input.ordered_ids.includes(issue.id)) throw invalid('ordered_ids must include the moved issue');
	const to = column(db, projectId, input.to_status_id);
	db.transaction(() => {
		const from = statusInProject(db, projectId, issue.status_id);
		if (issue.status_id !== to.id) {
			db.prepare(`UPDATE issues SET status_id = ?, updated_at = ? WHERE id = ?`).run(to.id, stamp(), issue.id);
		}
		const setPosition = db.prepare(`UPDATE issues SET position = ? WHERE id = ? AND project_id = ? AND status_id = ?`);
		[...new Set(input.ordered_ids)].forEach((id, position) => setPosition.run(position, id, projectId, to.id));
		if (from && from.id !== to.id) {
			logActivity(db, {
				issueId: issue.id,
				projectId,
				actorId: caller.userId,
				kind: 'status_changed',
				data: { from: from.name, to: to.name }
			});
		}
	})();
	return issueOut(db, issue.id);
}

export function deleteIssue(db: Db, caller: Caller, projectId: string, issueId: string): void {
	requireMember(db, caller, projectId);
	issueInProject(db, projectId, issueId);
	db.prepare(`DELETE FROM issues WHERE id = ?`).run(issueId);
}
