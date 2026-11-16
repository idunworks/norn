<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import { t } from './t';

	interface Props {
		oncreate: (name: string) => Promise<void>;
	}

	let { oncreate }: Props = $props();
	let open = $state(false);
	let name = $state('');
	let saving = $state(false);

	async function submit() {
		const value = name.trim();
		if (!value || saving) return;
		saving = true;
		try {
			await oncreate(value);
			name = '';
			open = false;
		} finally {
			saving = false;
		}
	}

	function key(event: KeyboardEvent) {
		if (event.key === 'Enter') submit();
		if (event.key === 'Escape') open = false;
	}
</script>

<div class="w-60 shrink-0">
	{#if open}
		<!-- svelte-ignore a11y_autofocus -->
		<input
			class="w-full rounded-md border border-default bg-primary px-2 py-1.5 text-sm text-primary"
			maxlength="60"
			placeholder={t('board.column_placeholder')}
			bind:value={name}
			onkeydown={key}
			onblur={() => !name.trim() && (open = false)}
			disabled={saving}
			autofocus
		/>
	{:else}
		<button
			type="button"
			class="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-default px-3 py-3 text-sm text-secondary hover:text-primary"
			onclick={() => (open = true)}
		>
			<Plus class="h-4 w-4" />
			{t('board.add_column')}
		</button>
	{/if}
</div>
