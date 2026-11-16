/** One line of issue history, in the reader's language. */
import { formatDueDate, formatDuration, type Activity } from '#lib/norn/index.ts';
import { intlLocale, t } from './t';

function minutes(value: unknown): string | null {
	return typeof value === 'number' ? formatDuration(value) : null;
}

export function describeActivity(activity: Pick<Activity, 'kind' | 'data'>): string {
	const to = activity.data?.to;
	switch (activity.kind) {
		case 'created':
			return t('timeline.created');
		case 'status_changed':
			return t('timeline.status_changed', { to: String(to ?? '') });
		case 'assigned':
			return to ? t('timeline.assigned', { to: String(to) }) : t('timeline.unassigned');
		case 'renamed':
			return t('timeline.renamed', { to: String(to ?? '') });
		case 'due_changed':
			return typeof to === 'string'
				? t('timeline.due_set', { to: formatDueDate(to, intlLocale()) })
				: t('timeline.due_cleared');
		case 'kind_changed':
			return to === 'bug' ? t('timeline.kind_bug') : t('timeline.kind_task');
		case 'estimate_changed': {
			const time = minutes(to);
			return time ? t('timeline.estimate_set', { to: time }) : t('timeline.estimate_cleared');
		}
		case 'actual_changed': {
			const time = minutes(to);
			return time ? t('timeline.actual_set', { to: time }) : t('timeline.actual_cleared');
		}
		default:
			return t('timeline.updated');
	}
}
