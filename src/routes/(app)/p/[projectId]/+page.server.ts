import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/instance.ts';
import { getBoard } from '#lib/server/norn/projects.ts';
import { forPage, requireSignedIn } from '#lib/server/pages.ts';
import { pathId } from '#lib/server/norn/validate.ts';

export const load: PageServerLoad = (event) => {
	const caller = requireSignedIn(event);
	return { board: forPage(() => getBoard(getDb(), caller, pathId(event.params.projectId, 'Project'))) };
};
