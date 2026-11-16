import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { pathId } from '#lib/server/norn/validate.ts';
import { createStatus } from '#lib/server/norn/statuses.ts';

export const POST = api(
	async (caller, { params, request }) => createStatus(getDb(), caller, pathId(params.projectId, 'Project'), await readJson(request)),
	201
);
