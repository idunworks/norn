/**
 * Everything Norn reads from its environment, read in one place.
 * See config.example.env for every setting.
 */
import { dev } from '$app/env';

import {
	NORN_ALLOWED_EMAILS,
	NORN_ADMIN_EMAILS,
	ORIGIN,
	NORN_SMTP_URL,
	NORN_MAIL_FROM,
	NORN_MAIL_CONSOLE
} from '$app/env/private';

import { isAllowed, parseAllowlist, type Allowlist } from './auth';
import { createMailer, type Mailer } from './mailer';

function cachedList(read: () => string | undefined): () => Allowlist {
	let cache: { raw: string; list: Allowlist } | null = null;
	return () => {
		const raw = read() ?? '';
		if (cache?.raw !== raw) cache = { raw, list: parseAllowlist(raw) };
		return cache.list;
	};
}

/** NORN_ALLOWED_EMAILS: who may sign in at all. */
export const allowlist = cachedList(() => NORN_ALLOWED_EMAILS);
/** NORN_ADMIN_EMAILS: who creates projects and sees every board. Must also be allowed. */
export const adminlist = cachedList(() => NORN_ADMIN_EMAILS);

export function isAdmin(email: string): boolean {
	return isAllowed(allowlist(), email) && isAllowed(adminlist(), email);
}

/**
 * The address sign-in links point to. In production it must come from ORIGIN
 * (adapter-node's own setting), never from the request: otherwise anyone
 * could ask for a link with a forged Host header and have the email point at
 * their server. Null when it isn't set.
 */
export function publicOrigin(requestOrigin: string): string | null {
	const configured = ORIGIN?.trim();
	if (configured) return new URL(configured).origin;
	return dev ? requestOrigin : null;
}

let mailer: Mailer | null = null;

export function getMailer(): Mailer {
	if (!mailer) {
		mailer = createMailer({
			smtpUrl: NORN_SMTP_URL?.trim() || undefined,
			from: NORN_MAIL_FROM?.trim() || undefined,
			console: NORN_MAIL_CONSOLE === 'true' || dev && !NORN_SMTP_URL
		});
	}
	return mailer;
}
