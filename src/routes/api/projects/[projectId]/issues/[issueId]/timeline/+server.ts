import { api } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { timeline } from '$lib/server/norn/comments';
import { pathId } from '$lib/server/norn/validate';

export const GET = api((caller, { params }) =>
	timeline(getDb(), caller, pathId(params.projectId, 'Project'), pathId(params.issueId, 'Issue'))
);
