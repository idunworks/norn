import { api, readJson } from '$lib/server/http';
import { getDb } from '$lib/server/instance';
import { setName } from '$lib/server/norn/users';
import { parse, schemas } from '$lib/server/norn/validate';

/** Set your own display name (what @mentions and avatars use). */
export const PATCH = api(async (caller, { request }) => {
	const { name } = parse(schemas.account, await readJson(request));
	return setName(getDb(), caller.userId, name);
});
