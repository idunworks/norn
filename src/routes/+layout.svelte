<script lang="ts">
	import '../app.css';
	import Toaster from '#lib/components/Toaster.svelte';
	import { untrack } from 'svelte';
	import { setLang } from '#lib/i18n/index.ts';

	let { data, children } = $props();
	// Before any component renders, so the board copy comes out in the right language.
	setLang(untrack(() => data.lang));
</script>

{@render children()}
<Toaster />
