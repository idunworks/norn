/** Display helpers for people and dates. Locale is passed in, never guessed. */
import type { Person } from './types';

export function displayName(person: Pick<Person, 'name' | 'email'> | null | undefined): string {
	if (!person) return '';
	return person.name?.trim() || person.email;
}

export function initials(person: Pick<Person, 'name' | 'email'>): string {
	const base = (person.name?.trim() || person.email || '?').trim();
	const parts = base.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return base.slice(0, 2).toUpperCase();
}

function localMidnight(isoDate: string): Date {
	return new Date(`${isoDate}T00:00:00`);
}

/** "1 Dec" / "1 dec." for a YYYY-MM-DD due date. */
export function formatDueDate(isoDate: string, locale: string): string {
	return localMidnight(isoDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/** Overdue means before today; a task due today is not overdue yet. */
export function isOverdue(isoDate: string, now: Date = new Date()): boolean {
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	return localMidnight(isoDate) < today;
}

export function formatDateTime(iso: string, locale: string): string {
	return new Date(iso).toLocaleString(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "now", "5 min ago", "3 days ago", then the full date after a week. */
export function formatRelativeTime(iso: string, locale: string, now: Date = new Date()): string {
	const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
	if (seconds >= WEEK) return formatDateTime(iso, locale);
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
	if (seconds < 45) return rtf.format(0, 'second');
	if (seconds < HOUR) return rtf.format(-Math.round(seconds / MINUTE), 'minute');
	if (seconds < DAY) return rtf.format(-Math.round(seconds / HOUR), 'hour');
	return rtf.format(-Math.round(seconds / DAY), 'day');
}
