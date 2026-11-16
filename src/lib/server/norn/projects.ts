/** Projects: list, create, open a board, rename or archive. */
import { randomUUID } from 'node:crypto';
import type { Db } from '../db';
import { stamp } from './clock';
import { requireAdmin, requireMember, requireOwner, type ProjectAccess, type ProjectRow, type Role } from './access';
import type { Caller } from './caller';
import { listIssues, type IssueOut } from './issues';
import { listMembers, type MemberOut } from './members';
import { listStatuses, type StatusOut } from './statuses';
import { parse, schemas } from './validate';

export const DEFAULT_STATUSES: readonly [string, boolean][] = [
	['Backlog', false],
	['To do', false],
	['In progress', false],
	['Done', true]
];

export interface ProjectOut {
	id: string;
	name: string;
	description: string | null;
	created_at: string;
	archived_at: string | null;
	issue_count: number;
	my_role: Role | null;
	can_manage: boolean;
}

export interface BoardOut {
	project: ProjectOut;
	statuses: StatusOut[];
	issues: IssueOut[];
	members: MemberOut[];
}

function view(p: ProjectRow, issueCount: number, role: Role | null, isAdmin: boolean): ProjectOut {
	return {
		id: p.id,
		name: p.name,
		description: p.description,
		created_at: p.created_at,
		archived_at: p.archived_at,
		issue_count: issueCount,
		my_role: role,
		can_manage: isAdmin || role === 'owner'
	};
}

function issueCount(db: Db, projectId: string): number {
	return (db.prepare(`SELECT COUNT(*) AS n FROM issues WHERE project_id = ?`).get(projectId) as { n: number }).n;
}

/** Every non-archived project the caller may see, oldest first. */
export function listProjects(db: Db, caller: Caller): ProjectOut[] {
	const rows = db
		.prepare(
			`SELECT p.*, (SELECT COUNT(*) FROM issues i WHERE i.project_id = p.id) AS issue_count, m.role AS my_role
			 FROM projects p
			 LEFT JOIN project_members m ON m.project_id = p.id AND m.user_id = ?
			 WHERE p.archived_at IS NULL AND (? = 1 OR m.role IS NOT NULL)
			 ORDER BY p.created_at, p.rowid`
		)
		.all(caller.userId, caller.isAdmin ? 1 : 0) as (ProjectRow & { issue_count: number; my_role: Role | null })[];
	return rows.map((r) => view(r, r.issue_count, r.my_role, caller.isAdmin));
}

/** Admins only: a project with the default columns, its creator as owner. */
export function createProject(db: Db, caller: Caller, body: unknown): ProjectOut {
	requireAdmin(caller);
	const input = parse(schemas.projectCreate, body);
	const now = stamp();
	const id = randomUUID();
	db.transaction(() => {
		db.prepare(`INSERT INTO projects (id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, ?)`).run(
			id,
			input.name,
			input.description ?? null,
			caller.userId,
			now
		);
		const addStatus = db.prepare(
			`INSERT INTO statuses (id, project_id, name, position, is_done, created_at) VALUES (?, ?, ?, ?, ?, ?)`
		);
		DEFAULT_STATUSES.forEach(([name, done], position) =>
			addStatus.run(randomUUID(), id, name, position, done ? 1 : 0, now)
		);
		db.prepare(
			`INSERT INTO project_members (project_id, user_id, role, added_by, created_at) VALUES (?, ?, 'owner', ?, ?)`
		).run(id, caller.userId, caller.userId, now);
	})();
	const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as ProjectRow;
	return view(project, 0, 'owner', caller.isAdmin);
}

export function projectOut(db: Db, access: ProjectAccess): ProjectOut {
	return view(access.project, issueCount(db, access.project.id), access.role, access.caller.isAdmin);
}

export function getBoard(db: Db, caller: Caller, projectId: string): BoardOut {
	const access = requireMember(db, caller, projectId);
	const issues = listIssues(db, projectId);
	return {
		project: view(access.project, issues.length, access.role, caller.isAdmin),
		statuses: listStatuses(db, projectId),
		issues,
		members: listMembers(db, projectId)
	};
}

export function updateProject(db: Db, caller: Caller, projectId: string, body: unknown): ProjectOut {
	const access = requireOwner(db, caller, projectId);
	const input = parse(schemas.projectUpdate, body);
	const p = access.project;
	const name = input.name ?? p.name;
	const description = 'description' in input ? (input.description ?? null) : p.description;
	let archivedAt = p.archived_at;
	if (input.archived !== undefined) archivedAt = input.archived ? stamp() : null;
	db.prepare(`UPDATE projects SET name = ?, description = ?, archived_at = ? WHERE id = ?`).run(
		name,
		description,
		archivedAt,
		projectId
	);
	return projectOut(db, { ...access, project: { ...p, name, description, archived_at: archivedAt } });
}
