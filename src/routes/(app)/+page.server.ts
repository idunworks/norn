import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/instance.ts';
import { listProjects } from '#lib/server/norn/projects.ts';
import { requireSignedIn } from '#lib/server/pages.ts';

export const load: PageServerLoad = (event) => ({ projects: listProjects(getDb(), requireSignedIn(event)) });
