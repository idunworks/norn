<script lang="ts">
	import { untrack } from 'svelte';
	import { Bell } from 'lucide-svelte';
	import { toast } from '#lib/stores/toast.ts';
	import { displayName, formatRelativeTime, type NornApi, type Notifications } from '#lib/norn/index.ts';
	import { intlLocale, t } from './t';

	const BADGE_MAX = 9;

	interface Props {
		api: NornApi;
		initial: Notifications;
		hrefFor: (projectId: string, issueId: string) => string;
	}

	let { api, initial, hrefFor }: Props = $props();
	let inbox = $state<Notifications>(untrack(() => initial));
	let open = $state(false);
	const locale = intlLocale();

	async function refresh() {
		try {
			inbox = await api.notifications();
		} catch {
			toast.error(t('errors.load'));
		}
	}

	async function markRead(ids?: string[]) {
		try {
			inbox = await api.markRead(ids);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('errors.generic'));
		}
	}

	function toggle() {
		open = !open;
		if (open) refresh();
	}
</script>

<div class="relative">
	<button
		type="button"
		class="relative rounded-full p-2 text-secondary hover:bg-secondary hover:text-primary"
		aria-label={t('notifications.label')}
		aria-expanded={open}
		onclick={toggle}
	>
		<Bell class="h-5 w-5" />
		{#if inbox.unread > 0}
			<span class="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-on-danger">
				{inbox.unread > BADGE_MAX ? `${BADGE_MAX}+` : inbox.unread}
			</span>
		{/if}
	</button>
	{#if open}
		<div class="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-default bg-primary shadow-xl">
			<div class="flex items-center justify-between border-b border-default px-3 py-2">
				<span class="text-sm font-semibold text-primary">{t('notifications.label')}</span>
				{#if inbox.unread > 0}
					<button type="button" class="text-xs text-secondary underline" onclick={() => markRead()}>{t('notifications.mark_all')}</button>
				{/if}
			</div>
			{#if inbox.items.length === 0}
				<p class="px-3 py-4 text-sm text-tertiary">{t('notifications.empty')}</p>
			{:else}
				<ul class="max-h-96 overflow-y-auto">
					{#each inbox.items as item (item.id)}
						<li>
							<a
								href={item.project_id && item.issue_id ? hrefFor(item.project_id, item.issue_id) : '#'}
								class="block px-3 py-2 text-sm hover:bg-secondary {item.read_at ? 'text-secondary' : 'bg-theme-primary/10 text-primary'}"
								onclick={() => {
									open = false;
									if (!item.read_at) markRead([item.id]);
								}}
							>
								<span class="block">
									{t(`notifications.${item.kind}`, {
										actor: item.actor ? displayName(item.actor) : t('timeline.someone'),
										issue: item.data.issue_title ?? ''
									})}
								</span>
								<span class="block text-xs text-tertiary">
									{item.data.project_name ?? ''} · {formatRelativeTime(item.created_at, locale)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
