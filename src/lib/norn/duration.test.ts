import { describe, expect, it } from 'vitest';
import { MAX_DURATION_MINUTES, estimateDelta, formatDuration, parseDuration } from './duration';

// The table is the original tool's, kept so the parser behaves exactly the same.
describe('parseDuration', () => {
	it.each([
		['', null],
		['   ', null],
		['2', 120],
		['1,5', 90],
		['1.5', 90],
		['0', 0],
		['45m', 45],
		['45 min', 45],
		['2h', 120],
		['2 H', 120],
		['2h 30m', 150],
		['2h30', 150],
		['2 h 30 min', 150],
		['2 tim 30 min', 150],
		['1,5h', 90]
	])('parses %j as %j minutes', (input, minutes) => {
		expect(parseDuration(input)).toEqual({ ok: true, minutes });
	});

	it.each(['abc', '2x', '-1', 'h', '2h 30m 10s', '1:30'])('rejects %j', (input) => {
		expect(parseDuration(input)).toEqual({ ok: false });
	});

	it('rejects values above the cap', () => {
		expect(parseDuration('1000h')).toEqual({ ok: false });
		expect(parseDuration('999h')).toEqual({ ok: true, minutes: MAX_DURATION_MINUTES });
	});
});

describe('formatDuration', () => {
	it.each([
		[0, '0 min'],
		[45, '45 min'],
		[120, '2 h'],
		[150, '2 h 30 min']
	])('formats %j as %j', (minutes, text) => {
		expect(formatDuration(minutes)).toBe(text);
	});

	it('round-trips through parseDuration', () => {
		for (const minutes of [0, 5, 59, 60, 61, 150, MAX_DURATION_MINUTES]) {
			expect(parseDuration(formatDuration(minutes))).toEqual({ ok: true, minutes });
		}
	});
});

describe('estimateDelta', () => {
	it('is null when either side is missing', () => {
		expect(estimateDelta(null, 30)).toBeNull();
		expect(estimateDelta(30, null)).toBeNull();
	});

	it('reports over, under and on estimate', () => {
		expect(estimateDelta(60, 90)).toEqual({ direction: 'over', minutes: 30 });
		expect(estimateDelta(90, 60)).toEqual({ direction: 'under', minutes: 30 });
		expect(estimateDelta(60, 60)).toEqual({ direction: 'on' });
	});
});
