import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { moveIssue } from '$lib/server/norn/issues';

export const POST = api(async (caller, { params, request }) =>
	moveIssue(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'), await readJson(request))
);
