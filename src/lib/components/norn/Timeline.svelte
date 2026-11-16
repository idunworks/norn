<script lang="ts">
	import { Trash2 } from 'lucide-svelte';
	import { displayName, formatDateTime, formatRelativeTime, type TimelineEntry } from '$lib/norn';
	import Avatar from './Avatar.svelte';
	import { describeActivity } from './describe';
	import { intlLocale, t } from './t';

	interface Props {
		entries: TimelineEntry[];
		meId: string;
		isAdmin: boolean;
		ondeletecomment: (commentId: string) => void;
	}

	let { entries, meId, isAdmin, ondeletecomment }: Props = $props();
	const locale = intlLocale();
</script>

{#if entries.length === 0}
	<p class="text-sm text-tertiary">{t('timeline.empty')}</p>
{:else}
	<ol class="space-y-3">
		{#each entries as entry (entry.type === 'comment' ? entry.comment.id : entry.activity.id)}
			{#if entry.type === 'comment'}
				{@const comment = entry.comment}
				<li class="flex gap-2">
					<Avatar person={comment.author} size={26} />
					<div class="min-w-0 flex-1 rounded-lg border border-default bg-primary p-2">
						<div class="flex items-center gap-2 text-xs text-tertiary">
							<span class="font-medium text-secondary">{comment.author ? displayName(comment.author) : t('timeline.someone')}</span>
							<time datetime={comment.created_at} title={formatDateTime(comment.created_at, locale)}>
								{formatRelativeTime(comment.created_at, locale)}
							</time>
							{#if comment.author?.id === meId || isAdmin}
								<button
									type="button"
									class="ml-auto rounded p-0.5 hover:text-danger"
									aria-label={t('timeline.delete_comment')}
									onclick={() => ondeletecomment(comment.id)}
								>
									<Trash2 class="h-3.5 w-3.5" />
								</button>
							{/if}
						</div>
						<p class="mt-1 whitespace-pre-wrap break-words text-sm text-primary">{comment.body}</p>
					</div>
				</li>
			{:else}
				{@const event = entry.activity}
				<li class="pl-8 text-xs text-tertiary">
					<span class="font-medium text-secondary">{event.actor ? displayName(event.actor) : t('timeline.someone')}</span>
					{describeActivity(event)}
					·
					<time datetime={event.created_at} title={formatDateTime(event.created_at, locale)}>
						{formatRelativeTime(event.created_at, locale)}
					</time>
				</li>
			{/if}
		{/each}
	</ol>
{/if}
