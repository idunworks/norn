import { describe, expect, it } from 'vitest';
import { stamp } from './clock';

describe('stamp', () => {
	it('is strictly increasing within one millisecond and parses as a date', () => {
		const a = stamp(1_700_000_000_000);
		const b = stamp(1_700_000_000_000);
		expect(a < b).toBe(true);
		expect(a).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
		expect(new Date(b).getTime()).toBe(1_700_000_000_000);
	});
});
