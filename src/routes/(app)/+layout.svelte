<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { UserRound } from 'lucide-svelte';
	import { createNornApi } from '#lib/norn/index.ts';
	import NotificationsBell from '#lib/components/norn/NotificationsBell.svelte';
	import SearchBox from '#lib/components/norn/SearchBox.svelte';
	import { app, getLang, t } from '#lib/i18n/index.ts';

	let { data, children } = $props();
	const api = createNornApi();
	const copy = app(getLang());
	const hrefFor = (projectId: string, issueId: string) => `/p/${projectId}?issue=${issueId}`;

	async function signOut(): Promise<void> {
		await fetch('/api/auth/logout', { method: 'POST' });
		await goto('/auth', { refreshAll: true });
	}
</script>

<div class="min-h-screen bg-primary">
	<header class="border-b border-default bg-primary">
		<div class="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3">
			<a href="/" class="text-lg font-bold text-primary">{t('title')}</a>
			<span class="hidden text-sm text-tertiary md:inline">{t('tagline')}</span>
			<div class="ml-auto flex items-center gap-2">
				<SearchBox action="/search" query={page.url.searchParams.get('q') ?? ''} />
				<NotificationsBell {api} initial={data.notifications} {hrefFor} />
				<a href="/account" class="rounded-full p-2 text-secondary hover:bg-secondary hover:text-primary" aria-label={copy.account}>
					<UserRound class="h-5 w-5" />
				</a>
				<button type="button" class="rounded-md px-2 py-1 text-sm text-secondary hover:text-primary" onclick={signOut}>
					{copy.signOut}
				</button>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-[1600px] px-4 py-6">
		{@render children()}
	</main>
</div>
