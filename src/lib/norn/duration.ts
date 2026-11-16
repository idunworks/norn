/**
 * Time estimates and actuals. Stored as whole minutes, typed and shown in a
 * forgiving hours-and-minutes notation (English and Swedish units). Pure, so
 * it runs in the browser and in tests.
 */

/** Upper bound for one estimate or actual: 999 h. The API enforces it too. */
export const MAX_DURATION_MINUTES = 999 * 60;

export type ParsedDuration = { ok: true; minutes: number | null } | { ok: false };

const BARE_HOURS = /^\d+(?:\.\d+)?$/;
const HOURS_MINUTES =
	/^(?:(\d+(?:\.\d+)?)\s*(?:timmar|timme|tim|hours|hour|h|t))?\s*(?:(\d+)\s*(?:minuter|min|m)?)?$/;

/**
 * Parse input into minutes; empty input clears the value (null). Accepts
 * "2" or "1,5" (hours), "45m", "45 min", "2h", "2h 30m", "2 tim 30 min".
 * Anything else, or more than MAX_DURATION_MINUTES, is { ok: false }.
 */
export function parseDuration(input: string): ParsedDuration {
	const text = input.trim().toLowerCase().replace(',', '.');
	if (text === '') return { ok: true, minutes: null };

	let minutes: number;
	if (BARE_HOURS.test(text)) {
		minutes = Math.round(Number(text) * 60);
	} else {
		const match = HOURS_MINUTES.exec(text);
		if (!match || (match[1] === undefined && match[2] === undefined)) return { ok: false };
		const hours = match[1] === undefined ? 0 : Number(match[1]);
		const mins = match[2] === undefined ? 0 : Number(match[2]);
		minutes = Math.round(hours * 60 + mins);
	}
	if (!Number.isFinite(minutes) || minutes > MAX_DURATION_MINUTES) return { ok: false };
	return { ok: true, minutes };
}

/** "45 min", "2 h", "2 h 30 min". Round-trips through parseDuration. */
export function formatDuration(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h === 0) return `${m} min`;
	if (m === 0) return `${h} h`;
	return `${h} h ${m} min`;
}

export type EstimateDelta = { direction: 'on' } | { direction: 'over' | 'under'; minutes: number };

/** How the actual time compares to the estimate, or null if either is missing. */
export function estimateDelta(estimate: number | null, actual: number | null): EstimateDelta | null {
	if (estimate === null || actual === null) return null;
	const diff = actual - estimate;
	if (diff === 0) return { direction: 'on' };
	return { direction: diff > 0 ? 'over' : 'under', minutes: Math.abs(diff) };
}
