<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import type { NornApi, Project } from '$lib/norn';
	import { portal } from './portal';
	import { t } from './t';

	interface Props {
		api: NornApi;
		oncreated: (project: Project) => void;
	}

	let { api, oncreated }: Props = $props();
	let open = $state(false);
	let name = $state('');
	let description = $state('');
	let error = $state('');
	let saving = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) {
			error = t('projects.name_required');
			return;
		}
		saving = true;
		error = '';
		try {
			const project = await api.createProject({ name: name.trim(), description: description.trim() || null });
			open = false;
			name = '';
			description = '';
			oncreated(project);
		} catch (err) {
			error = err instanceof Error ? err.message : t('errors.generic');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<button type="button" class="inline-flex items-center gap-1 rounded-md bg-theme-primary px-3 py-2 text-sm text-white" onclick={() => (open = true)}>
	<Plus class="h-4 w-4" />
	{t('projects.new')}
</button>

{#if open}
	<div use:portal class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4">
		<button type="button" class="fixed inset-0 cursor-default" aria-label={t('board.cancel')} onclick={() => (open = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="norn-new-project" class="relative w-full max-w-md">
		<form class="space-y-4 rounded-2xl border border-default bg-primary p-5 shadow-2xl" onsubmit={submit}>
			<h2 id="norn-new-project" class="text-lg font-semibold text-primary">{t('projects.new')}</h2>
			<label class="block text-sm">
				<span class="mb-1 block font-medium text-secondary">{t('projects.name')}</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input class="w-full rounded-md border border-default bg-primary px-2 py-1.5 text-primary" maxlength="120" bind:value={name} autofocus />
			</label>
			<label class="block text-sm">
				<span class="mb-1 block font-medium text-secondary">{t('projects.description')}</span>
				<textarea class="w-full rounded-md border border-default bg-primary p-2 text-primary" rows="3" maxlength="2000" bind:value={description}></textarea>
			</label>
			{#if error}<p class="text-sm text-danger" role="alert">{error}</p>{/if}
			<div class="flex justify-end gap-2">
				<button type="button" class="px-3 py-1.5 text-sm text-secondary" onclick={() => (open = false)}>{t('board.cancel')}</button>
				<button type="submit" class="rounded-md bg-theme-primary px-3 py-1.5 text-sm text-white disabled:opacity-50" disabled={saving}>
					{saving ? t('projects.creating') : t('projects.create')}
				</button>
			</div>
		</form>
		</div>
	</div>
{/if}
