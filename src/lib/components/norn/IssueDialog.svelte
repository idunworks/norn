<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { X, Trash2 } from 'lucide-svelte';
	import { toast } from '#lib/stores/toast.ts';
	import {
		displayName,
		estimateDelta,
		formatDuration,
		type Issue,
		type IssuePatch,
		type Member,
		type NornApi,
		type Status,
		type TimelineEntry
	} from '#lib/norn/index.ts';
	import DurationField from './DurationField.svelte';
	import { portal } from './portal';
	import Timeline from './Timeline.svelte';
	import { t } from './t';

	const AUTOSAVE_MS = 700;

	interface Props {
		api: NornApi;
		issue: Issue;
		statuses: Status[];
		members: Member[];
		meId: string;
		isAdmin: boolean;
		onsaved: (issue: Issue) => void;
		onmove: (issueId: string, statusId: string) => void;
		ondeleted: (issueId: string) => void;
		oncomments: (issueId: string, delta: number) => void;
		onclose: () => void;
	}

	let { api, issue, statuses, members, meId, isAdmin, onsaved, onmove, ondeleted, oncomments, onclose }: Props =
		$props();

	// The editable copy, the last copy the server accepted, and what is waiting to be sent.
	let draft = $state<Issue>(untrack(() => ({ ...issue })));
	let saved = $state<Issue>(untrack(() => ({ ...issue })));
	let pending: IssuePatch = {};
	let timer: ReturnType<typeof setTimeout> | null = null;
	// Saves run one after another, so an older answer can never land last.
	let inflight: Promise<void> = Promise.resolve();
	let saveState = $state<'idle' | 'saving' | 'saved'>('idle');
	let entries = $state<TimelineEntry[]>([]);
	let comment = $state('');
	let posting = $state(false);
	let dialog: HTMLDivElement | undefined = $state();

	const delta = $derived(estimateDelta(draft.estimate_minutes, draft.actual_minutes));

	function change<K extends keyof IssuePatch>(field: K, value: IssuePatch[K]) {
		draft = { ...draft, [field]: value } as Issue;
		if (field === 'title' && !String(value ?? '').trim()) return;
		pending = { ...pending, [field]: value };
		schedule();
	}

	function schedule() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(flush, AUTOSAVE_MS);
	}

	function flush(): Promise<void> {
		timer = null;
		inflight = inflight.then(send);
		return inflight;
	}

	async function send() {
		const patch = pending;
		if (Object.keys(patch).length === 0) return;
		pending = {};
		saveState = 'saving';
		try {
			const next = await api.updateIssue(issue.project_id, issue.id, patch);
			saved = next;
			draft = { ...next, ...pending } as Issue;
			saveState = 'saved';
			onsaved(next);
			loadTimeline();
		} catch (err) {
			draft = { ...saved };
			saveState = 'idle';
			toast.error(err instanceof Error ? err.message : t('errors.generic'));
		}
	}

	async function loadTimeline() {
		try {
			entries = await api.timeline(issue.project_id, issue.id);
		} catch {
			toast.error(t('errors.load'));
		}
	}

	async function postComment() {
		const body = comment.trim();
		if (!body || posting) return;
		posting = true;
		try {
			await api.addComment(issue.project_id, issue.id, body);
			comment = '';
			oncomments(issue.id, 1);
			await loadTimeline();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('errors.generic'));
		} finally {
			posting = false;
		}
	}

	async function deleteComment(commentId: string) {
		try {
			await api.deleteComment(issue.project_id, issue.id, commentId);
			oncomments(issue.id, -1);
			await loadTimeline();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('errors.generic'));
		}
	}

	async function remove() {
		if (!confirm(t('issue.delete_confirm'))) return;
		try {
			await api.deleteIssue(issue.project_id, issue.id);
			ondeleted(issue.id);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('errors.generic'));
		}
	}

	function close() {
		if (timer) {
			clearTimeout(timer);
			flush();
		}
		onclose();
	}

	function key(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}

	function commentKey(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			postComment();
		}
	}

	onMount(() => {
		loadTimeline();
		dialog?.focus();
	});
	// Leaving with an edit still waiting: send it rather than lose it.
	onDestroy(() => {
		if (timer) {
			clearTimeout(timer);
			flush();
		}
	});
</script>

<svelte:window onkeydown={key} />

