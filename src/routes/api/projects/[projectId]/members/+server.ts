import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { pathId } from '#lib/server/norn/validate.ts';
import { addMember, getMembers } from '#lib/server/norn/members.ts';

export const GET = api((caller, { params }) => getMembers(getDb(), caller, pathId(params.projectId, 'Project')));
export const POST = api(
	async (caller, { params, request }) => addMember(getDb(), caller, pathId(params.projectId, 'Project'), await readJson(request)),
	201
);
