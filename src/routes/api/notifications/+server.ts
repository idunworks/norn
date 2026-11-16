import { api } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { listNotifications } from '$lib/server/norn/notifications';

export const GET = api((caller) => listNotifications(getDb(), caller));
