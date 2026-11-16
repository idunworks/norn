/** People. A row is made the first time an allowed address signs in. */
import { randomUUID } from 'node:crypto';
import type { Db } from '../db';
import type { Person } from './caller';

export const MAX_NAME_LENGTH = 80;

export function ensureUser(db: Db, email: string): Person {
	const existing = findByEmail(db, email);
	if (existing) return existing;
	const person: Person = { id: randomUUID(), email, name: null };
	db.prepare(`INSERT INTO users (id, email, name, created_at) VALUES (?, ?, NULL, ?)`).run(
		person.id,
		email,
		new Date().toISOString()
	);
	return person;
}

export function findByEmail(db: Db, email: string): Person | null {
	const row = db
		.prepare(`SELECT id, email, name FROM users WHERE email = ?`)
		.get(email.trim().toLowerCase()) as Person | undefined;
	return row ?? null;
}

/** People by id; ids with no user are simply absent. */
export function lookup(db: Db, ids: Iterable<string | null | undefined>): Map<string, Person> {
	const unique = [...new Set([...ids].filter((id): id is string => Boolean(id)))];
	if (unique.length === 0) return new Map();
	const rows = db
		.prepare(`SELECT id, email, name FROM users WHERE id IN (${unique.map(() => '?').join(',')})`)
		.all(...unique) as Person[];
	return new Map(rows.map((p) => [p.id, p]));
}

export function unknownPerson(id: string): Person {
	return { id, email: '', name: null };
}

/** Set (or clear, with an empty string) a user's display name. */
export function setName(db: Db, userId: string, name: string): Person {
	const value = name.trim().slice(0, MAX_NAME_LENGTH) || null;
	db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(value, userId);
	return db.prepare(`SELECT id, email, name FROM users WHERE id = ?`).get(userId) as Person;
}
