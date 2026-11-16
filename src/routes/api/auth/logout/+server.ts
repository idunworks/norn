import type { RequestHandler } from './$types';
import { endSession } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/instance.ts';
import { clearSessionCookie, readSessionCookie } from '#lib/server/session.ts';

/** End this browser's session, on the server as well as in the cookie. */
export const POST: RequestHandler = ({ cookies, url }) => {
	endSession(getDb(), readSessionCookie(cookies, url));
	clearSessionCookie(cookies, url);
	return new Response(null, { status: 204 });
};
