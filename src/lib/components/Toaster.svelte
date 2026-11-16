<script lang="ts">
	import { X } from 'lucide-svelte';
	import { toast } from '$lib/stores/toast';
</script>

<div class="pointer-events-none fixed bottom-4 right-4 z-[1200] flex w-80 flex-col gap-2" aria-live="polite">
	{#each $toast as item (item.id)}
		<div
			class="pointer-events-auto flex items-start gap-2 rounded-lg border bg-primary p-3 text-sm text-primary shadow-lg {item.type === 'error'
				? 'border-danger'
				: 'border-default'}"
			role={item.type === 'error' ? 'alert' : 'status'}
		>
			<span class="flex-1">{item.message}</span>
			<button type="button" class="text-tertiary hover:text-primary" aria-label="Dismiss" onclick={() => toast.dismiss(item.id)}>
				<X class="h-4 w-4" />
			</button>
		</div>
	{/each}
</div>
