/**
 * The app's single database connection and its housekeeping timer.
 * Everything else takes the connection as an argument, which keeps it testable.
 */
import { NORN_DATABASE } from '$app/env/private';
import { pruneAuth } from './auth';
import { openDb, type Db } from './db';
import { pruneRateLimits } from './rateLimit';

const HOUSEKEEPING_EVERY_MS = 10 * 60 * 1000;
const RATE_LIMIT_MEMORY_MS = 24 * 60 * 60 * 1000;

let db: Db | null = null;

export function getDb(): Db {
	if (!db) {
		db = openDb(NORN_DATABASE ?? './data/norn.db');
		housekeeping(db);
		setInterval(() => housekeeping(db as Db), HOUSEKEEPING_EVERY_MS).unref();
	}
	return db;
}

function housekeeping(conn: Db): void {
	const now = Date.now();
	pruneRateLimits(conn, now, RATE_LIMIT_MEMORY_MS);
	pruneAuth(conn, now);
	conn.pragma('wal_checkpoint(TRUNCATE)');
}
