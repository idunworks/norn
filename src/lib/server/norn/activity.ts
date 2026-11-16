/** Append-only issue history and in-app notifications. */
import { randomUUID } from 'node:crypto';
import type { Db } from '../db';
import { stamp } from './clock';

export function logActivity(
	db: Db,
	entry: { issueId: string; projectId: string; actorId: string | null; kind: string; data: object }
): void {
	db.prepare(
		`INSERT INTO activity (id, issue_id, project_id, actor_id, kind, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(randomUUID(), entry.issueId, entry.projectId, entry.actorId, entry.kind, JSON.stringify(entry.data), stamp());
}

/** One notification per recipient, never to the actor. Returns how many were made. */
export function notify(
	db: Db,
	n: {
		recipients: Iterable<string>;
		actorId: string;
		kind: 'assigned' | 'mention';
		projectId: string;
		issueId: string;
		commentId?: string;
		data: object;
	}
): number {
	const insert = db.prepare(
		`INSERT INTO notifications (id, user_id, issue_id, project_id, comment_id, kind, actor_id, data, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	let sent = 0;
	for (const userId of new Set(n.recipients)) {
		if (userId === n.actorId) continue;
		insert.run(
			randomUUID(),
			userId,
			n.issueId,
			n.projectId,
			n.commentId ?? null,
			n.kind,
			n.actorId,
			JSON.stringify(n.data),
			stamp()
		);
		sent += 1;
	}
	return sent;
}
