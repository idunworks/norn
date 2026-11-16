import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { pathId } from '#lib/server/norn/validate.ts';
import { reorderStatuses } from '#lib/server/norn/statuses.ts';

export const PUT = api(async (caller, { params, request }) =>
	reorderStatuses(getDb(), caller, pathId(params.projectId, 'Project'), await readJson(request))
);
