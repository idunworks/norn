import { api } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { deleteComment } from '#lib/server/norn/comments.ts';
import { pathId } from '#lib/server/norn/validate.ts';

export const DELETE = api((caller, { params }) =>
	deleteComment(
		getDb(),
		caller,
		pathId(params.projectId, 'Project'),
		pathId(params.issueId, 'Issue'),
		pathId(params.commentId, 'Comment')
	)
);
