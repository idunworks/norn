import { api, readJson } from '#lib/server/http.ts';
import { getDb } from '#lib/server/instance.ts';
import { setName } from '#lib/server/norn/users.ts';
import { parse, schemas } from '#lib/server/norn/validate.ts';

/** Set your own display name (what @mentions and avatars use). */
export const PATCH = api(async (caller, { request }) => {
	const { name } = parse(schemas.account, await readJson(request));
	return setName(getDb(), caller.userId, name);
});
