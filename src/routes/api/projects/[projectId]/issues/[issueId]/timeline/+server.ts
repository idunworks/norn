import { api } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { timeline } from '#lib/server/norn/comments.ts';
import { pathId } from '#lib/server/norn/validate.ts';

export const GET = api((caller, { params }) =>
	timeline(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'))
);