<!-- At <body> (portal) and z-[1100]: above the sticky site header (z-50). -->
<div use:portal class="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
	<button type="button" class="fixed inset-0 cursor-default" aria-label={t('issue.close')} onclick={close}></button>
	<div
		bind:this={dialog}
		role="dialog"
		aria-modal="true"
		aria-labelledby="norn-issue-title"
		tabindex="-1"
		class="relative grid w-full max-w-5xl gap-6 rounded-2xl border border-default bg-primary p-5 shadow-2xl md:grid-cols-[3fr_2fr]"
	>
		<div class="space-y-4">
			<div class="flex items-start gap-2">
				<label class="sr-only" for="norn-issue-title">{t('issue.title')}</label>
				<input
					id="norn-issue-title"
					class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-xl font-semibold text-primary hover:border-default focus:border-default"
					maxlength="300"
					value={draft.title}
					oninput={(e) => change('title', e.currentTarget.value)}
				/>
				<span class="pt-2 text-xs text-tertiary" aria-live="polite">
					{saveState === 'saving' ? t('issue.saving') : saveState === 'saved' ? t('issue.saved') : ''}
				</span>
				<button type="button" class="rounded p-1 text-tertiary hover:text-primary" aria-label={t('issue.close')} onclick={close}>
					<X class="h-5 w-5" />
				</button>
			</div>

			<label class="block text-sm">
				<span class="mb-1 block font-medium text-secondary">{t('issue.description')}</span>
				<textarea
					class="w-full rounded-md border border-default bg-primary p-2 text-primary"
					rows="6"
					maxlength="10000"
					value={draft.description ?? ''}
					oninput={(e) => change('description', e.currentTarget.value || null)}
				></textarea>
			</label>

			<div class="grid gap-3 sm:grid-cols-2">
				<label class="block text-sm">
					<span class="mb-1 block font-medium text-secondary">{t('issue.column')}</span>
					<select
						class="w-full rounded-md border border-default bg-primary px-2 py-1.5 text-primary"
						value={draft.status_id}
						onchange={(e) => {
							draft = { ...draft, status_id: e.currentTarget.value };
							onmove(issue.id, e.currentTarget.value);
						}}
					>
						{#each statuses as status (status.id)}
							<option value={status.id}>{status.name}</option>
						{/each}
					</select>
				</label>
				<label class="block text-sm">
					<span class="mb-1 block font-medium text-secondary">{t('issue.assignee')}</span>
					<select
						class="w-full rounded-md border border-default bg-primary px-2 py-1.5 text-primary"
						value={draft.assignee_id ?? ''}
						onchange={(e) => change('assignee_id', e.currentTarget.value || null)}
					>
						<option value="">{t('issue.nobody')}</option>
						{#each members as member (member.id)}
							<option value={member.id}>{displayName(member)}</option>
						{/each}
					</select>
				</label>
				<label class="block text-sm">
					<span class="mb-1 block font-medium text-secondary">{t('issue.due')}</span>
					<input
						type="date"
						class="w-full rounded-md border border-default bg-primary px-2 py-1.5 text-primary"
						value={draft.due_date ?? ''}
						onchange={(e) => change('due_date', e.currentTarget.value || null)}
					/>
				</label>
				<fieldset class="text-sm">
					<legend class="mb-1 font-medium text-secondary">{t('issue.kind')}</legend>
					<div class="inline-flex overflow-hidden rounded-md border border-default">
						{#each ['task', 'bug'] as const as kind (kind)}
							<button
								type="button"
								class="px-3 py-1.5 {draft.kind === kind ? 'bg-theme-primary text-white' : 'bg-primary text-secondary'}"
								aria-pressed={draft.kind === kind}
								onclick={() => change('kind', kind)}
							>
								{t(`issue.${kind}`)}
							</button>
						{/each}
					</div>
				</fieldset>
				<DurationField
					id="norn-estimate"
					label={t('issue.estimate')}
					minutes={draft.estimate_minutes}
					onchange={(m) => change('estimate_minutes', m)}
				/>
				<DurationField
					id="norn-actual"
					label={t('issue.actual')}
					minutes={draft.actual_minutes}
					onchange={(m) => change('actual_minutes', m)}
				/>
			</div>
			{#if delta}
				<p class="text-sm" class:text-danger={delta.direction === 'over'} class:text-secondary={delta.direction !== 'over'}>
					{delta.direction === 'on'
						? t('issue.on_estimate')
						: t(`issue.${delta.direction}_estimate`, { time: formatDuration(delta.minutes) })}
				</p>
			{/if}

			<button type="button" class="inline-flex items-center gap-1 text-sm text-danger hover:underline" onclick={remove}>
				<Trash2 class="h-4 w-4" />
				{t('issue.delete')}
			</button>
		</div>

		<aside class="flex min-h-0 flex-col gap-3 md:border-l md:border-default md:pl-5">
			<h3 class="text-sm font-semibold text-primary">{t('timeline.heading')}</h3>
			<div class="max-h-[50vh] overflow-y-auto pr-1">
				<Timeline {entries} {meId} {isAdmin} ondeletecomment={deleteComment} />
			</div>
			<label class="sr-only" for="norn-comment">{t('timeline.send')}</label>
			<textarea
				id="norn-comment"
				class="w-full rounded-md border border-default bg-primary p-2 text-sm text-primary"
				rows="3"
				maxlength="10000"
				placeholder={t('timeline.comment_placeholder')}
				bind:value={comment}
				onkeydown={commentKey}
			></textarea>
			<div class="flex items-center justify-between">
				<span class="text-xs text-tertiary">{t('timeline.send_hint')}</span>
				<button
					type="button"
					class="rounded-md bg-theme-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
					disabled={posting || !comment.trim()}
					onclick={postComment}
				>
					{t('timeline.send')}
				</button>
			</div>
		</aside>
	</div>
</div>
