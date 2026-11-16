<script lang="ts">
	import { Bug, CalendarDays } from 'lucide-svelte';
	import { formatDueDate } from '$lib/norn';
	import Avatar from '$lib/components/norn/Avatar.svelte';
	import { intlLocale, t, tn } from '$lib/components/norn/t';

	let { data } = $props();
	const locale = intlLocale();
</script>

<svelte:head><title>{t('search.heading')} · {t('title')}</title></svelte:head>

<h1 class="mb-4 text-2xl font-bold text-primary">{t('search.heading')}</h1>
{#if data.q}
	<p class="mb-4 text-sm text-secondary">
		{data.hits.length ? tn('search.results', data.hits.length, { q: data.q }) : t('search.none', { q: data.q })}
	</p>
{/if}
<ul class="space-y-3">
	{#each data.hits as hit (hit.issue.id)}
		<li>
			<a
				href="/p/{hit.issue.project_id}?issue={hit.issue.id}"
				class="block rounded-xl border border-default bg-secondary p-4 transition hover:shadow-md"
			>
				<p class="text-xs text-tertiary">{hit.project_name} · {hit.status_name}</p>
				<p class="mt-1 flex items-center gap-2 font-medium text-primary">
					{#if hit.issue.kind === 'bug'}<Bug class="h-4 w-4 text-danger" aria-label={t('issue.bug')} />{/if}
					{hit.issue.title}
				</p>
				{#if hit.issue.description}
					<p class="mt-1 line-clamp-2 text-sm text-secondary">{hit.issue.description}</p>
				{/if}
				<p class="mt-2 flex items-center gap-3 text-xs text-tertiary">
					{#if hit.issue.due_date}
						<span class="inline-flex items-center gap-1"><CalendarDays class="h-3.5 w-3.5" />{formatDueDate(hit.issue.due_date, locale)}</span>
					{/if}
					<span class="ml-auto"><Avatar person={hit.assignee} size={22} /></span>
				</p>
			</a>
		</li>
	{/each}
</ul>
