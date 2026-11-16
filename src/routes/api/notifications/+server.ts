import { api } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { listNotifications } from '#lib/server/norn/notifications.ts';

export const GET = api((caller) => listNotifications(getDb(), caller));
