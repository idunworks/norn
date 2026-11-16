import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { createStatus } from '$lib/server/norn/statuses';

export const POST = api(
	async (caller, { params, request }) => createStatus(getDb(), caller, pathId(params.projectId, 'Project'), await readJson(request)),
	201
);
