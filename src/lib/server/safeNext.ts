/**
 * Where to send a user after sign-in, limited to this site.
 *
 * A string check alone is not enough: browsers strip ASCII tab, CR and LF
 * while parsing a URL, so "/\t/evil.example" passes "the second character is
 * not a slash" and still lands on //evil.example. Control characters are
 * refused outright, then the URL parser decides the origin.
 */
const PROBE_ORIGIN = 'http://same-origin.invalid';
// C0 controls and DEL. Leading and trailing spaces are trimmed first.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** A same-origin path (with its query and hash), or `fallback`. */
export function safeNext(value: unknown, fallback = '/'): string {
	const v = String(value ?? '').trim();
	if (!v.startsWith('/') || CONTROL_CHARS.test(v)) return fallback;
	let url: URL;
	try {
		url = new URL(v, PROBE_ORIGIN);
	} catch {
		return fallback;
	}
	if (url.origin !== PROBE_ORIGIN) return fallback;
	return `${url.pathname}${url.search}${url.hash}`;
}
