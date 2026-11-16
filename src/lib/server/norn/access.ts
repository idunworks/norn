/**
 * Per-project access. A project is visible to its members and to admins;
 * everyone else gets 404, so a project's existence does not leak. Owners
 * (and admins) also manage columns, members and the project itself.
 */
import type { Db } from '../db';
import type { Caller } from './caller';
import { forbidden, notFound } from './errors';

export type Role = 'owner' | 'member';

export interface ProjectRow {
	id: string;
	name: string;
	description: string | null;
	created_by: string | null;
	created_at: string;
	archived_at: string | null;
}

export interface ProjectAccess {
	caller: Caller;
	project: ProjectRow;
	/** null for an admin who is not a member. */
	role: Role | null;
	canManage: boolean;
}

export function memberRole(db: Db, projectId: string, userId: string): Role | null {
	const row = db
		.prepare(`SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`)
		.get(projectId, userId) as { role: Role } | undefined;
	return row?.role ?? null;
}

export function requireMember(db: Db, caller: Caller, projectId: string): ProjectAccess {
	const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(projectId) as ProjectRow | undefined;
	if (!project) throw notFound('Project');
	const role = memberRole(db, projectId, caller.userId);
	if (role === null && !caller.isAdmin) throw notFound('Project');
	return { caller, project, role, canManage: caller.isAdmin || role === 'owner' };
}

export function requireOwner(db: Db, caller: Caller, projectId: string): ProjectAccess {
	const access = requireMember(db, caller, projectId);
	if (!access.canManage) throw forbidden("Only the project's owners can do this");
	return access;
}

export function requireAdmin(caller: Caller): void {
	if (!caller.isAdmin) throw forbidden('Admin role required');
}
