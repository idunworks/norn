import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/instance';
import { listProjects } from '$lib/server/norn/projects';
import { requireSignedIn } from '$lib/server/pages';

export const load: PageServerLoad = (event) => ({ projects: listProjects(getDb(), requireSignedIn(event)) });
