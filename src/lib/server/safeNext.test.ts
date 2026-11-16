import { describe, expect, it } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
	it.each([
		['/', '/'],
		['/p/abc?x=1', '/p/abc?x=1'],
		['/p#top', '/p#top'],
		['  /padded  ', '/padded'],
		['/a/../b', '/b']
	])('keeps the same-site path %j', (value, expected) => {
		expect(safeNext(value, '/home')).toBe(expected);
	});

	it.each([
		'//evil.example',
		'/\\evil.example',
		'/\\/evil.example',
		'https://evil.example',
		'javascript:alert(1)',
		'',
		// Browsers strip tab, CR and LF while parsing: these all become //evil.example.
		'/\t/evil.example',
		'/\n/evil.example',
		'/\r/evil.example',
		'/\u0000/evil.example',
		'/\u007f/evil.example'
	])('falls back for %j', (value) => {
		expect(safeNext(value, '/home')).toBe('/home');
	});

	it('falls back for ?next=/%09/evil.example once the query is decoded', () => {
		const next = new URL('https://site.example/auth?next=/%09/evil.example').searchParams.get('next');
		expect(safeNext(next, '/home')).toBe('/home');
	});

	it('keeps an encoded slash as a harmless path, never a host', () => {
		const out = safeNext('/%2F%2Fevil.example', '/home');
		expect(new URL(out, 'https://site.example').host).toBe('site.example');
	});

	it('defaults to /, and ignores what is not a string', () => {
		expect(safeNext(null)).toBe('/');
		expect(safeNext({ toString: () => '//evil.example' })).toBe('/');
	});
});
