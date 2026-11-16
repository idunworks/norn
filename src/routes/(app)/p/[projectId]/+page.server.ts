import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/instance';
import { getBoard } from '$lib/server/norn/projects';
import { forPage, requireSignedIn } from '$lib/server/pages';
import { pathId } from '$lib/server/norn/validate';

export const load: PageServerLoad = (event) => {
	const caller = requireSignedIn(event);
	return { board: forPage(() => getBoard(getDb(), caller, pathId(event.params.projectId, 'Project'))) };
};
