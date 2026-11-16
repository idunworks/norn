/**
 * A fresh in-memory database with four people and one project, for the rule
 * tests. Mirrors the service version's `team` fixture.
 */
import { openDb, type Db } from '../db';
import type { Caller } from './caller';
import { addMember } from './members';
import { createProject, getBoard } from './projects';
import { ensureUser, setName } from './users';

export interface Team {
	db: Db;
	admin: Caller;
	owner: Caller;
	member: Caller;
	outsider: Caller;
	pid: string;
	columns: string[];
}

function person(db: Db, name: string, email: string, isAdmin = false): Caller {
	const user = setName(db, ensureUser(db, email).id, name);
	return { userId: user.id, email: user.email, name: user.name, isAdmin };
}

export function makeTeam(): Team {
	const db = openDb(':memory:');
	const admin = person(db, 'Ada Admin', 'ada@example.com', true);
	const owner = person(db, 'Olle Owner', 'olle@example.com');
	const member = person(db, 'Åsa Member', 'asa@example.com');
	const outsider = person(db, 'Otto Outsider', 'otto@example.com');
	const pid = createProject(db, admin, { name: 'Launch', description: 'Ship it' }).id;
	addMember(db, admin, pid, { email: owner.email, role: 'owner' });
	addMember(db, admin, pid, { email: member.email });
	const columns = getBoard(db, admin, pid).statuses.map((s) => s.id);
	return { db, admin, owner, member, outsider, pid, columns };
}

/** The thrown NornError's status, or 0 when nothing was thrown. */
export function statusOf(run: () => unknown): number {
	try {
		run();
		return 0;
	} catch (err) {
		return (err as { status?: number }).status ?? -1;
	}
}
