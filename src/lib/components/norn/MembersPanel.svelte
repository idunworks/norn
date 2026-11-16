<script lang="ts">
	import { UserPlus, X } from 'lucide-svelte';
	import { toast } from '#lib/stores/toast.ts';
	import { displayName, NornError, type Member, type MemberRole, type NornApi } from '#lib/norn/index.ts';
	import Avatar from './Avatar.svelte';
	import { t } from './t';

	interface Props {
		api: NornApi;
		projectId: string;
		members: Member[];
		canManage: boolean;
		onchange: () => void;
	}

	let { api, projectId, members, canManage, onchange }: Props = $props();
	let email = $state('');
	let role = $state<MemberRole>('member');
	let busy = $state(false);

	function fail(err: unknown) {
		toast.error(err instanceof Error ? err.message : t('errors.generic'));
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		if (!email.trim() || busy) return;
		busy = true;
		try {
			await api.addMember(projectId, { email: email.trim(), role });
			email = '';
			onchange();
		} catch (err) {
			if (err instanceof NornError && err.status === 404) toast.error(t('members.not_found'));
			else fail(err);
		} finally {
			busy = false;
		}
	}

	async function setRole(member: Member, next: MemberRole) {
		try {
			await api.setMemberRole(projectId, member.id, next);
			onchange();
		} catch (err) {
			fail(err);
		}
	}

	async function remove(member: Member) {
		if (!confirm(t('members.remove_confirm', { name: displayName(member) }))) return;
		try {
			await api.removeMember(projectId, member.id);
			onchange();
		} catch (err) {
			fail(err);
		}
	}
</script>

<section class="rounded-xl border border-default bg-secondary p-4" aria-labelledby="norn-members">
	<h2 id="norn-members" class="mb-1 text-sm font-semibold text-primary">{t('members.heading')}</h2>
	{#if canManage}<p class="mb-3 text-xs text-tertiary">{t('members.owner_hint')}</p>{/if}
	<ul class="space-y-2">
		{#each members as member (member.id)}
			<li class="flex items-center gap-2 text-sm">
				<Avatar person={member} size={26} />
				<span class="min-w-0 flex-1 truncate text-primary" title={member.email}>{displayName(member)}</span>
				{#if canManage}
					<select
						class="rounded border border-default bg-primary px-1 py-0.5 text-xs text-primary"
						value={member.role}
						aria-label={displayName(member)}
						onchange={(e) => setRole(member, e.currentTarget.value as MemberRole)}
					>
						<option value="owner">{t('members.owner')}</option>
						<option value="member">{t('members.member')}</option>
					</select>
					<button type="button" class="rounded p-1 text-tertiary hover:text-danger" aria-label={t('members.remove')} onclick={() => remove(member)}>
						<X class="h-4 w-4" />
					</button>
				{:else}
					<span class="text-xs text-tertiary">{t(`members.${member.role}`)}</span>
				{/if}
			</li>
		{/each}
	</ul>
	{#if canManage}
		<form class="mt-3 flex gap-2" onsubmit={add}>
			<label class="sr-only" for="norn-member-email">{t('members.email')}</label>
			<input
				id="norn-member-email"
				type="email"
				required
				class="min-w-0 flex-1 rounded-md border border-default bg-primary px-2 py-1 text-sm text-primary"
				placeholder={t('members.email')}
				bind:value={email}
			/>
			<select class="rounded-md border border-default bg-primary px-1 text-sm text-primary" bind:value={role} aria-label={t('members.heading')}>
				<option value="member">{t('members.member')}</option>
				<option value="owner">{t('members.owner')}</option>
			</select>
			<button type="submit" class="rounded-md bg-theme-primary p-1.5 text-white disabled:opacity-50" disabled={busy} aria-label={t('members.add')}>
				<UserPlus class="h-4 w-4" />
			</button>
		</form>
	{/if}
</section>
