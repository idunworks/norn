import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { markRead } from '$lib/server/norn/notifications';

export const POST = api(async (caller, { request }) => markRead(getDb(), caller, await readJson(request)));
