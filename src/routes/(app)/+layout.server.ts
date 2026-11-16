import type { LayoutServerLoad } from './$types';
import { getDb } from '#lib/server/instance.ts';
import { listNotifications } from '#lib/server/norn/notifications.ts';
import { requireSignedIn } from '#lib/server/pages.ts';

export const load: LayoutServerLoad = (event) => {
	const caller = requireSignedIn(event);
	return {
		me: { id: caller.userId, name: caller.name, email: caller.email, is_admin: caller.isAdmin },
		notifications: listNotifications(getDb(), caller)
	};
};
