import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { pathId } from '#lib/server/norn/validate.ts';
import { deleteIssue, updateIssue } from '#lib/server/norn/issues.ts';

export const PATCH = api(async (caller, { params, request }) =>
	updateIssue(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'), await readJson(request))
);
export const DELETE = api((caller, { params }) =>
	deleteIssue(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'))
);
