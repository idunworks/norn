<script lang="ts">
	import { formatDuration, parseDuration } from '#lib/norn/index.ts';
	import { t } from './t';

	interface Props {
		id: string;
		label: string;
		minutes: number | null;
		onchange: (minutes: number | null) => void;
	}

	let { id, label, minutes, onchange }: Props = $props();

	let text = $state('');
	let invalid = $state(false);
	let focused = $state(false);

	// Follow the saved value while the field isn't being edited.
	$effect(() => {
		if (!focused) text = minutes === null ? '' : formatDuration(minutes);
	});

	function input(event: Event) {
		text = (event.currentTarget as HTMLInputElement).value;
		const parsed = parseDuration(text);
		invalid = !parsed.ok;
		if (parsed.ok && parsed.minutes !== minutes) onchange(parsed.minutes);
	}

	function blur() {
		focused = false;
		const parsed = parseDuration(text);
		if (parsed.ok) {
			invalid = false;
			text = parsed.minutes === null ? '' : formatDuration(parsed.minutes);
		}
	}
</script>

<label class="block text-sm" for={id}>
	<span class="mb-1 block font-medium text-secondary">{label}</span>
	<input
		{id}
		type="text"
		inputmode="decimal"
		class="w-full rounded-md border border-default bg-primary px-2 py-1.5 text-primary"
		class:border-danger={invalid}
		placeholder={t('issue.duration_placeholder')}
		value={text}
		aria-invalid={invalid}
		aria-describedby={invalid ? `${id}-error` : undefined}
		oninput={input}
		onfocus={() => (focused = true)}
		onblur={blur}
	/>
	{#if invalid}
		<span id="{id}-error" class="mt-1 block text-xs text-danger">{t('issue.duration_invalid')}</span>
	{/if}
</label>
