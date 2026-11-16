import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { pathId } from '#lib/server/norn/validate.ts';
import { addComment } from '#lib/server/norn/comments.ts';

export const POST = api(
	async (caller, { params, request }) =>
		addComment(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'), await readJson(request)),
	201
);
