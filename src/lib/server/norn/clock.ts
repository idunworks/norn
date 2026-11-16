/**
 * Timestamps that never tie. Several rows written in the same millisecond
 * (a card and its "created" entry, two quick comments) must still sort in
 * the order they happened, or the timeline shuffles them. ISO strings with
 * microseconds, strictly increasing within the process.
 */
let last = 0;

export function stamp(nowMs: number = Date.now()): string {
	const micros = Math.max(nowMs * 1000, last + 1);
	last = micros;
	const whole = Math.floor(micros / 1000);
	const iso = new Date(whole).toISOString(); // 2026-11-16T12:00:00.123Z
	return `${iso.slice(0, 23)}${String(micros % 1000).padStart(3, '0')}Z`;
}
