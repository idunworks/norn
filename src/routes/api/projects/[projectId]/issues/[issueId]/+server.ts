import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { deleteIssue, updateIssue } from '$lib/server/norn/issues';

export const PATCH = api(async (caller, { params, request }) =>
	updateIssue(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'), await readJson(request))
);
export const DELETE = api((caller, { params }) =>
	deleteIssue(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'))
);
