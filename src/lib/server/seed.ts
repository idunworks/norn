/** One example board so a fresh install isn't empty. Admins see it; nobody is a member. */
import { randomUUID } from 'node:crypto';
import type { Db } from './db';

const COLUMNS: readonly [string, boolean, string][] = [
	['Backlog', false, 'Invite your team to Norn'],
	['To do', false, 'Create your first real project'],
	['In progress', false, 'Drag this card to another column'],
	['Done', true, 'Norn is up and running']
];

export function seedExampleBoard(db: Db): void {
	const now = new Date().toISOString();
	const projectId = randomUUID();
	db.prepare(`INSERT INTO projects (id, name, description, created_at) VALUES (?, ?, ?, ?)`).run(
		projectId,
		'Getting started',
		'An example project. Change it or archive it whenever you like.',
		now
	);
	COLUMNS.forEach(([column, isDone, card], position) => {
		const statusId = randomUUID();
		db.prepare(
			`INSERT INTO statuses (id, project_id, name, position, is_done, created_at) VALUES (?, ?, ?, ?, ?, ?)`
		).run(statusId, projectId, column, position, isDone ? 1 : 0, now);
		db.prepare(
			`INSERT INTO issues (id, project_id, status_id, title, position, created_at, updated_at)
			 VALUES (?, ?, ?, ?, 0, ?, ?)`
		).run(randomUUID(), projectId, statusId, card, now, now);
	});
}
