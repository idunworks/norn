import { api } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { searchIssues } from '#lib/server/norn/search.ts';

export const GET = api((caller, { url }) => searchIssues(getDb(), caller, url.searchParams.get('q') ?? ''));
