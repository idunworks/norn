import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { pathId } from '#lib/server/norn/validate.ts';
import { changeRole, removeMember } from '#lib/server/norn/members.ts';

export const PATCH = api(async (caller, { params, request }) =>
	changeRole(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.userId, 'User'), await readJson(request))
);
export const DELETE = api((caller, { params }) =>
	removeMember(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.userId, 'User'))
);
