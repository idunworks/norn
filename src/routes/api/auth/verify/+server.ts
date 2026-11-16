import type { RequestHandler } from './$types';
import { allow } from '$lib/server/rateLimit';
import { VERIFY_BUDGET, createSession, isAllowed, spendLoginToken } from '$lib/server/auth';
import { allowlist } from '$lib/server/config';
import { handle, noStore, problem, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { ensureUser } from '$lib/server/norn/users';
import { setSessionCookie } from '$lib/server/session';

/** Spend a sign-in link's token and start a session. Only the page's button calls this. */
export const POST: RequestHandler = (event) =>
	handle(async () => {
		const db = getDb();
		const now = Date.now();
		if (!allow(db, `verify:${event.getClientAddress()}`, VERIFY_BUDGET, now)) {
			return problem(429, 'Too many attempts. Wait a few minutes.');
		}
		const body = (await readJson(event.request)) as { token?: unknown } | null;
		const spent = spendLoginToken(db, body?.token, now);
		// The allowlist is checked again: an address taken off it since the email went out gets nothing.
		if (!spent || !isAllowed(allowlist(), spent.email)) {
			return problem(400, 'This link has already been used or has expired.');
		}
		ensureUser(db, spent.email);
		const session = createSession(db, spent.email, now);
		setSessionCookie(event.cookies, event.url, session.id, session.expiresAt);
		return noStore({ next: spent.next });
	});
