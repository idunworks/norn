<script lang="ts">
	import { displayName, NO_FILTER, type BoardFilter, type Member } from '#lib/norn/index.ts';
	import { t } from './t';

	interface Props {
		filter: BoardFilter;
		members: Member[];
		shown: number;
		total: number;
		onchange: (filter: BoardFilter) => void;
	}

	let { filter, members, shown, total, onchange }: Props = $props();
	const active = $derived(filter.assignee !== 'all' || filter.kind !== 'all');
	const kinds: { value: BoardFilter['kind']; label: string }[] = [
		{ value: 'all', label: t('filters.all') },
		{ value: 'task', label: t('filters.tasks') },
		{ value: 'bug', label: t('filters.bugs') }
	];
</script>

<div class="flex flex-wrap items-center gap-3 text-sm">
	<label class="flex items-center gap-2">
		<span class="text-secondary">{t('filters.assignee')}</span>
		<select
			class="rounded-md border border-default bg-primary px-2 py-1 text-primary"
			value={filter.assignee}
			onchange={(e) => onchange({ ...filter, assignee: e.currentTarget.value })}
		>
			<option value="all">{t('filters.everyone')}</option>
			<option value="none">{t('filters.unassigned')}</option>
			{#each members as member (member.id)}
				<option value={member.id}>{displayName(member)}</option>
			{/each}
		</select>
	</label>
	<div class="inline-flex overflow-hidden rounded-md border border-default" role="group">
		{#each kinds as kind (kind.value)}
			<button
				type="button"
				class="px-3 py-1 {filter.kind === kind.value ? 'bg-theme-primary text-white' : 'bg-primary text-secondary'}"
				aria-pressed={filter.kind === kind.value}
				onclick={() => onchange({ ...filter, kind: kind.value })}
			>
				{kind.label}
			</button>
		{/each}
	</div>
	{#if active}
		<span class="text-tertiary">{t('board.count_of', { shown, total })}</span>
		<button type="button" class="text-secondary underline" onclick={() => onchange(NO_FILTER)}>
			{t('filters.clear')}
		</button>
	{/if}
</div>
