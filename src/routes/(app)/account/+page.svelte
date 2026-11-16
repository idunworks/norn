<script lang="ts">
	import { untrack } from 'svelte';
	import { refreshAll } from '$app/navigation';
	import { toast } from '#lib/stores/toast.ts';
	import { app, fill, getLang } from '#lib/i18n/index.ts';

	let { data } = $props();
	const copy = app(getLang());
	let name = $state(untrack(() => data.account.name));
	let busy = $state(false);

	async function save(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		busy = true;
		try {
			const res = await fetch('/api/account', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) throw new Error(copy.failed);
			toast.success(copy.saved);
			await refreshAll();
		} catch {
			toast.error(copy.failed);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>{copy.account} · Norn</title></svelte:head>

<section class="mx-auto max-w-md rounded-2xl border border-default bg-secondary p-6">
	<h1 class="text-xl font-bold text-primary">{copy.accountTitle}</h1>
	<p class="mt-1 text-sm text-secondary">{fill(copy.signedInAs, { email: data.account.email })}</p>
	<form class="mt-5 space-y-3" onsubmit={save}>
		<label class="block text-sm">
			<span class="mb-1 block font-medium text-secondary">{copy.nameLabel}</span>
			<input class="w-full rounded-md border border-default bg-primary px-2 py-1.5 text-primary" maxlength="80" bind:value={name} autocomplete="name" />
		</label>
		<p class="text-xs text-tertiary">{copy.nameHint}</p>
		<button type="submit" class="rounded-md bg-theme-primary px-3 py-1.5 text-sm text-white disabled:opacity-50" disabled={busy}>{copy.save}</button>
	</form>
</section>
