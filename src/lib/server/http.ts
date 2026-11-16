/**
 * Small helpers shared by the API routes. Every error answers
 * `{ "error": { "code", "message" } }`; nothing internal leaks into it.
 */
import type { RequestEvent } from '@sveltejs/kit';
import { SqliteError } from 'better-sqlite3';
import type { Caller } from './norn/caller';
import { NornError } from './norn/errors';

/** Comments and descriptions top out at 10 000 characters; this leaves room for JSON. */
const MAX_BODY_BYTES = 64 * 1024;

export function problem(status: number, message: string): Response {
	const code = new NornError(status, message).code;
	return Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function noStore(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Run a handler; a broken rule becomes its status, a constraint race a 409, anything else a bare 500. */
export async function handle(run: () => Promise<Response> | Response): Promise<Response> {
	try {
		return await run();
	} catch (err) {
		if (err instanceof NornError) return problem(err.status, err.message);
		// Two requests racing (a card added to a column being deleted): the database refused one.
		if (err instanceof SqliteError && err.code.startsWith('SQLITE_CONSTRAINT')) {
			return problem(409, 'Someone else changed this at the same time. Reload and try again.');
		}
		console.error('norn: unexpected error', err);
		return problem(500, 'Something went wrong.');
	}
}

/** Read a JSON body, refusing anything else or anything too big. */
export async function readJson(request: Request): Promise<unknown> {
	const type = request.headers.get('content-type') ?? '';
	if (!type.toLowerCase().startsWith('application/json')) throw new NornError(415, 'Send JSON.');
	const declared = Number(request.headers.get('content-length') ?? 0);
	if (declared > MAX_BODY_BYTES) throw new NornError(413, 'Request too large.');
	const text = await request.text();
	if (text.length > MAX_BODY_BYTES) throw new NornError(413, 'Request too large.');
	try {
		return JSON.parse(text);
	} catch {
		throw new NornError(400, 'Invalid JSON.');
	}
}

/** The signed-in caller, or a 401. */
export function callerOf(event: Pick<RequestEvent, 'locals'>): Caller {
	if (!event.locals.caller) throw new NornError(401, 'Not authenticated');
	return event.locals.caller;
}

/** An API handler: signed in, errors in the envelope, JSON answer (204 for undefined). */
export function api<E extends RequestEvent>(
	run: (caller: Caller, event: E) => unknown | Promise<unknown>,
	status = 200
): (event: E) => Promise<Response> {
	return (event) =>
		handle(async () => {
			const result = await run(callerOf(event), event);
			return result === undefined ? new Response(null, { status: 204 }) : noStore(result, status);
		});
}
