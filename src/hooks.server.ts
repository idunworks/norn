import type { Handle } from '@sveltejs/kit/hooks';
import { NORN_LANG } from '$app/env/private';
import { pickLang } from '#lib/i18n/index.ts';
import { sessionEmail } from '#lib/server/auth.ts';
import { adminlist, allowlist } from '#lib/server/config.ts';
import { getDb } from '#lib/server/instance.ts';
import { callerFor } from '#lib/server/norn/session-caller.ts';
import { readSessionCookie } from '#lib/server/session.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const handle: Handle = async ({ event, resolve }) => {
	const db = getDb();
	const email = sessionEmail(db, readSessionCookie(event.cookies, event.url), Date.now());
	event.locals.caller = callerFor(db, email, allowlist(), adminlist());
	event.locals.lang = pickLang(event.request.headers.get('accept-language'), NORN_LANG);

	// Kit checks the origin of form posts. The API takes JSON, so check it here too:
	// a state-changing request must come from this site's own pages.
	if (!SAFE_METHODS.has(event.request.method)) {
		const origin = event.request.headers.get('origin');
		if (origin !== event.url.origin) {
			return new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Cross-site request refused.' } }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%norn.lang%', event.locals.lang)
	});

	response.headers.set('Referrer-Policy', 'no-referrer');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
	// Boards are private to their members: no shared cache keeps a copy.
	if (!event.url.pathname.startsWith('/_app/')) response.headers.set('Cache-Control', 'private, no-store');
	return response;
};
