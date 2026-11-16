import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { createProject, listProjects } from '#lib/server/norn/projects.ts';

export const GET = api((caller) => listProjects(getDb(), caller));
export const POST = api(async (caller, { request }) => createProject(getDb(), caller, await readJson(request)), 201);
