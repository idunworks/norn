<script lang="ts">
	import { flip } from 'svelte/animate';
	import { MoreHorizontal, Plus } from 'lucide-svelte';
	import { dndzone, type DndEvent, type Issue, type Member, type Status } from '#lib/norn/index.ts';
	import IssueCard from './IssueCard.svelte';
	import { t } from './t';

	const FLIP_MS = 150;

	interface Props {
		status: Status;
		cards: Issue[];
		members: Member[];
		canManage: boolean;
		dragDisabled: boolean;
		isFirst: boolean;
		isLast: boolean;
		deletable: { ok: true } | { ok: false; reason: string };
		onconsider: (statusId: string, items: Issue[]) => void;
		onfinalize: (statusId: string, items: Issue[], droppedId: string | null) => void;
		onopen: (issueId: string) => void;
		oncreate: (statusId: string, title: string) => Promise<void>;
		onrename: (statusId: string, name: string) => void;
		onshift: (statusId: string, step: -1 | 1) => void;
		ontoggledone: (statusId: string) => void;
		ondelete: (statusId: string) => void;
	}

	let {
		status,
		cards,
		members,
		canManage,
		dragDisabled,
		isFirst,
		isLast,
		deletable,
		onconsider,
		onfinalize,
		onopen,
		oncreate,
		onrename,
		onshift,
		ontoggledone,
		ondelete
	}: Props = $props();

	let menuOpen = $state(false);
	let renaming = $state(false);
	let nameDraft = $state('');
	let composing = $state(false);
	let titleDraft = $state('');
	let saving = $state(false);

	const byId = $derived(new Map(members.map((m) => [m.id, m])));

	function startRename() {
		menuOpen = false;
		nameDraft = status.name;
		renaming = true;
	}

	function commitRename() {
		const name = nameDraft.trim();
		renaming = false;
		if (name && name !== status.name) onrename(status.id, name);
	}

	function renameKey(event: KeyboardEvent) {
		if (event.key === 'Enter') commitRename();
		if (event.key === 'Escape') renaming = false;
	}

	async function submitCard() {
		const title = titleDraft.trim();
		if (!title || saving) return;
		saving = true;
		try {
			await oncreate(status.id, title);
			titleDraft = '';
		} finally {
			saving = false;
		}
	}

	function composerKey(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submitCard();
		}
		if (event.key === 'Escape') composing = false;
	}

	function act(action: () => void) {
		menuOpen = false;
		action();
	}

	function consider(event: CustomEvent<DndEvent<Issue>>) {
		onconsider(status.id, event.detail.items);
	}

	function finalize(event: CustomEvent<DndEvent<Issue>>) {
		const dropped = event.detail.info.trigger === 'droppedIntoZone' ? String(event.detail.info.id) : null;
		onfinalize(status.id, event.detail.items, dropped);
	}
</script>

<section class="flex w-72 shrink-0 flex-col rounded-xl border border-default bg-secondary" aria-label={status.name}>
	<header class="flex items-center gap-2 px-3 pt-3">
		<span
			class="h-2.5 w-2.5 shrink-0 rounded-full border-2 {status.is_done ? 'border-success bg-success' : 'border-default'}"
			aria-hidden="true"
		></span>
		{#if renaming}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="min-w-0 flex-1 rounded border border-default bg-primary px-1 text-sm font-semibold text-primary"
				maxlength="60"
				bind:value={nameDraft}
				onkeydown={renameKey}
				onblur={commitRename}
				autofocus
			/>
		{:else}
			<h2 class="min-w-0 flex-1 truncate text-sm font-semibold text-primary">{status.name}</h2>
		{/if}
		<span class="text-xs text-tertiary">{cards.length}</span>
		{#if canManage}
			<div class="relative">
				<button
					type="button"
					class="rounded p-1 text-tertiary hover:text-primary"
					aria-label={t('column.menu')}
					aria-expanded={menuOpen}
					onclick={() => (menuOpen = !menuOpen)}
				>
					<MoreHorizontal class="h-4 w-4" />
				</button>
				{#if menuOpen}
					<ul class="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-default bg-primary py-1 text-sm shadow-lg">
						<li><button class="w-full px-3 py-1.5 text-left hover:bg-secondary" onclick={startRename}>{t('column.rename')}</button></li>
						<li>
							<button class="w-full px-3 py-1.5 text-left hover:bg-secondary disabled:opacity-40" disabled={isFirst} onclick={() => act(() => onshift(status.id, -1))}>
								{t('column.move_left')}
							</button>
						</li>
						<li>
							<button class="w-full px-3 py-1.5 text-left hover:bg-secondary disabled:opacity-40" disabled={isLast} onclick={() => act(() => onshift(status.id, 1))}>
								{t('column.move_right')}
							</button>
						</li>
						<li>
							<button class="w-full px-3 py-1.5 text-left hover:bg-secondary" onclick={() => act(() => ontoggledone(status.id))}>
								{status.is_done ? t('column.unmark_done') : t('column.mark_done')}
							</button>
						</li>
						<li>
							<button
								class="w-full px-3 py-1.5 text-left text-danger hover:bg-secondary disabled:opacity-40"
								disabled={!deletable.ok}
								title={deletable.ok ? undefined : deletable.reason}
								onclick={() => act(() => ondelete(status.id))}
							>
								{t('column.delete')}
							</button>
						</li>
					</ul>
				{/if}
			</div>
		{/if}
	</header>

	<ul
		class="flex min-h-16 flex-1 flex-col gap-2 p-3"
		use:dndzone={{ items: cards, flipDurationMs: FLIP_MS, type: 'norn-card', dragDisabled, dropTargetClasses: ['ring-2', 'ring-theme-primary/40', 'rounded-lg'] }}
		onconsider={consider}
		onfinalize={finalize}
	>
		{#each cards as card (card.id)}
			<li animate:flip={{ duration: FLIP_MS }}>
				<IssueCard
					issue={card}
					assignee={card.assignee_id ? (byId.get(card.assignee_id) ?? null) : null}
					doneColumn={status.is_done}
					{onopen}
				/>
			</li>
		{/each}
	</ul>

	<div class="px-3 pb-3">
		{#if composing}
			<!-- svelte-ignore a11y_autofocus -->
			<textarea
				class="w-full rounded-md border border-default bg-primary p-2 text-sm text-primary"
				rows="2"
				maxlength="300"
				placeholder={t('board.card_placeholder')}
				bind:value={titleDraft}
				onkeydown={composerKey}
				autofocus
			></textarea>
			<div class="mt-2 flex gap-2">
				<button
					type="button"
					class="rounded-md bg-theme-primary px-3 py-1 text-sm text-white disabled:opacity-50"
					disabled={saving || !titleDraft.trim()}
					onclick={submitCard}
				>
					{t('board.add')}
				</button>
				<button type="button" class="px-2 text-sm text-secondary" onclick={() => (composing = false)}>{t('board.cancel')}</button>
			</div>
		{:else}
			<button
				type="button"
				class="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm text-secondary hover:bg-primary"
				onclick={() => (composing = true)}
			>
				<Plus class="h-4 w-4" />
				{t('board.add_card')}
			</button>
		{/if}
	</div>
</section>
