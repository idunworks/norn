import type { PageServerLoad } from './$types';
import { requireSignedIn } from '$lib/server/pages';

export const load: PageServerLoad = (event) => {
	const caller = requireSignedIn(event);
	return { account: { email: caller.email, name: caller.name ?? '' } };
};
