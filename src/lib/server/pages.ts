/** Helpers for page loads: who is signed in, and rule errors as page errors. */
import { error, redirect } from '@sveltejs/kit';
import type { Caller } from './norn/caller';
import { NornError } from './norn/errors';

export function requireSignedIn({ locals, url }: { locals: App.Locals; url: URL }): Caller {
	if (!locals.caller) redirect(303, `/auth?next=${encodeURIComponent(url.pathname + url.search)}`);
	return locals.caller;
}

/** Run a rule for a page; a broken rule becomes the page's error (404 stays 404). */
export function forPage<T>(run: () => T): T {
	try {
		return run();
	} catch (err) {
		if (err instanceof NornError) error(err.status, err.message);
		throw err;
	}
}
