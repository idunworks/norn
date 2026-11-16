/**
 * Request bodies, checked at the boundary. Limits match Norn's service
 * version: title 300, description 10 000, column 60, comment 10 000,
 * durations up to 999 h. Unknown fields are refused.
 */
import { z } from 'zod';
import { invalid } from './errors';

export const MAX_DURATION_MINUTES = 999 * 60;
export const MAX_COLUMNS = 50;

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
/** An empty or blank string becomes null. */
const blankIsNull = (max: number) =>
	z
		.string()
		.max(max)
		.nullable()
		.transform((v) => (v === null || v.trim() === '' ? null : v.trim()));
const uuid = z.string().uuid();
const minutes = z.number().int().min(0).max(MAX_DURATION_MINUTES).nullable();
const isoDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Not a date')
	.nullable();
const role = z.enum(['owner', 'member']);
const kind = z.enum(['task', 'bug']);

export const schemas = {
	projectCreate: z.strictObject({ name: trimmed(1, 120), description: blankIsNull(2000).optional() }),
	projectUpdate: z.strictObject({
		name: trimmed(1, 120).optional(),
		description: blankIsNull(2000).optional(),
		archived: z.boolean().optional()
	}),
	memberAdd: z.strictObject({ email: z.string().trim().toLowerCase().email().max(320), role: role.default('member') }),
	memberUpdate: z.strictObject({ role }),
	statusCreate: z.strictObject({ name: trimmed(1, 60) }),
	statusUpdate: z.strictObject({ name: trimmed(1, 60).optional(), is_done: z.boolean().optional() }),
	statusOrder: z.strictObject({ ordered_ids: z.array(uuid).min(1).max(MAX_COLUMNS) }),
	issueCreate: z.strictObject({ status_id: uuid, title: trimmed(1, 300), kind: kind.default('task') }),
	issueUpdate: z.strictObject({
		title: trimmed(1, 300).optional(),
		description: blankIsNull(10_000).optional(),
		assignee_id: uuid.nullable().optional(),
		due_date: isoDate.optional(),
		kind: kind.optional(),
		estimate_minutes: minutes.optional(),
		actual_minutes: minutes.optional()
	}),
	issueMove: z.strictObject({ to_status_id: uuid, ordered_ids: z.array(uuid).min(1).max(1000) }),
	commentCreate: z.strictObject({ body: trimmed(1, 10_000) }),
	markRead: z.strictObject({ ids: z.array(uuid).max(100).nullable().optional() }),
	account: z.strictObject({ name: z.string().max(80) })
} as const;

/** Parse `body` with `schema`, or throw a 422 naming the first bad field. */
export function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
	const result = schema.safeParse(body);
	if (result.success) return result.data;
	const issue = result.error.issues[0];
	const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
	throw invalid(`${where}${issue.message}`);
}

/** A UUID path parameter, or a 404 (a malformed id names nothing). */
export function pathId(value: string | undefined, what: string): string {
	if (!value || !uuid.safeParse(value).success) throw invalid(`${what} is not a valid id`);
	return value;
}
