<script lang="ts">
	import { Bug, CalendarDays, MessageSquare } from 'lucide-svelte';
	import { formatDueDate, isOverdue, type Issue, type Member } from '$lib/norn';
	import Avatar from './Avatar.svelte';
	import { intlLocale, t } from './t';

	interface Props {
		issue: Issue;
		assignee: Member | null;
		doneColumn: boolean;
		onopen: (issueId: string) => void;
	}

	let { issue, assignee, doneColumn, onopen }: Props = $props();
	// A card in a done column is not late, whatever its date says.
	const late = $derived(Boolean(issue.due_date) && !doneColumn && isOverdue(issue.due_date!));
</script>

<button
	type="button"
	class="w-full rounded-lg border border-default bg-primary p-3 text-left shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
	onclick={() => onopen(issue.id)}
>
	<span class="flex items-start gap-2">
		{#if issue.kind === 'bug'}
			<Bug class="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label={t('issue.bug')} />
		{/if}
		<span class="min-w-0 break-words text-sm font-medium text-primary">{issue.title}</span>
	</span>
	{#if issue.due_date || issue.comment_count > 0 || assignee}
		<span class="mt-2 flex items-center gap-3 text-xs text-tertiary">
			{#if issue.due_date}
				<span class="inline-flex items-center gap-1" class:text-danger={late}>
					<CalendarDays class="h-3.5 w-3.5" />
					{formatDueDate(issue.due_date, intlLocale())}
					{#if late}<span class="sr-only">{t('issue.overdue')}</span>{/if}
				</span>
			{/if}
			{#if issue.comment_count > 0}
				<span class="inline-flex items-center gap-1" aria-label={t('issue.comments', { count: issue.comment_count })}>
					<MessageSquare class="h-3.5 w-3.5" />
					{issue.comment_count}
				</span>
			{/if}
			<span class="ml-auto"><Avatar person={assignee} size={22} /></span>
		</span>
	{/if}
</button>
