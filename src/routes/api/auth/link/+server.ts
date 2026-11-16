import type { RequestHandler } from './$types';
import { allow } from '#lib/server/rateLimit.ts';
import { LINK_REQUEST_BUDGET, MAILS_PER_ADDRESS_BUDGET, createLoginToken, isAllowed, normalizeEmail } from '#lib/server/auth.ts';
import { allowlist, getMailer, publicOrigin } from '#lib/server/config.ts';
import { handle, noStore, problem, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { maskEmail } from '#lib/server/mailer.ts';
import { safeNext } from '#lib/server/safeNext.ts';
import { app, fill, type Lang } from '#lib/i18n/index.ts';

/** Every accepted request gets this, whether or not the address may sign in. */
const SAME_ANSWER = { detail: 'If this address may sign in, a link is on its way.' };

/**
 * Ask for a sign-in link. The answer never depends on the allowlist, and the
 * email goes out after the response, so its timing tells nothing either.
 */
export const POST: RequestHandler = (event) =>
	handle(async () => {
		const db = getDb();
		const now = Date.now();
		if (!allow(db, `signin:${event.getClientAddress()}`, LINK_REQUEST_BUDGET, now)) {
			return problem(429, 'Too many attempts. Wait a few minutes.');
		}
		const body = (await readJson(event.request)) as { email?: unknown; next?: unknown } | null;
		const email = normalizeEmail(body?.email);
		if (!email) return problem(400, 'Enter a valid email address.');

		if (isAllowed(allowlist(), email) && allow(db, `mailto:${email}`, MAILS_PER_ADDRESS_BUDGET, now)) {
			const origin = publicOrigin(event.url.origin);
			if (!origin) {
				console.error('norn: set ORIGIN to this site’s public address, or sign-in links cannot be sent.');
			} else {
				const token = createLoginToken(db, email, safeNext(body?.next, '/'), now);
				if (token) void sendLink(email, `${origin}/auth#token=${token}`, event.locals.lang);
			}
		}
		return noStore(SAME_ANSWER, 202);
	});

async function sendLink(email: string, link: string, lang: Lang): Promise<void> {
	const t = app(lang);
	try {
		await getMailer().send({ to: email, subject: t.mailSubject, text: fill(t.mailBody, { link }) });
	} catch (err) {
		console.error(`norn: sign-in email to ${maskEmail(email)} failed`, err);
	}
}
