<script lang="ts">
	/**
	 * Sign-in. Without a token: ask for a link by email. With one (#token=…
	 * from the email): a button spends it. Nothing is spent on page load, so a
	 * mail scanner that opens the link changes nothing. The fragment leaves the
	 * address bar straight away.
	 */
	import { afterNavigate, goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { app, getLang } from '$lib/i18n';

	const copy = app(getLang());
	type AuthState = 'loading' | 'ask' | 'sent' | 'ready' | 'failed';

	let authState = $state<AuthState>('loading');
	let email = $state('');
	let busy = $state(false);
	let message = $state('');
	let token = '';

	afterNavigate(readToken);

	function readToken(): void {
		const fromHash = new URLSearchParams(window.location.hash.slice(1)).get('token')?.trim() ?? '';
		if (window.location.hash) {
			const clean = `${window.location.pathname}${window.location.search}`;
			queueMicrotask(() => replaceState(clean, {}));
		}
		token = fromHash;
		authState = token ? 'ready' : 'ask';
	}

	async function post(path: string, body: unknown): Promise<Response> {
		return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
	}

	async function ask(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		busy = true;
		message = '';
		const res = await post('/api/auth/link', { email, next: page.url.searchParams.get('next') ?? '' }).catch(() => null);
		busy = false;
		if (res?.ok) authState = 'sent';
		else message = res?.status === 400 ? copy.badEmail : res?.status === 429 ? copy.tooMany : copy.failed;
	}

	async function signIn(): Promise<void> {
		busy = true;
		const res = await post('/api/auth/verify', { token }).catch(() => null);
		busy = false;
		if (res?.ok) {
			const { next } = (await res.json()) as { next: string };
			token = '';
			await goto(next, { replaceState: true, invalidateAll: true });
			return;
		}
		authState = 'failed';
		message = res?.status === 400 ? copy.signInFailedBody : res?.status === 429 ? copy.tooMany : copy.failed;
	}
</script>

<svelte:window onhashchange={() => window.location.hash && readToken()} />

<svelte:head>
	<title>{copy.signIn} · Norn</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="mx-auto max-w-md px-4 py-20">
	<header class="mb-6 text-center">
		<h1 class="text-3xl font-bold text-primary">Norn</h1>
		<p class="mt-1 text-secondary">{copy.tagline}</p>
	</header>
	<section class="rounded-2xl border border-default bg-secondary p-6" aria-live="polite">
		{#if authState === 'ask'}
			<h2 class="text-lg font-semibold text-primary">{copy.signInTitle}</h2>
			<p class="mt-1 text-sm text-secondary">{copy.signInBody}</p>
			<form class="mt-4 space-y-3" onsubmit={ask}>
				<label class="block text-sm">
					<span class="mb-1 block font-medium text-secondary">{copy.emailLabel}</span>
					<input type="email" class="w-full rounded-md border border-default bg-primary px-2 py-1.5 text-primary" bind:value={email} required autocomplete="email" maxlength="254" />
				</label>
				{#if message}<p class="text-sm text-danger" role="alert">{message}</p>{/if}
				<button type="submit" class="w-full rounded-md bg-theme-primary px-3 py-2 text-sm text-white disabled:opacity-50" disabled={busy}>
					{busy ? copy.sending : copy.sendLink}
				</button>
			</form>
		{:else if authState === 'sent'}
			<h2 class="text-lg font-semibold text-primary">{copy.linkSentTitle}</h2>
			<p class="mt-1 text-sm text-secondary">{copy.linkSentBody}</p>
			<button type="button" class="mt-4 text-sm text-secondary underline" onclick={() => (authState = 'ask')}>{copy.otherAddress}</button>
		{:else if authState === 'ready'}
			<h2 class="text-lg font-semibold text-primary">{copy.signInReadyTitle}</h2>
			<p class="mt-1 text-sm text-secondary">{copy.signInReadyBody}</p>
			<button type="button" class="mt-4 w-full rounded-md bg-theme-primary px-3 py-2 text-sm text-white disabled:opacity-50" onclick={signIn} disabled={busy}>
				{busy ? copy.signingIn : copy.signIn}
			</button>
		{:else if authState === 'failed'}
			<h2 class="text-lg font-semibold text-primary">{copy.signInFailedTitle}</h2>
			<p class="mt-1 text-sm text-secondary">{message}</p>
			<button type="button" class="mt-4 text-sm text-secondary underline" onclick={() => (authState = 'ask')}>{copy.askNewLink}</button>
		{/if}
	</section>
</main>
