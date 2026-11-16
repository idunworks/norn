<script lang="ts">
	import { page } from '$app/state';
	import { app, getLang } from '$lib/i18n';

	const copy = app(getLang());
</script>

<svelte:head><title>{page.status} · Norn</title></svelte:head>

<main class="mx-auto max-w-lg px-4 py-24 text-center">
	<p class="text-sm font-semibold text-tertiary">{page.status}</p>
	<h1 class="mt-2 text-2xl font-bold text-primary">{page.status === 404 ? copy.notFoundTitle : copy.errorTitle}</h1>
	{#if page.error?.message}<p class="mt-2 text-secondary">{page.error.message}</p>{/if}
	<a href="/" class="mt-6 inline-block text-sm text-secondary underline">Norn</a>
</main>
