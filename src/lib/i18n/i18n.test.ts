import { describe, expect, it } from 'vitest';
import { en, sv } from './app';
import { norn as nornEn } from './norn.en';
import { norn as nornSv } from './norn.sv';
import { pickLang, setLang, t, tn } from './index';

function keys(obj: object, prefix = ''): string[] {
	return Object.entries(obj).flatMap(([k, v]) =>
		typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
	);
}

describe('i18n', () => {
	it('has every key in both languages', () => {
		expect(keys(nornSv).sort()).toEqual(keys(nornEn).sort());
		expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort());
	});

	it('picks a language from the browser unless one is pinned', () => {
		expect(pickLang('sv-SE,sv;q=0.9,en;q=0.8')).toBe('sv');
		expect(pickLang('de-DE,de;q=0.9')).toBe('en');
		expect(pickLang('sv-SE', 'en')).toBe('en');
	});

	it('fills placeholders and plurals', () => {
		setLang('sv');
		expect(tn('projects.issues', 1)).toBe('1 uppgift');
		expect(t('board.count_of', { shown: 2, total: 5 })).toBe('2 av 5');
		setLang('en');
		expect(tn('projects.issues', 3)).toBe('3 tasks');
	});
});
