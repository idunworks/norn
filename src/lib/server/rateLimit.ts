/**
 * A fixed-window counter per key, kept in the database so a restart doesn't
 * reset it and every process sharing the file sees the same counts.
 */
import type { Db } from './db';

export interface Budget {
	max: number;
	windowMs: number;
}

/** Spend one request from `key`'s budget. Returns false when it's used up. */
export function allow(db: Db, key: string, budget: Budget, now: number): boolean {
	return db
		.transaction((): boolean => {
			const row = db.prepare(`SELECT window_start, count FROM rate_limits WHERE key = ?`).get(key) as
				| { window_start: number; count: number }
				| undefined;
			if (!row || now - row.window_start >= budget.windowMs) {
				db.prepare(
					`INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
					 ON CONFLICT (key) DO UPDATE SET window_start = excluded.window_start, count = 1`
				).run(key, now);
				return true;
			}
			if (row.count >= budget.max) return false;
			db.prepare(`UPDATE rate_limits SET count = count + 1 WHERE key = ?`).run(key);
			return true;
		})
		.immediate();
}

/** Forget windows that ended long ago. */
export function pruneRateLimits(db: Db, now: number, olderThanMs: number): void {
	db.prepare(`DELETE FROM rate_limits WHERE window_start < ?`).run(now - olderThanMs);
}
