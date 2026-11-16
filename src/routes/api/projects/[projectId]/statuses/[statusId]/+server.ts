import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { deleteStatus, updateStatus } from '$lib/server/norn/statuses';

export const PATCH = api(async (caller, { params, request }) =>
	updateStatus(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.statusId, 'Column'), await readJson(request))
);
export const DELETE = api((caller, { params }) =>
	deleteStatus(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.statusId, 'Column'))
);
