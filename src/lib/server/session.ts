/**
 * The session cookie.
 *
 * Over HTTPS it is named __Host-norn_session: browsers accept that prefix only
 * on a Secure cookie for the whole site with no Domain, so nothing on a
 * sibling subdomain can set or overwrite it. Plain-HTTP localhost gets the
 * bare name, since a Secure cookie wouldn't stick there.
 *
 * SameSite=Lax, not Strict: a sign-in link and a notification link opened
 * from an email or chat must arrive signed in. State-changing requests are
 * checked for their origin in hooks.server.ts.
 */
import type { Cookies } from '@sveltejs/kit';

function cookieName(url: URL): string {
	return url.protocol === 'https:' ? '__Host-norn_session' : 'norn_session';
}

export function readSessionCookie(cookies: Cookies, url: URL): string | undefined {
	return cookies.get(cookieName(url));
}

export function setSessionCookie(cookies: Cookies, url: URL, id: string, expiresAt: number): void {
	cookies.set(cookieName(url), id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		expires: new Date(expiresAt)
	});
}

export function clearSessionCookie(cookies: Cookies, url: URL): void {
	cookies.delete(cookieName(url), { path: '/', secure: url.protocol === 'https:' });
}
