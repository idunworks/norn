<script lang="ts">
	import { goto } from '$app/navigation';
	import { createNornApi } from '#lib/norn/index.ts';
	import NewProjectForm from '#lib/components/norn/NewProjectForm.svelte';
	import { t, tn } from '#lib/components/norn/t.ts';

	let { data } = $props();
	const api = createNornApi();
</script>

<svelte:head><title>{t('projects.heading')} · {t('title')}</title></svelte:head>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-bold text-primary">{t('projects.heading')}</h1>
	{#if data.me.is_admin}
		<NewProjectForm {api} oncreated={(p) => goto(`/p/${p.id}`)} />
	{/if}
</div>

{#if data.projects.length === 0}
	<p class="rounded-xl border border-dashed border-default p-8 text-center text-secondary">
		{data.me.is_admin ? t('projects.empty') : t('projects.empty_member')}
	</p>
{:else}
	<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.projects as project (project.id)}
			<li>
				<a
					href="/p/{project.id}"
					class="block h-full rounded-xl border border-default bg-secondary p-4 transition hover:shadow-md"
				>
					<h2 class="font-semibold text-primary">{project.name}</h2>
					{#if project.description}
						<p class="mt-1 line-clamp-2 text-sm text-secondary">{project.description}</p>
					{/if}
					<p class="mt-3 text-xs text-tertiary">{tn('projects.issues', project.issue_count)}</p>
				</a>
			</li>
		{/each}
	</ul>
{/if}
