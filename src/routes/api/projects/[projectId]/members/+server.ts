import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { addMember, getMembers } from '$lib/server/norn/members';

export const GET = api((caller, { params }) => getMembers(getDb(), caller, pathId(params.projectId, 'Project')));
export const POST = api(
	async (caller, { params, request }) => addMember(getDb(), caller, pathId(params.projectId, 'Project'), await readJson(request)),
	201
);
