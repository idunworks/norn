import { describe, expect, it } from 'vitest';
import { canDeleteStatus, groupByStatus, matchesFilter, moveCard, shiftStatus } from './board';
import type { Issue, Status } from './types';

const status = (id: string, position: number): Status => ({ id, name: id, position, is_done: false });

function issue(id: string, statusId: string, position: number, extra: Partial<Issue> = {}): Issue {
	return {
		id,
		project_id: 'p',
		status_id: statusId,
		title: id,
		description: null,
		kind: 'task',
		assignee_id: null,
		due_date: null,
		position,
		estimate_minutes: null,
		actual_minutes: null,
		created_by: null,
		created_at: '2026-11-16T10:00:00Z',
		updated_at: '2026-11-16T10:00:00Z',
		comment_count: 0,
		...extra
	};
}

const STATUSES = [status('todo', 0), status('doing', 1), status('done', 2)];
const ISSUES = [issue('b', 'todo', 1), issue('a', 'todo', 0), issue('c', 'doing', 0)];

describe('groupByStatus', () => {
	it('groups by column in position order, with empty columns', () => {
		const columns = groupByStatus(STATUSES, ISSUES);
		expect(columns.todo.map((c) => c.id)).toEqual(['a', 'b']);
		expect(columns.doing.map((c) => c.id)).toEqual(['c']);
		expect(columns.done).toEqual([]);
	});
});

describe('moveCard', () => {
	const columns = groupByStatus(STATUSES, ISSUES);

	it('moves across columns and returns the target order for the API', () => {
		const result = moveCard(columns, 'a', 'doing', 0)!;
		expect(result.orderedIds).toEqual(['a', 'c']);
		expect(result.columns.todo.map((c) => c.id)).toEqual(['b']);
		expect(result.columns.doing[0]).toMatchObject({ id: 'a', status_id: 'doing', position: 0 });
	});

	it('reorders within a column', () => {
		expect(moveCard(columns, 'a', 'todo', 1)!.orderedIds).toEqual(['b', 'a']);
	});

	it('clamps the index and leaves the input untouched', () => {
		expect(moveCard(columns, 'a', 'done', 99)!.orderedIds).toEqual(['a']);
		expect(columns.todo.map((c) => c.id)).toEqual(['a', 'b']);
	});

	it('returns null for an unknown card or column', () => {
		expect(moveCard(columns, 'zz', 'todo', 0)).toBeNull();
		expect(moveCard(columns, 'a', 'zz', 0)).toBeNull();
	});
});

describe('columns', () => {
	it('shifts a column left or right, not past the ends', () => {
		expect(shiftStatus(STATUSES, 'doing', -1)).toEqual(['doing', 'todo', 'done']);
		expect(shiftStatus(STATUSES, 'todo', -1)).toBeNull();
		expect(shiftStatus(STATUSES, 'done', 1)).toBeNull();
	});

	it('allows deleting only an empty column that is not the last', () => {
		const columns = groupByStatus(STATUSES, ISSUES);
		expect(canDeleteStatus(columns, 'done')).toBe(true);
		expect(canDeleteStatus(columns, 'todo')).toBe(false);
		expect(canDeleteStatus({ done: [] }, 'done')).toBe(false);
	});
});

describe('matchesFilter', () => {
	const bug = issue('x', 'todo', 0, { kind: 'bug', assignee_id: 'u1' });
	it('filters by kind and assignee', () => {
		expect(matchesFilter(bug, { assignee: 'all', kind: 'bug' })).toBe(true);
		expect(matchesFilter(bug, { assignee: 'all', kind: 'task' })).toBe(false);
		expect(matchesFilter(bug, { assignee: 'u1', kind: 'all' })).toBe(true);
		expect(matchesFilter(bug, { assignee: 'none', kind: 'all' })).toBe(false);
	});
});
