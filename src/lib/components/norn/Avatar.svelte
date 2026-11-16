<script lang="ts">
	import { displayName, initials, type Person } from '#lib/norn/index.ts';

	interface Props {
		person: Pick<Person, 'name' | 'email'> | null;
		size?: number;
	}

	let { person, size = 24 }: Props = $props();
	const label = $derived(person ? displayName(person) : '');
</script>

{#if person}
	<span
		class="inline-flex shrink-0 items-center justify-center rounded-full bg-theme-primary/15 font-semibold text-primary ring-1 ring-black/10"
		style="width: {size}px; height: {size}px; font-size: {Math.round(size * 0.42)}px"
		title={label}
		aria-label={label}
	>
		{initials(person)}
	</span>
{/if}
