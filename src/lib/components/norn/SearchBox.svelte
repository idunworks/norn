<script lang="ts">
	import { Search } from 'lucide-svelte';
	import { t } from './t';

	interface Props {
		action: string;
		query?: string;
	}

	let { action, query = '' }: Props = $props();
</script>

<form method="GET" {action} role="search" class="relative hidden sm:block">
	<Search class="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" />
	<label class="sr-only" for="norn-search">{t('search.placeholder')}</label>
	<input
		id="norn-search"
		name="q"
		type="search"
		maxlength="200"
		value={query}
		placeholder={t('search.placeholder')}
		class="w-48 rounded-full border border-default bg-primary py-1.5 pl-8 pr-3 text-sm text-primary transition-all focus:w-64"
	/>
</form>
