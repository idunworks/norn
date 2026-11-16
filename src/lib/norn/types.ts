/**
 * Norn API shapes, the same in this app and in Norn's service version.
 * Dates are ISO strings as the API sends them.
 */

export type IssueKind = 'task' | 'bug';
export type MemberRole = 'owner' | 'member';

export interface Person {
	id: string;
	name: string | null;
	email: string;
}

export interface Member extends Person {
	role: MemberRole;
}

export interface Me extends Person {
	is_admin: boolean;
}

export interface Project {
	id: string;
	name: string;
	description: string | null;
	created_at: string;
	archived_at: string | null;
	issue_count: number;
	my_role: MemberRole | null;
	can_manage: boolean;
}

export interface Status {
	id: string;
	name: string;
	position: number;
	is_done: boolean;
}

export interface Issue {
	id: string;
	project_id: string;
	status_id: string;
	title: string;
	description: string | null;
	kind: IssueKind;
	assignee_id: string | null;
	due_date: string | null;
	position: number;
	estimate_minutes: number | null;
	actual_minutes: number | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
	comment_count: number;
}

export interface Board {
	project: Project;
	statuses: Status[];
	issues: Issue[];
	members: Member[];
}

export interface Comment {
	id: string;
	issue_id: string;
	author: Person | null;
	body: string;
	created_at: string;
}

export type ActivityKind =
	| 'created'
	| 'status_changed'
	| 'assigned'
	| 'renamed'
	| 'due_changed'
	| 'kind_changed'
	| 'estimate_changed'
	| 'actual_changed';

export interface Activity {
	id: string;
	actor: Person | null;
	kind: ActivityKind | string;
	data: Record<string, unknown>;
	created_at: string;
}

export type TimelineEntry =
	| { type: 'comment'; created_at: string; comment: Comment; activity?: null }
	| { type: 'activity'; created_at: string; activity: Activity; comment?: null };

export interface Notification {
	id: string;
	kind: 'assigned' | 'mention';
	actor: Person | null;
	project_id: string | null;
	issue_id: string | null;
	data: { issue_title?: string; project_name?: string; snippet?: string };
	read_at: string | null;
	created_at: string;
}

export interface Notifications {
	items: Notification[];
	unread: number;
}

export interface SearchHit {
	issue: Issue;
	project_name: string;
	status_name: string;
	assignee: Person | null;
}

/** Fields an issue update may carry; an explicit null clears one. */
export interface IssuePatch {
	title?: string;
	description?: string | null;
	assignee_id?: string | null;
	due_date?: string | null;
	kind?: IssueKind;
	estimate_minutes?: number | null;
	actual_minutes?: number | null;
}
