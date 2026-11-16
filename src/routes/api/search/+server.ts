import { api } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { searchIssues } from '$lib/server/norn/search';

export const GET = api((caller, { url }) => searchIssues(getDb(), caller, url.searchParams.get('q') ?? ''));
