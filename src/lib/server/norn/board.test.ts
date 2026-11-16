import { beforeEach, describe, expect, it } from 'vitest';
import { timeline } from './comments';
import { createIssue, deleteIssue, moveIssue, updateIssue } from './issues';
import { listNotifications } from './notifications';
import { createProject, getBoard } from './projects';
import { createStatus, deleteStatus, reorderStatuses, updateStatus } from './statuses';
import { makeTeam, statusOf, type Team } from './testkit';
import type { Caller } from './caller';

let team: Team;
beforeEach(() => {
	team = makeTeam();
});

const card = (who: Caller, statusId: string, title = 'Card', pid = team.pid) =>
	createIssue(team.db, who, pid, { status_id: statusId, title });

function titles(statusId: string): string[] {
	return getBoard(team.db, team.admin, team.pid)
		.issues.filter((i) => i.status_id === statusId)
		.sort((a, b) => a.position - b.position)
		.map((i) => i.title);
}

const kinds = (issueId: string) =>
	timeline(team.db, team.admin, team.pid, issueId)
		.filter((e) => e.type === 'activity')
		.map((e) => e.type === 'activity' && e.activity);

describe('issues', () => {
	it('adds new cards to the end of their column', () => {
		const a = card(team.member, team.columns[0], 'A');
		const b = card(team.member, team.columns[0], 'B');
		expect([a.position, b.position]).toEqual([0, 1]);
		expect(a.created_by).toBe(team.member.userId);
	});

	it('moves across columns, renumbers the target and logs the column names', () => {
		const [backlog, todo] = team.columns;
		const a = card(team.member, backlog, 'A');
		const b = card(team.member, todo, 'B');
		moveIssue(team.db, team.member, team.pid, a.id, { to_status_id: todo, ordered_ids: [a.id, b.id] });
		expect(titles(todo)).toEqual(['A', 'B']);
		const last = kinds(a.id).at(-1);
		expect(last && [last.kind, last.data]).toEqual(['status_changed', { from: 'Backlog', to: 'To do' }]);
	});

	it('reorders within a column without logging', () => {
		const a = card(team.member, team.columns[0], 'A');
		const b = card(team.member, team.columns[0], 'B');
		moveIssue(team.db, team.member, team.pid, a.id, { to_status_id: team.columns[0], ordered_ids: [b.id, a.id] });
		expect(titles(team.columns[0])).toEqual(['B', 'A']);
		expect(kinds(a.id).map((k) => k && k.kind)).toEqual(['created']);
	});

	it('refuses columns and issues of another project, and ignores smuggled ids', () => {
		const { db, admin, pid } = team;
		const other = createProject(db, admin, { name: 'Other' }).id;
		const foreignColumn = getBoard(db, admin, other).statuses[0].id;
		const foreign = card(admin, foreignColumn, 'Foreign', other);
		const mine = card(admin, team.columns[0], 'Mine');
		expect(statusOf(() => createIssue(db, admin, pid, { status_id: foreignColumn, title: 'x' }))).toBe(422);
		expect(statusOf(() => updateIssue(db, admin, pid, foreign.id, { title: 'hijack' }))).toBe(404);
		expect(statusOf(() => moveIssue(db, admin, pid, mine.id, { to_status_id: foreignColumn, ordered_ids: [mine.id] }))).toBe(422);
		moveIssue(db, admin, pid, mine.id, { to_status_id: team.columns[0], ordered_ids: [foreign.id, mine.id] });
		expect(getBoard(db, admin, other).issues[0].position).toBe(0);
	});

	it('logs each changed field and notifies the new assignee', () => {
		const { db, pid, owner, member } = team;
		const issue = card(owner, team.columns[0], 'Draft');
		const out = updateIssue(db, owner, pid, issue.id, {
			title: 'Final',
			assignee_id: member.userId,
			estimate_minutes: 90,
			due_date: '2026-12-01',
			kind: 'bug',
			description: '  '
		});
		expect([out.title, out.kind, out.estimate_minutes, out.description]).toEqual(['Final', 'bug', 90, null]);
		const byKind = Object.fromEntries(kinds(issue.id).map((k) => [k && k.kind, k && k.data]));
		expect(byKind.renamed).toEqual({ from: 'Draft', to: 'Final' });
		expect((byKind.assigned as { to: string }).to).toBe('Åsa Member');
		expect(byKind.estimate_changed).toEqual({ from: null, to: 90 });
		expect(byKind.due_changed).toEqual({ from: null, to: '2026-12-01' });
		const notes = listNotifications(db, member);
		expect(notes.unread).toBe(1);
		expect(notes.items[0]).toMatchObject({ kind: 'assigned', data: { issue_title: 'Final', project_name: 'Launch' } });
	});

	it('sends no notification for assigning yourself', () => {
		const issue = card(team.member, team.columns[0]);
		updateIssue(team.db, team.member, team.pid, issue.id, { assignee_id: team.member.userId });
		expect(listNotifications(team.db, team.member).unread).toBe(0);
	});

	it('requires the assignee to be a member, and bounds durations', () => {
		const { db, pid, owner } = team;
		const issue = card(owner, team.columns[0]);
		expect(statusOf(() => updateIssue(db, owner, pid, issue.id, { assignee_id: team.outsider.userId }))).toBe(422);
		expect(statusOf(() => updateIssue(db, owner, pid, issue.id, { actual_minutes: -1 }))).toBe(422);
		expect(statusOf(() => updateIssue(db, owner, pid, issue.id, { actual_minutes: 999 * 60 + 1 }))).toBe(422);
		expect(statusOf(() => updateIssue(db, owner, pid, issue.id, { actual_minutes: 999 * 60 }))).toBe(0);
		expect(statusOf(() => updateIssue(db, owner, pid, issue.id, { project_id: pid }))).toBe(422);
	});
});

describe('columns', () => {
	it('deletes only an empty column that is not the last', () => {
		const { db, pid, owner, columns } = team;
		const issue = card(owner, columns[0]);
		expect(statusOf(() => deleteStatus(db, owner, pid, columns[0]))).toBe(409);
		for (const empty of columns.slice(1)) deleteStatus(db, owner, pid, empty);
		deleteIssue(db, owner, pid, issue.id);
		expect(statusOf(() => deleteStatus(db, owner, pid, columns[0]))).toBe(409);
	});

	it('is owner-only, and a reorder must list every column once', () => {
		const { db, pid, owner, columns } = team;
		expect(statusOf(() => createStatus(db, team.member, pid, { name: 'QA' }))).toBe(403);
		const added = createStatus(db, owner, pid, { name: '  QA  ' });
		expect([added.name, added.position]).toEqual(['QA', 4]);
		expect(statusOf(() => reorderStatuses(db, owner, pid, { ordered_ids: columns }))).toBe(422);
		const names = reorderStatuses(db, owner, pid, { ordered_ids: [added.id, ...[...columns].reverse()] }).map((s) => s.name);
		expect(names).toEqual(['QA', 'Done', 'In progress', 'To do', 'Backlog']);
		const renamed = updateStatus(db, owner, pid, added.id, { name: 'Review', is_done: true });
		expect([renamed.name, renamed.is_done]).toEqual(['Review', true]);
	});
});
