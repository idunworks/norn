import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { changeRole, removeMember } from '$lib/server/norn/members';

export const PATCH = api(async (caller, { params, request }) =>
	changeRole(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.userId, 'User'), await readJson(request))
);
export const DELETE = api((caller, { params }) =>
	removeMember(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.userId, 'User'))
);
