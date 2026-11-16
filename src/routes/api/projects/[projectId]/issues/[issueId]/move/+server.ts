import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { pathId } from '#lib/server/norn/validate.ts';
import { moveIssue } from '#lib/server/norn/issues.ts';

export const POST = api(async (caller, { params, request }) =>
	moveIssue(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'), await readJson(request))
);
