<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeft } from 'lucide-svelte';
	import { createNornApi } from '#lib/norn/index.ts';
	import Board from '#lib/components/norn/Board.svelte';
	import MembersPanel from '#lib/components/norn/MembersPanel.svelte';
	import { t } from '#lib/components/norn/t.ts';

	let { data } = $props();
	const api = createNornApi();
	const project = $derived(data.board.project);
	const openIssueId = $derived(page.url.searchParams.get('issue'));

	// ?issue= keeps an open card linkable (notifications and search use it).
	function openChange(issueId: string | null) {
		const url = new URL(page.url.href);
		if (issueId) url.searchParams.set('issue', issueId);
		else url.searchParams.delete('issue');
		goto(url, { replace: true, reset: false });
	}
</script>

<svelte:head><title>{project.name} · {t('title')}</title></svelte:head>

<a href="/" class="mb-3 inline-flex items-center gap-1 text-sm text-secondary hover:text-primary">
	<ArrowLeft class="h-4 w-4" />
	{t('board.back')}
</a>
<div class="mb-5">
	<h1 class="text-2xl font-bold text-primary">{project.name}</h1>
	{#if project.description}<p class="mt-1 text-secondary">{project.description}</p>{/if}
</div>

<div class="grid gap-6 xl:grid-cols-[1fr_18rem]">
	<div class="min-w-0">
		{#key project.id}
			<Board {api} board={data.board} me={data.me} {openIssueId} onopenchange={openChange} />
		{/key}
	</div>
	<MembersPanel {api} projectId={project.id} members={data.board.members} canManage={project.can_manage} onchange={refreshAll} />
</div>
