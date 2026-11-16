import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/instance';
import { MAX_QUERY_LENGTH, searchIssues } from '$lib/server/norn/search';
import { requireSignedIn } from '$lib/server/pages';

export const load: PageServerLoad = (event) => {
	const caller = requireSignedIn(event);
	const q = (event.url.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
	return { q, hits: q ? searchIssues(getDb(), caller, q) : [] };
};
