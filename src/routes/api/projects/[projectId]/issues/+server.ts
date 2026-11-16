import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { createIssue } from '$lib/server/norn/issues';

export const POST = api(
	async (caller, { params, request }) => createIssue(getDb(), caller, pathId(params.projectId, 'Project'), await readJson(request)),
	201
);
