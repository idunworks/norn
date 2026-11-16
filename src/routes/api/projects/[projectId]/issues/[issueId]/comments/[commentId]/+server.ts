import { api } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { deleteComment } from '$lib/server/norn/comments';
import { pathId } from '$lib/server/norn/validate';

export const DELETE = api((caller, { params }) =>
	deleteComment(
		getDb(),
		caller,
		pathId(params.projectId, 'Project'),
		pathId(params.issueId, 'Issue'),
		pathId(params.commentId, 'Comment')
	)
);
