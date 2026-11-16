<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from '$lib/stores/toast';
	import {
		canDeleteStatus,
		groupByStatus,
		matchesFilter,
		moveCard,
		NO_FILTER,
		shiftStatus,
		sortedStatuses,
		type Board,
		type BoardFilter,
		type Columns,
		type Issue,
		type Me,
		type NornApi,
		type Status
	} from '$lib/norn';
	import AddColumn from './AddColumn.svelte';
	import BoardFilters from './BoardFilters.svelte';
	import Column from './Column.svelte';
	import IssueDialog from './IssueDialog.svelte';
	import { t } from './t';

	interface Props {
		api: NornApi;
		board: Board;
		me: Me;
		openIssueId: string | null;
		onopenchange: (issueId: string | null) => void;
	}

	let { api, board, me, openIssueId, onopenchange }: Props = $props();

	// Seeded once from the server; from then on the board keeps its own state.
	let statuses = $state<Status[]>(untrack(() => sortedStatuses(board.statuses)));
	let columns = $state<Columns>(untrack(() => groupByStatus(board.statuses, board.issues)));
	let filter = $state<BoardFilter>(NO_FILTER);

	// Fresh server data (e.g. after a member left and their cards were
	// unassigned) replaces the local copy.
	$effect(() => {
		const fresh = board;
		untrack(() => {
			statuses = sortedStatuses(fresh.statuses);
			columns = groupByStatus(fresh.statuses, fresh.issues);
		});
	});
	const members = $derived(board.members);
	const projectId = $derived(board.project.id);
	const canManage = $derived(board.project.can_manage);

	const filtering = $derived(filter.assignee !== 'all' || filter.kind !== 'all');
	const allCards = $derived(Object.values(columns).flat());
	const shown = $derived(allCards.filter((c) => matchesFilter(c, filter)).length);
	const openIssue = $derived(openIssueId ? (allCards.find((c) => c.id === openIssueId) ?? null) : null);

	/** Run an optimistic change; on failure put the board back and say why. */
	async function attempt(change: () => Promise<unknown>) {
		const before = { statuses, columns };
		try {
			await change();
		} catch (err) {
			statuses = before.statuses;
			columns = before.columns;
			toast.error(err instanceof Error ? err.message : t('errors.generic'));
		}
	}

	function withCard(issueId: string, update: (card: Issue) => Issue) {
		columns = Object.fromEntries(
			Object.entries(columns).map(([id, cards]) => [id, cards.map((c) => (c.id === issueId ? update(c) : c))])
		);
	}

	// ── Cards ──────────────────────────────────────────────────────────

	function consider(statusId: string, items: Issue[]) {
		columns = { ...columns, [statusId]: items };
	}

	function finalize(statusId: string, items: Issue[], droppedId: string | null) {
		const placed = items.map((c, position) => ({ ...c, status_id: statusId, position }));
		const before = { statuses, columns };
		columns = { ...columns, [statusId]: placed };
		if (!droppedId) return;
		api
			.moveIssue(projectId, droppedId, statusId, placed.map((c) => c.id))
			.catch((err: unknown) => {
				columns = before.columns;
				toast.error(err instanceof Error ? err.message : t('errors.generic'));
				reload();
			});
	}

	async function reload() {
		try {
			const fresh = await api.board(projectId);
			statuses = sortedStatuses(fresh.statuses);
			columns = groupByStatus(fresh.statuses, fresh.issues);
		} catch {
			toast.error(t('errors.load'));
		}
	}

	async function createCard(statusId: string, title: string) {
		try {
			const issue = await api.createIssue(projectId, { status_id: statusId, title });
			columns = { ...columns, [statusId]: [...(columns[statusId] ?? []), issue] };
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('errors.generic'));
			throw err;
		}
	}

	function moveToColumn(issueId: string, statusId: string) {
		const result = moveCard(columns, issueId, statusId, Number.MAX_SAFE_INTEGER);
		if (!result) return;
		attempt(async () => {
			columns = result.columns;
			await api.moveIssue(projectId, issueId, statusId, result.orderedIds);
		});
	}

	function removeCard(issueId: string) {
		columns = Object.fromEntries(Object.entries(columns).map(([id, cards]) => [id, cards.filter((c) => c.id !== issueId)]));
		onopenchange(null);
	}

	// ── Columns ────────────────────────────────────────────────────────

	async function createColumn(name: string) {
		try {
			const status = await api.createStatus(projectId, name);
			statuses = [...statuses, status];
			columns = { ...columns, [status.id]: [] };
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('errors.generic'));
		}
	}

	function patchStatus(statusId: string, patch: Partial<Status>) {
		attempt(async () => {
			statuses = statuses.map((s) => (s.id === statusId ? { ...s, ...patch } : s));
			await api.updateStatus(projectId, statusId, patch);
		});
	}

	function shift(statusId: string, step: -1 | 1) {
		const order = shiftStatus(statuses, statusId, step);
		if (!order) return;
		attempt(async () => {
			const byId = new Map(statuses.map((s) => [s.id, s]));
			statuses = order.map((id, position) => ({ ...byId.get(id)!, position }));
			await api.reorderStatuses(projectId, order);
		});
	}

	function deleteColumn(statusId: string) {
		const status = statuses.find((s) => s.id === statusId);
		if (!status || !confirm(t('column.delete_confirm', { name: status.name }))) return;
		attempt(async () => {
			statuses = statuses.filter((s) => s.id !== statusId);
			columns = Object.fromEntries(Object.entries(columns).filter(([id]) => id !== statusId));
			await api.deleteStatus(projectId, statusId);
		});
	}

	function deletable(statusId: string): { ok: true } | { ok: false; reason: string } {
		if (canDeleteStatus(columns, statusId)) return { ok: true };
		return { ok: false, reason: (columns[statusId]?.length ?? 0) > 0 ? t('column.delete_not_empty') : t('column.delete_last') };
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<BoardFilters {filter} {members} {shown} total={allCards.length} onchange={(f) => (filter = f)} />
		<p class="text-xs text-tertiary">{t('board.drag_hint')}</p>
	</div>

	<div class="flex items-start gap-4 overflow-x-auto pb-4">
		{#each statuses as status, index (status.id)}
			<Column
				{status}
				cards={(columns[status.id] ?? []).filter((c) => matchesFilter(c, filter))}
				{members}
				{canManage}
				dragDisabled={filtering}
				isFirst={index === 0}
				isLast={index === statuses.length - 1}
				deletable={deletable(status.id)}
				onconsider={consider}
				onfinalize={finalize}
				onopen={(id) => onopenchange(id)}
				oncreate={createCard}
				onrename={(id, name) => patchStatus(id, { name })}
				onshift={shift}
				ontoggledone={(id) => patchStatus(id, { is_done: !statuses.find((s) => s.id === id)?.is_done })}
				ondelete={deleteColumn}
			/>
		{/each}
		{#if canManage}
			<AddColumn oncreate={createColumn} />
		{/if}
	</div>
</div>

{#if openIssue}
	<IssueDialog
		{api}
		issue={openIssue}
		{statuses}
		{members}
		meId={me.id}
		isAdmin={me.is_admin}
		onsaved={(next) => withCard(next.id, (c) => ({ ...next, comment_count: c.comment_count }))}
		onmove={moveToColumn}
		ondeleted={removeCard}
		oncomments={(id, d) => withCard(id, (c) => ({ ...c, comment_count: c.comment_count + d }))}
		onclose={() => onopenchange(null)}
	/>
{/if}
