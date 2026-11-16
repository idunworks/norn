/**
 * @mentions in comments. A token matches a person by email local part, by
 * first name, or by full name without spaces, case-insensitively. Unicode
 * letters count, so "@åsa" works.
 */
import type { Person } from './caller';

const TOKEN = /(?<![\p{L}\p{N}_@])@([\p{L}\p{N}_][\p{L}\p{N}_.-]*)/gu;

function fold(value: string): string {
	return value.normalize('NFC').toLocaleLowerCase();
}

function keys(person: Person): Set<string> {
	const out = new Set<string>();
	if (person.email) out.add(fold(person.email.split('@')[0]));
	const name = (person.name ?? '').trim();
	if (name) {
		const words = name.split(/\s+/);
		out.add(fold(words[0]));
		out.add(fold(words.join('')));
	}
	return out;
}

export function mentionedTokens(body: string): Set<string> {
	return new Set([...body.matchAll(TOKEN)].map((m) => fold(m[1].replace(/[.-]+$/, ''))));
}

/** Ids of the candidates mentioned in `body`, in candidate order, once each. */
export function parseMentions(body: string, candidates: readonly Person[]): string[] {
	const tokens = mentionedTokens(body);
	if (tokens.size === 0) return [];
	return candidates.filter((p) => [...keys(p)].some((k) => tokens.has(k))).map((p) => p.id);
}
