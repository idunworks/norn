import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { createProject, listProjects } from '$lib/server/norn/projects';

export const GET = api((caller) => listProjects(getDb(), caller));
export const POST = api(async (caller, { request }) => createProject(getDb(), caller, await readJson(request)), 201);
