/**
 * Pure board state: grouping cards by column and the result of a move.
 * Every function returns new arrays and objects; nothing is changed in place.
 */
import type { Issue, IssuePatch, Status } from './types';

export type Columns = Record<string, Issue[]>;

export function sortedStatuses(statuses: readonly Status[]): Status[] {
	return [...statuses].sort((a, b) => a.position - b.position);
}

/** Cards grouped by column id, each column in position order. */
export function groupByStatus(statuses: readonly Status[], issues: readonly Issue[]): Columns {
	const columns: Columns = Object.fromEntries(statuses.map((s) => [s.id, [] as Issue[]]));
	for (const issue of issues) {
		columns[issue.status_id] = [...(columns[issue.status_id] ?? []), issue];
	}
	return Object.fromEntries(
		Object.entries(columns).map(([id, cards]) => [
			id,
			[...cards].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
		])
	);
}

export interface MoveResult {
	columns: Columns;
	toStatusId: string;
	orderedIds: string[];
}

/**
 * Move a card to `toStatusId` at `toIndex` (clamped). Returns the new
 * columns plus what the API needs: the target column's ids in order.
 * Returns null when the card isn't on the board.
 */
export function moveCard(columns: Columns, issueId: string, toStatusId: string, toIndex: number): MoveResult | null {
	const fromStatusId = Object.keys(columns).find((id) => columns[id].some((c) => c.id === issueId));
	if (fromStatusId === undefined || !(toStatusId in columns)) return null;
	const card = columns[fromStatusId].find((c) => c.id === issueId)!;
	const without = { ...columns, [fromStatusId]: columns[fromStatusId].filter((c) => c.id !== issueId) };
	const target = without[toStatusId];
	const index = Math.max(0, Math.min(toIndex, target.length));
	const moved = { ...card, status_id: toStatusId };
	const nextTarget = [...target.slice(0, index), moved, ...target.slice(index)].map((c, position) => ({
		...c,
		position
	}));
	return {
		columns: { ...without, [toStatusId]: nextTarget },
		toStatusId,
		orderedIds: nextTarget.map((c) => c.id)
	};
}

/** Swap a column one step left (-1) or right (+1). Returns the new id order. */
export function shiftStatus(statuses: readonly Status[], statusId: string, step: -1 | 1): string[] | null {
	const ids = sortedStatuses(statuses).map((s) => s.id);
	const from = ids.indexOf(statusId);
	const to = from + step;
	if (from < 0 || to < 0 || to >= ids.length) return null;
	const next = [...ids];
	[next[from], next[to]] = [next[to], next[from]];
	return next;
}

/** A column may be deleted when it is empty and not the project's last. */
export function canDeleteStatus(columns: Columns, statusId: string): boolean {
	return (columns[statusId]?.length ?? 0) === 0 && Object.keys(columns).length > 1;
}

export function applyPatch(issue: Issue, patch: IssuePatch): Issue {
	return { ...issue, ...patch } as Issue;
}

export interface BoardFilter {
	assignee: 'all' | 'none' | string;
	kind: 'all' | Issue['kind'];
}

export const NO_FILTER: BoardFilter = { assignee: 'all', kind: 'all' };

export function matchesFilter(issue: Issue, filter: BoardFilter): boolean {
	if (filter.kind !== 'all' && issue.kind !== filter.kind) return false;
	if (filter.assignee === 'none') return issue.assignee_id === null;
	if (filter.assignee !== 'all') return issue.assignee_id === filter.assignee;
	return true;
}
