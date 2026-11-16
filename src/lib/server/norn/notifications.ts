/**
 * The reader's notifications, newest first. Only projects the reader still
 * belongs to count (admins see all); only their own can be marked read.
 */
import type { Db } from '../db';
import { stamp } from './clock';
import type { Caller } from './caller';
import { lookup, unknownPerson } from './users';
import { parse, schemas } from './validate';

const PAGE = 20;

interface NotificationRow {
	id: string;
	kind: 'assigned' | 'mention';
	actor_id: string | null;
	project_id: string | null;
	issue_id: string | null;
	data: string;
	read_at: string | null;
	created_at: string;
}

function visible(caller: Caller): string {
	return caller.isAdmin
		? `n.user_id = @user`
		: `n.user_id = @user AND n.project_id IN (SELECT project_id FROM project_members WHERE user_id = @user)`;
}

export function listNotifications(db: Db, caller: Caller) {
	const where = visible(caller);
	const rows = db
		.prepare(`SELECT n.* FROM notifications n WHERE ${where} ORDER BY n.created_at DESC, n.rowid DESC LIMIT ${PAGE}`)
		.all({ user: caller.userId }) as NotificationRow[];
	const unread = (
		db.prepare(`SELECT COUNT(*) AS n FROM notifications n WHERE ${where} AND n.read_at IS NULL`).get({
			user: caller.userId
		}) as { n: number }
	).n;
	const people = lookup(db, rows.map((r) => r.actor_id));
	return {
		items: rows.map((r) => {
			const actor = r.actor_id ? (people.get(r.actor_id) ?? unknownPerson(r.actor_id)) : null;
			return {
				id: r.id,
				kind: r.kind,
				actor: actor && { id: actor.id, name: actor.name, email: actor.email },
				project_id: r.project_id,
				issue_id: r.issue_id,
				data: JSON.parse(r.data),
				read_at: r.read_at,
				created_at: r.created_at
			};
		}),
		unread
	};
}

/** Mark the given notifications (or all) read, then answer the fresh list. */
export function markRead(db: Db, caller: Caller, body: unknown) {
	const { ids } = parse(schemas.markRead, body ?? {});
	const now = stamp();
	if (ids) {
		const mark = db.prepare(`UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL`);
		db.transaction(() => ids.forEach((id) => mark.run(now, id, caller.userId)))();
	} else {
		db.prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`).run(now, caller.userId);
	}
	return listNotifications(db, caller);
}
