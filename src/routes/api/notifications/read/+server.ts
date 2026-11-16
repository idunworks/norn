import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { markRead } from '#lib/server/norn/notifications.ts';

export const POST = api(async (caller, { request }) => markRead(getDb(), caller, await readJson(request)));
