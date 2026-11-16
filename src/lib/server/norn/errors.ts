/**
 * A broken rule with its HTTP status. The API answers every one as
 * `{ "error": { "code", "message" } }`, the same envelope as Norn's
 * service version, so one client works against both.
 */
export type ErrorCode =
	| 'UNAUTHENTICATED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'VALIDATION'
	| 'CONFLICT'
	| 'RATE_LIMITED'
	| 'INTERNAL';

const CODE_FOR_STATUS: Record<number, ErrorCode> = {
	400: 'VALIDATION',
	401: 'UNAUTHENTICATED',
	403: 'FORBIDDEN',
	404: 'NOT_FOUND',
	409: 'CONFLICT',
	413: 'VALIDATION',
	415: 'VALIDATION',
	422: 'VALIDATION',
	429: 'RATE_LIMITED'
};

export class NornError extends Error {
	readonly code: ErrorCode;
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'NornError';
		this.code = CODE_FOR_STATUS[status] ?? 'INTERNAL';
	}
}

export const notFound = (what: string) => new NornError(404, `${what} not found`);
export const forbidden = (message: string) => new NornError(403, message);
export const conflict = (message: string) => new NornError(409, message);
export const invalid = (message: string) => new NornError(422, message);
