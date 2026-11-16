import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { pathId } from '$lib/server/norn/validate';
import { addComment } from '$lib/server/norn/comments';

export const POST = api(
	async (caller, { params, request }) =>
		addComment(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'), await readJson(request)),
	201
);
