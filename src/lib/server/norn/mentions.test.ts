import { describe, expect, it } from 'vitest';
import type { Person } from './caller';
import { mentionedTokens, parseMentions } from './mentions';

const asa: Person = { id: 'a', email: 'asa.berg@example.com', name: 'Åsa Berg' };
const olle: Person = { id: 'o', email: 'olle@example.com', name: 'Olle Nilsson' };
const kim: Person = { id: 'k', email: 'kim@example.com', name: null };
const people = [asa, olle, kim];

describe('parseMentions', () => {
	it('matches a first name with non-ASCII letters', () => {
		expect(parseMentions('Hej @åsa, kan du titta?', people)).toEqual(['a']);
	});
	it('matches the email local part and the full name without spaces', () => {
		expect(parseMentions('@asa.berg and @OlleNilsson', people)).toEqual(['a', 'o']);
	});
	it('matches someone without a name by email', () => {
		expect(parseMentions('ping @kim', people)).toEqual(['k']);
	});
	it('names each person once, in candidate order', () => {
		expect(parseMentions('@olle @åsa @olle', people)).toEqual(['a', 'o']);
	});
	it('does not treat an email address in the text as a mention', () => {
		expect(parseMentions('mail olle@example.com', people)).toEqual([]);
	});
	it('drops trailing punctuation', () => {
		expect(mentionedTokens('thanks @olle.')).toEqual(new Set(['olle']));
	});
	it('matches nobody for an unknown name', () => {
		expect(parseMentions('@nobody here', people)).toEqual([]);
	});
});
