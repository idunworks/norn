import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { pathId } from '#lib/server/norn/validate.ts';
import { createIssue } from '#lib/server/norn/issues.ts';

export const POST = api(
	async (caller, { params, request }) => createIssue(getDb(), caller, pathId(params.projectId, 'Project'), await readJson(request)),
	201
);
