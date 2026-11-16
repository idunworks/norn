/** Project members. Owners and admins add people by their account email. */
import type { Db } from '../db';
import { stamp } from './clock';
import { requireMember, requireOwner, type ProjectAccess, type Role } from './access';
import type { Caller } from './caller';
import { conflict, NornError, notFound } from './errors';
import { findByEmail, lookup, unknownPerson } from './users';
import { parse, schemas } from './validate';

export interface MemberOut {
	id: string;
	name: string | null;
	email: string;
	role: Role;
}

interface MemberRow {
	user_id: string;
	role: Role;
}

function rows(db: Db, projectId: string): MemberRow[] {
	return db
		.prepare(`SELECT user_id, role FROM project_members WHERE project_id = ? ORDER BY created_at, rowid`)
		.all(projectId) as MemberRow[];
}

export function listMembers(db: Db, projectId: string): MemberOut[] {
	const members = rows(db, projectId);
	const people = lookup(db, members.map((m) => m.user_id));
	return members.map((m) => {
		const p = people.get(m.user_id) ?? unknownPerson(m.user_id);
		return { id: p.id, name: p.name, email: p.email, role: m.role };
	});
}

export function memberIds(db: Db, projectId: string): Set<string> {
	return new Set(rows(db, projectId).map((m) => m.user_id));
}

function one(db: Db, projectId: string, userId: string): MemberOut {
	const found = listMembers(db, projectId).find((m) => m.id === userId);
	if (!found) throw notFound('Member');
	return found;
}

/** A project must keep at least one owner, unless an admin is acting. */
function keepAnOwner(db: Db, access: ProjectAccess, userId: string): void {
	if (access.caller.isAdmin) return;
	const members = rows(db, access.project.id);
	const owners = members.filter((m) => m.role === 'owner').length;
	if (members.find((m) => m.user_id === userId)?.role === 'owner' && owners <= 1) {
		throw conflict('The project needs at least one owner');
	}
}

export function getMembers(db: Db, caller: Caller, projectId: string): MemberOut[] {
	requireMember(db, caller, projectId);
	return listMembers(db, projectId);
}

export function addMember(db: Db, caller: Caller, projectId: string, body: unknown): MemberOut {
	const access = requireOwner(db, caller, projectId);
	const input = parse(schemas.memberAdd, body);
	const person = findByEmail(db, input.email);
	// Someone who has never signed in has no account yet.
	if (!person) throw new NornError(404, 'No account with that email');
	// Re-adding the last owner as a member would demote them: same rule as changeRole.
	if (input.role !== 'owner') keepAnOwner(db, access, person.id);
	db.prepare(
		`INSERT INTO project_members (project_id, user_id, role, added_by, created_at) VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT (project_id, user_id) DO UPDATE SET role = excluded.role`
	).run(access.project.id, person.id, input.role, caller.userId, stamp());
	return one(db, projectId, person.id);
}

export function changeRole(db: Db, caller: Caller, projectId: string, userId: string, body: unknown): MemberOut {
	const access = requireOwner(db, caller, projectId);
	const input = parse(schemas.memberUpdate, body);
	if (input.role !== 'owner') keepAnOwner(db, access, userId);
	const result = db
		.prepare(`UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?`)
		.run(input.role, projectId, userId);
	if (result.changes === 0) throw notFound('Member');
	return one(db, projectId, userId);
}

/** Remove a member; issues assigned to them go back to unassigned. */
export function removeMember(db: Db, caller: Caller, projectId: string, userId: string): void {
	const access = requireOwner(db, caller, projectId);
	keepAnOwner(db, access, userId);
	db.transaction(() => {
		const result = db.prepare(`DELETE FROM project_members WHERE project_id = ? AND user_id = ?`).run(projectId, userId);
		if (result.changes === 0) throw notFound('Member');
		db.prepare(`UPDATE issues SET assignee_id = NULL WHERE project_id = ? AND assignee_id = ?`).run(projectId, userId);
	})();
}
