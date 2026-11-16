import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { reorderStatuses } from '$lib/server/norn/statuses';

export const PUT = api(async (caller, { params, request }) =>
	reorderStatuses(getDb(), caller, pathId(params.projectId, 'Project'), await readJson(request))
);
