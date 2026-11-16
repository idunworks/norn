/**
 * English and Swedish. The server picks the language per request
 * (Accept-Language, or NORN_LANG for everyone); the root layout hands it to
 * the page, which sets it here before any component renders.
 */
import { en as appEn, sv as appSv } from './app';
import { norn as nornEn } from './norn.en';
import { norn as nornSv } from './norn.sv';

export type Lang = 'en' | 'sv';
export const LANGS: readonly Lang[] = ['en', 'sv'];

export function isLang(value: unknown): value is Lang {
	return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/** The best language for an Accept-Language header, unless one is pinned. */
export function pickLang(acceptLanguage: string | null, pinned?: string): Lang {
	if (isLang(pinned)) return pinned;
	const wanted = (acceptLanguage ?? '')
		.split(',')
		.map((part) => {
			const [tag, ...params] = part.trim().toLowerCase().split(';');
			const q = params.find((p) => p.trim().startsWith('q='));
			return { base: tag.split('-')[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
		})
		.filter((w) => w.base && w.q > 0)
		.sort((a, b) => b.q - a.q);
	return wanted.map((w) => w.base).find(isLang) ?? 'en';
}

/** Fill `{name}` placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function app(lang: Lang): typeof appEn {
	return lang === 'sv' ? appSv : appEn;
}

let current: Lang = 'en';

/** Set the page's language. SSR renders synchronously, so one request at a time sees it. */
export function setLang(lang: Lang): void {
	current = lang;
}

export function getLang(): Lang {
	return current;
}

function lookup(dict: unknown, key: string): string | undefined {
	let node = dict;
	for (const part of key.split('.')) {
		if (!node || typeof node !== 'object') return undefined;
		node = (node as Record<string, unknown>)[part];
	}
	return typeof node === 'string' ? node : undefined;
}

/** Board copy by key (`issue.title`), English when Swedish lacks it. */
export function t(key: string, vars?: Record<string, string | number>): string {
	const text = lookup(current === 'sv' ? nornSv : nornEn, key) ?? lookup(nornEn, key) ?? key;
	return vars ? fill(text, vars) : text;
}

/** `{base}_one` or `{base}_other` by count. */
export function tn(base: string, count: number, vars: Record<string, string | number> = {}): string {
	return t(`${base}_${count === 1 ? 'one' : 'other'}`, { count, ...vars });
}

/** The page language as a BCP 47 tag for Intl formatting. */
export function intlLocale(): string {
	return current;
}
