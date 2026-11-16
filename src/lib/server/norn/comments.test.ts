import { beforeEach, describe, expect, it } from 'vitest';
import { addComment, deleteComment, timeline } from './comments';
import { createIssue, updateIssue } from './issues';
import { removeMember } from './members';
import { listNotifications, markRead } from './notifications';
import { getBoard } from './projects';
import { escapeLike, searchIssues } from './search';
import { makeTeam, statusOf, type Team } from './testkit';
import type { Caller } from './caller';

let team: Team;
beforeEach(() => {
	team = makeTeam();
});

const card = (who: Caller, title = 'Card') => createIssue(team.db, who, team.pid, { status_id: team.columns[0], title });
const comment = (who: Caller, issueId: string, body: string) => addComment(team.db, who, team.pid, issueId, { body });

describe('comments and notifications', () => {
	it('notifies mentioned members, never the author or outsiders', () => {
		const issue = card(team.owner);
		const c = comment(team.owner, issue.id, '@åsa can you look? cc @olle @otto');
		expect(c.author?.name).toBe('Olle Owner');
		const notes = listNotifications(team.db, team.member);
		expect(notes.items.map((n) => n.kind)).toEqual(['mention']);
		expect(notes.items[0].data.snippet).toMatch(/^@åsa can you look\?/);
		expect(notes.items[0].actor?.name).toBe('Olle Owner');
		expect(listNotifications(team.db, team.owner).unread).toBe(0);
		expect(listNotifications(team.db, team.outsider).unread).toBe(0);
	});

	it('marks one or all read, and only your own', () => {
		for (const title of ['One', 'Two']) comment(team.owner, card(team.owner, title).id, '@åsa');
		const items = listNotifications(team.db, team.member).items;
		markRead(team.db, team.outsider, { ids: [items[0].id] });
		expect(listNotifications(team.db, team.member).unread).toBe(2);
		expect(markRead(team.db, team.member, { ids: [items[0].id] }).unread).toBe(1);
		expect(markRead(team.db, team.member, {}).unread).toBe(0);
	});

	it('lets only the author or an admin delete a comment', () => {
		const issue = card(team.member);
		const mine = comment(team.member, issue.id, 'mine');
		expect(statusOf(() => deleteComment(team.db, team.owner, team.pid, issue.id, mine.id))).toBe(403);
		expect(statusOf(() => deleteComment(team.db, team.member, team.pid, issue.id, mine.id))).toBe(0);
		const again = comment(team.member, issue.id, 'again');
		expect(statusOf(() => deleteComment(team.db, team.admin, team.pid, issue.id, again.id))).toBe(0);
	});

	it('takes a mention with its comment when the comment is deleted', () => {
		const issue = card(team.owner);
		const c = comment(team.owner, issue.id, '@åsa the code is 1234');
		deleteComment(team.db, team.owner, team.pid, issue.id, c.id);
		expect(listNotifications(team.db, team.member)).toEqual({ items: [], unread: 0 });
	});

	it("hides a project's notifications from someone who left it", () => {
		comment(team.owner, card(team.owner).id, '@åsa');
		removeMember(team.db, team.owner, team.pid, team.member.userId);
		expect(listNotifications(team.db, team.member)).toEqual({ items: [], unread: 0 });
	});

	it('merges comments and activity, oldest first, and counts comments on the board', () => {
		const issue = card(team.member);
		comment(team.member, issue.id, 'first');
		comment(team.member, issue.id, 'second');
		const types = timeline(team.db, team.member, team.pid, issue.id).map((e) => e.type);
		expect(types).toEqual(['activity', 'comment', 'comment']);
		expect(getBoard(team.db, team.member, team.pid).issues[0].comment_count).toBe(2);
	});
});

describe('search', () => {
	it('matches title or description, any case, within visible projects', () => {
		const login = card(team.member, 'Fix login');
		updateIssue(team.db, team.member, team.pid, login.id, { description: 'Users see 100%_off banner' });
		card(team.member, 'Unrelated');
		card(team.member, 'Öppna Ärende');
		const hits = searchIssues(team.db, team.member, 'LOGIN');
		expect(hits.map((h) => [h.issue.title, h.project_name, h.status_name])).toEqual([['Fix login', 'Launch', 'Backlog']]);
		expect(searchIssues(team.db, team.member, '%_')).toHaveLength(1);
		expect(searchIssues(team.db, team.member, 'ärende')).toHaveLength(1);
		expect(searchIssues(team.db, team.member, '   ')).toEqual([]);
		expect(searchIssues(team.db, team.outsider, 'login')).toEqual([]);
	});

	it('escapes LIKE wildcards', () => {
		expect(escapeLike('100%_\\')).toBe('100\\%\\_\\\\');
	});
});
