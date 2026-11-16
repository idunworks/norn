/** Board columns. Owners manage them; positions are 0..n-1 within a project. */
import { randomUUID } from 'node:crypto';
import type { Db } from '../db';
import { stamp } from './clock';
import { requireOwner } from './access';
import type { Caller } from './caller';
import { conflict, invalid, notFound } from './errors';
import { MAX_COLUMNS, parse, schemas } from './validate';

export interface StatusOut {
	id: string;
	name: string;
	position: number;
	is_done: boolean;
}

interface StatusRow {
	id: string;
	project_id: string;
	name: string;
	position: number;
	is_done: number;
}

function view(s: StatusRow): StatusOut {
	return { id: s.id, name: s.name, position: s.position, is_done: s.is_done === 1 };
}

export function listStatuses(db: Db, projectId: string): StatusOut[] {
	return (
		db
			.prepare(`SELECT * FROM statuses WHERE project_id = ? ORDER BY position, created_at, rowid`)
			.all(projectId) as StatusRow[]
	).map(view);
}

/** The column, only if it belongs to this project. */
export function statusInProject(db: Db, projectId: string, statusId: string): StatusRow | null {
	const row = db.prepare(`SELECT * FROM statuses WHERE id = ? AND project_id = ?`).get(statusId, projectId) as
		| StatusRow
		| undefined;
	return row ?? null;
}

function columnCount(db: Db, projectId: string): number {
	return (db.prepare(`SELECT COUNT(*) AS n FROM statuses WHERE project_id = ?`).get(projectId) as { n: number }).n;
}

export function createStatus(db: Db, caller: Caller, projectId: string, body: unknown): StatusOut {
	requireOwner(db, caller, projectId);
	const input = parse(schemas.statusCreate, body);
	if (columnCount(db, projectId) >= MAX_COLUMNS) throw conflict(`A project can have at most ${MAX_COLUMNS} columns`);
	const id = randomUUID();
	db.prepare(
		`INSERT INTO statuses (id, project_id, name, position, is_done, created_at)
		 VALUES (?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM statuses WHERE project_id = ?), 0, ?)`
	).run(id, projectId, input.name, projectId, stamp());
	return view(statusInProject(db, projectId, id) as StatusRow);
}

/** Renumber the columns; the list must be exactly the project's columns, each once. */
export function reorderStatuses(db: Db, caller: Caller, projectId: string, body: unknown): StatusOut[] {
	requireOwner(db, caller, projectId);
	const { ordered_ids: ids } = parse(schemas.statusOrder, body);
	const current = new Set(listStatuses(db, projectId).map((s) => s.id));
	if (new Set(ids).size !== ids.length || ids.length !== current.size || !ids.every((id) => current.has(id))) {
		throw invalid("The order must list each of the project's columns once");
	}
	const set = db.prepare(`UPDATE statuses SET position = ? WHERE id = ? AND project_id = ?`);
	db.transaction(() => ids.forEach((id, position) => set.run(position, id, projectId)))();
	return listStatuses(db, projectId);
}

export function updateStatus(db: Db, caller: Caller, projectId: string, statusId: string, body: unknown): StatusOut {
	requireOwner(db, caller, projectId);
	const input = parse(schemas.statusUpdate, body);
	const column = statusInProject(db, projectId, statusId);
	if (!column) throw notFound('Column');
	const name = input.name ?? column.name;
	const isDone = input.is_done === undefined ? column.is_done : input.is_done ? 1 : 0;
	db.prepare(`UPDATE statuses SET name = ?, is_done = ? WHERE id = ?`).run(name, isDone, statusId);
	return view({ ...column, name, is_done: isDone });
}

export function deleteStatus(db: Db, caller: Caller, projectId: string, statusId: string): void {
	requireOwner(db, caller, projectId);
	if (!statusInProject(db, projectId, statusId)) throw notFound('Column');
	const cards = (db.prepare(`SELECT COUNT(*) AS n FROM issues WHERE status_id = ?`).get(statusId) as { n: number }).n;
	if (cards > 0) throw conflict('Move the cards out first: the column must be empty');
	if (columnCount(db, projectId) <= 1) throw conflict('A project needs at least one column');
	db.prepare(`DELETE FROM statuses WHERE id = ?`).run(statusId);
}
