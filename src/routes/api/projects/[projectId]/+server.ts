import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { getBoard, updateProject } from '$lib/server/norn/projects';

export const GET = api((caller, { params }) => getBoard(getDb(), caller, pathId(params.projectId, 'Project')));
export const PATCH = api(async (caller, { params, request }) =>
	updateProject(getDb(), caller, pathId(params.projectId, 'Project'), await readJson(request))
);
