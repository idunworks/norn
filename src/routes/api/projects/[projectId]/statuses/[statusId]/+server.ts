import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { pathId } from '#lib/server/norn/validate.ts';
import { deleteStatus, updateStatus } from '#lib/server/norn/statuses.ts';

export const PATCH = api(async (caller, { params, request }) =>
	updateStatus(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.statusId, 'Column'), await readJson(request))
);
export const DELETE = api((caller, { params }) =>
	deleteStatus(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.statusId, 'Column'))
);
