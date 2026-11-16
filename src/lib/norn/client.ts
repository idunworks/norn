/**
 * Norn API client. The NornApi interface is what the components depend on;
 * createNornApi talks to this app's own /api routes.
 */
import type {
	Board,
	Comment,
	Issue,
	IssueKind,
	IssuePatch,
	Me,
	Member,
	MemberRole,
	Notifications,
	Project,
	SearchHit,
	Status,
	TimelineEntry
} from './types';

export const NORN_API_BASE = '/api';

/** An API error that keeps the HTTP status, so pages can pick the right state. */
export class NornError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'NornError';
	}
}

export interface NornApi {
	me(): Promise<Me>;
	listProjects(): Promise<Project[]>;
	createProject(input: { name: string; description?: string | null }): Promise<Project>;
	updateProject(
		projectId: string,
		patch: { name?: string; description?: string | null; archived?: boolean }
	): Promise<Project>;
	board(projectId: string): Promise<Board>;

	addMember(projectId: string, input: { email: string; role: MemberRole }): Promise<Member>;
	setMemberRole(projectId: string, userId: string, role: MemberRole): Promise<Member>;
	removeMember(projectId: string, userId: string): Promise<void>;

	createStatus(projectId: string, name: string): Promise<Status>;
	updateStatus(projectId: string, statusId: string, patch: { name?: string; is_done?: boolean }): Promise<Status>;
	reorderStatuses(projectId: string, orderedIds: string[]): Promise<Status[]>;
	deleteStatus(projectId: string, statusId: string): Promise<void>;

	createIssue(projectId: string, input: { status_id: string; title: string; kind?: IssueKind }): Promise<Issue>;
	updateIssue(projectId: string, issueId: string, patch: IssuePatch): Promise<Issue>;
	moveIssue(projectId: string, issueId: string, toStatusId: string, orderedIds: string[]): Promise<Issue>;
	deleteIssue(projectId: string, issueId: string): Promise<void>;

	timeline(projectId: string, issueId: string): Promise<TimelineEntry[]>;
	addComment(projectId: string, issueId: string, body: string): Promise<Comment>;
	deleteComment(projectId: string, issueId: string, commentId: string): Promise<void>;

	notifications(): Promise<Notifications>;
	markRead(ids?: string[]): Promise<Notifications>;
	search(query: string): Promise<SearchHit[]>;
}

type Fetch = typeof fetch;

/** The message from the service's error envelope, else a generic one. */
async function errorMessage(res: Response): Promise<string> {
	const body: unknown = await res.json().catch(() => null);
	if (body && typeof body === 'object') {
		const envelope = (body as { error?: { message?: unknown } }).error;
		if (typeof envelope?.message === 'string') return envelope.message;
		const detail = (body as { detail?: unknown }).detail;
		if (typeof detail === 'string') return detail;
	}
	return `Request failed (${res.status})`;
}

export function createNornApi(fetchImpl: Fetch = fetch, base: string = NORN_API_BASE): NornApi {
	async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
		const res = await fetchImpl(`${base}${path}`, {
			method,
			credentials: 'include',
			headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		if (!res.ok) throw new NornError(res.status, await errorMessage(res));
		if (res.status === 204) return undefined as T;
		return (await res.json()) as T;
	}
	const p = (id: string) => `/projects/${encodeURIComponent(id)}`;
	const i = (pid: string, iid: string) => `${p(pid)}/issues/${encodeURIComponent(iid)}`;

	return {
		me: () => call('GET', '/me'),
		listProjects: () => call('GET', '/projects'),
		createProject: (input) => call('POST', '/projects', input),
		updateProject: (pid, patch) => call('PATCH', p(pid), patch),
		board: (pid) => call('GET', p(pid)),

		addMember: (pid, input) => call('POST', `${p(pid)}/members`, input),
		setMemberRole: (pid, uid, role) => call('PATCH', `${p(pid)}/members/${encodeURIComponent(uid)}`, { role }),
		removeMember: (pid, uid) => call('DELETE', `${p(pid)}/members/${encodeURIComponent(uid)}`),

		createStatus: (pid, name) => call('POST', `${p(pid)}/statuses`, { name }),
		updateStatus: (pid, sid, patch) => call('PATCH', `${p(pid)}/statuses/${encodeURIComponent(sid)}`, patch),
		reorderStatuses: (pid, orderedIds) => call('PUT', `${p(pid)}/statuses/order`, { ordered_ids: orderedIds }),
		deleteStatus: (pid, sid) => call('DELETE', `${p(pid)}/statuses/${encodeURIComponent(sid)}`),

		createIssue: (pid, input) => call('POST', `${p(pid)}/issues`, input),
		updateIssue: (pid, iid, patch) => call('PATCH', i(pid, iid), patch),
		moveIssue: (pid, iid, toStatusId, orderedIds) =>
			call('POST', `${i(pid, iid)}/move`, { to_status_id: toStatusId, ordered_ids: orderedIds }),
		deleteIssue: (pid, iid) => call('DELETE', i(pid, iid)),

		timeline: (pid, iid) => call('GET', `${i(pid, iid)}/timeline`),
		addComment: (pid, iid, body) => call('POST', `${i(pid, iid)}/comments`, { body }),
		deleteComment: (pid, iid, cid) => call('DELETE', `${i(pid, iid)}/comments/${encodeURIComponent(cid)}`),

		notifications: () => call('GET', '/notifications'),
		markRead: (ids) => call('POST', '/notifications/read', ids ? { ids } : {}),
		search: (query) => call('GET', `/search?q=${encodeURIComponent(query)}`)
	};
}
