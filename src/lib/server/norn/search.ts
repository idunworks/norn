/**
 * Plain substring search over issue titles and descriptions, limited to the
 * projects the caller can see. Case-insensitive for every alphabet: SQLite's
 * own LIKE folds ASCII only, so both sides are lower-cased in JavaScript.
 */
import type { Db } from '../db';
import type { Caller } from './caller';
import type { IssueOut } from './issues';
import { lookup, unknownPerson } from './users';

export const SEARCH_LIMIT = 50;
export const MAX_QUERY_LENGTH = 200;

export function escapeLike(term: string): string {
	return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function searchIssues(db: Db, caller: Caller, query: string) {
	const term = query.trim().slice(0, MAX_QUERY_LENGTH);
	if (!term) return [];
	const pattern = `%${escapeLike(term.toLocaleLowerCase())}%`;
	const rows = db
		.prepare(
			`SELECT i.*, p.name AS project_name, s.name AS status_name
			 FROM issues i
			 JOIN projects p ON p.id = i.project_id
			 JOIN statuses s ON s.id = i.status_id
			 WHERE p.archived_at IS NULL
			   AND (norn_lower(i.title) LIKE @pattern ESCAPE '\\' OR norn_lower(COALESCE(i.description, '')) LIKE @pattern ESCAPE '\\')
			   AND (@admin = 1 OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = p.id AND m.user_id = @user))
			 ORDER BY i.updated_at DESC
			 LIMIT ${SEARCH_LIMIT}`
		)
		.all({ pattern, admin: caller.isAdmin ? 1 : 0, user: caller.userId }) as (Omit<IssueOut, 'comment_count'> & {
		project_name: string;
		status_name: string;
	})[];
	const people = lookup(db, rows.map((r) => r.assignee_id));
	return rows.map(({ project_name, status_name, ...issue }) => {
		const a = issue.assignee_id ? (people.get(issue.assignee_id) ?? unknownPerson(issue.assignee_id)) : null;
		return {
			issue: { ...issue, comment_count: 0 },
			project_name,
			status_name,
			assignee: a && { id: a.id, name: a.name, email: a.email }
		};
	});
}
