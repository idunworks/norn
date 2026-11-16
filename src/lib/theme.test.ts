/**
 * Every text colour the components use must reach WCAG AA (4.5:1) on the
 * surfaces it sits on, in light and in dark. Reads the values from app.css.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

function block(pattern: RegExp): Record<string, string> {
	const body = pattern.exec(css)?.[1] ?? '';
	return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

const theme = block(/@theme\s*{([^}]*)}/);
const light = { ...theme, ...block(/:root\s*{([^}]*)}/) };
const dark = { ...light, ...block(/prefers-color-scheme:\s*dark\)\s*{\s*:root\s*{([^}]*)}/) };

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const WHITE = '#ffffff';
const AA = 4.5;

describe.each([
	['light', light],
	['dark', dark]
])('%s theme', (_, t) => {
	const surfaces = [t['surface-1'], t['surface-2']];
	it.each(['ink-1', 'ink-2', 'ink-3', 'color-danger'])('%s is readable on both surfaces', (ink) => {
		for (const surface of surfaces) expect(contrast(t[ink], surface)).toBeGreaterThanOrEqual(AA);
	});
	it('white text is readable on the accent', () => {
		expect(contrast(WHITE, t['color-theme-primary'])).toBeGreaterThanOrEqual(AA);
	});
	it('the badge text is readable on danger', () => {
		expect(contrast(t['on-danger'], t['color-danger'])).toBeGreaterThanOrEqual(AA);
	});
});
