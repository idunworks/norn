import { beforeEach, describe, expect, it } from 'vitest';
import { createIssue, updateIssue } from './issues';
import { addMember, changeRole, removeMember } from './members';
import { createProject, getBoard, listProjects, updateProject } from './projects';
import { makeTeam, statusOf, type Team } from './testkit';

let team: Team;
beforeEach(() => {
	team = makeTeam();
});

describe('projects and members', () => {
	it('gives a new project the default columns and its creator as owner', () => {
		const board = getBoard(team.db, team.admin, team.pid);
		expect(board.statuses.map((s) => s.name)).toEqual(['Backlog', 'To do', 'In progress', 'Done']);
		expect(board.statuses.map((s) => s.is_done)).toEqual([false, false, false, true]);
		const roles = Object.fromEntries(board.members.map((m) => [m.email, m.role]));
		expect(roles).toEqual({ 'ada@example.com': 'owner', 'olle@example.com': 'owner', 'asa@example.com': 'member' });
	});

	it('lets only admins create projects', () => {
		expect(statusOf(() => createProject(team.db, team.owner, { name: 'Mine' }))).toBe(403);
	});

	it('shows members only their projects, admins the seeded example too', () => {
		expect(listProjects(team.db, team.member).map((p) => p.name)).toEqual(['Launch']);
		expect(listProjects(team.db, team.admin).map((p) => p.name)).toContain('Getting started');
	});

	it('answers outsiders 404, not 403', () => {
		expect(statusOf(() => getBoard(team.db, team.outsider, team.pid))).toBe(404);
		expect(listProjects(team.db, team.outsider)).toEqual([]);
	});

	it('lets owners manage, members not', () => {
		const { db, pid } = team;
		expect(statusOf(() => updateProject(db, team.member, pid, { name: 'Renamed' }))).toBe(403);
		expect(statusOf(() => addMember(db, team.member, pid, { email: 'otto@example.com' }))).toBe(403);
		expect(updateProject(db, team.owner, pid, { name: 'Renamed' }).name).toBe('Renamed');
	});

	it('answers 404 for an email with no account and 422 for a non-email', () => {
		expect(statusOf(() => addMember(team.db, team.owner, team.pid, { email: 'ghost@example.com' }))).toBe(404);
		expect(statusOf(() => addMember(team.db, team.owner, team.pid, { email: '../../admin' }))).toBe(422);
	});

	it('keeps the last owner unless an admin acts', () => {
		const { db, pid, owner, admin } = team;
		removeMember(db, admin, pid, admin.userId);
		expect(statusOf(() => removeMember(db, owner, pid, owner.userId))).toBe(409);
		expect(statusOf(() => changeRole(db, owner, pid, owner.userId, { role: 'member' }))).toBe(409);
		expect(statusOf(() => addMember(db, owner, pid, { email: owner.email, role: 'member' }))).toBe(409);
	});

	it('unassigns the issues of a removed member', () => {
		const { db, pid, owner, member } = team;
		const issue = createIssue(db, owner, pid, { status_id: team.columns[0], title: 'T' });
		updateIssue(db, owner, pid, issue.id, { assignee_id: member.userId });
		removeMember(db, owner, pid, member.userId);
		expect(getBoard(db, owner, pid).issues[0].assignee_id).toBeNull();
	});

	it('drops archived projects from the list', () => {
		expect(updateProject(team.db, team.owner, team.pid, { archived: true }).archived_at).toBeTruthy();
		expect(listProjects(team.db, team.owner)).toEqual([]);
	});
});
