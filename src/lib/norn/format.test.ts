import { describe, expect, it } from 'vitest';
import { displayName, formatRelativeTime, initials, isOverdue } from './format';

describe('people', () => {
	it('prefers the name, falls back to the email', () => {
		expect(displayName({ name: '  Åsa Berg ', email: 'a@x.se' })).toBe('Åsa Berg');
		expect(displayName({ name: null, email: 'a@x.se' })).toBe('a@x.se');
		expect(displayName(null)).toBe('');
	});

	it('makes initials from two words or the first two letters', () => {
		expect(initials({ name: 'Åsa Berg', email: '' })).toBe('ÅB');
		expect(initials({ name: null, email: 'kim@example.com' })).toBe('KI');
	});
});

describe('dates', () => {
	const now = new Date('2026-11-16T12:00:00');

	it('is not overdue on the due day itself', () => {
		expect(isOverdue('2026-11-16', now)).toBe(false);
		expect(isOverdue('2026-11-15', now)).toBe(true);
	});

	it('says how long ago, in the given locale', () => {
		expect(formatRelativeTime('2026-11-16T11:59:50', 'en', now)).toBe('now');
		expect(formatRelativeTime('2026-11-16T11:55:00', 'en', now)).toBe('5 min. ago');
		expect(formatRelativeTime('2026-11-13T12:00:00', 'en', now)).toBe('3 days ago');
		expect(formatRelativeTime('2026-11-16T11:55:00', 'sv', now)).toContain('5 min');
	});
});
