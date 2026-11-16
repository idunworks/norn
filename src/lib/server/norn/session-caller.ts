/** Turn a session's address into a Caller, or null when it may not sign in any more. */
import { isAllowed } from '../auth';
import type { Db } from '../db';
import type { Caller } from './caller';
import { ensureUser } from './users';
import type { Allowlist } from '../auth';

export function callerFor(db: Db, email: string | null, allowed: Allowlist, admins: Allowlist): Caller | null {
	// Taking an address off the allowlist ends its sessions at once.
	if (!email || !isAllowed(allowed, email)) return null;
	const user = ensureUser(db, email);
	return { userId: user.id, email: user.email, name: user.name, isAdmin: isAllowed(admins, email) };
}
