import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/server/instance';
import { listNotifications } from '$lib/server/norn/notifications';
import { requireSignedIn } from '$lib/server/pages';

export const load: LayoutServerLoad = (event) => {
	const caller = requireSignedIn(event);
	return {
		me: { id: caller.userId, name: caller.name, email: caller.email, is_admin: caller.isAdmin },
		notifications: listNotifications(getDb(), caller)
	};
};
