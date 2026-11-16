/**
 * One SQLite file holds everything. The schema is created on start and each
 * change is a numbered step (PRAGMA user_version), so an old file is brought
 * up to date in place. Ids are random UUIDs as text; times are ISO strings.
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seedExampleBoard } from './seed';

export type Db = Database.Database;

const MIGRATIONS: readonly string[] = [
	// Sign-in: emailed one-time links, the sessions they start, rate limits.
	// Links and sessions store only a SHA-256 of what the browser holds.
	`CREATE TABLE login_tokens (
		token_hash  TEXT PRIMARY KEY,
		email       TEXT NOT NULL,
		next        TEXT NOT NULL,
		expires_at  INTEGER NOT NULL,
		used_at     INTEGER,
		created_at  INTEGER NOT NULL
	);
	CREATE INDEX login_tokens_email ON login_tokens (email, created_at);

	CREATE TABLE sessions (
		id_hash     TEXT PRIMARY KEY,
		email       TEXT NOT NULL,
		expires_at  INTEGER NOT NULL,
		created_at  INTEGER NOT NULL
	);
	CREATE INDEX sessions_expiry ON sessions (expires_at);

	CREATE TABLE rate_limits (
		key          TEXT PRIMARY KEY,
		window_start INTEGER NOT NULL,
		count        INTEGER NOT NULL
	);

	CREATE TABLE users (
		id          TEXT PRIMARY KEY,
		email       TEXT NOT NULL UNIQUE,
		name        TEXT CHECK (name IS NULL OR length(name) <= 80),
		created_at  TEXT NOT NULL
	);`,

	// The board. User ids point at users(id); a removed user reads back as "unknown".
	`CREATE TABLE projects (
		id           TEXT PRIMARY KEY,
		name         TEXT NOT NULL,
		description  TEXT,
		created_by   TEXT,
		created_at   TEXT NOT NULL,
		archived_at  TEXT
	);

	CREATE TABLE project_members (
		project_id  TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
		user_id     TEXT NOT NULL,
		role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
		added_by    TEXT,
		created_at  TEXT NOT NULL,
		PRIMARY KEY (project_id, user_id)
	);
	CREATE INDEX project_members_user ON project_members (user_id);

	CREATE TABLE statuses (
		id          TEXT PRIMARY KEY,
		project_id  TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
		name        TEXT NOT NULL,
		position    INTEGER NOT NULL DEFAULT 0,
		is_done     INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0, 1)),
		created_at  TEXT NOT NULL
	);
	CREATE INDEX statuses_project ON statuses (project_id, position);

	CREATE TABLE issues (
		id                TEXT PRIMARY KEY,
		project_id        TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
		status_id         TEXT NOT NULL REFERENCES statuses (id) ON DELETE RESTRICT,
		title             TEXT NOT NULL,
		description       TEXT,
		kind              TEXT NOT NULL DEFAULT 'task' CHECK (kind IN ('task', 'bug')),
		assignee_id       TEXT,
		due_date          TEXT,
		position          INTEGER NOT NULL DEFAULT 0,
		estimate_minutes  INTEGER CHECK (estimate_minutes IS NULL OR estimate_minutes >= 0),
		actual_minutes    INTEGER CHECK (actual_minutes IS NULL OR actual_minutes >= 0),
		created_by        TEXT,
		created_at        TEXT NOT NULL,
		updated_at        TEXT NOT NULL
	);
	CREATE INDEX issues_board ON issues (project_id, status_id, position);

	CREATE TABLE comments (
		id          TEXT PRIMARY KEY,
		issue_id    TEXT NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
		author_id   TEXT,
		body        TEXT NOT NULL,
		created_at  TEXT NOT NULL
	);
	CREATE INDEX comments_issue ON comments (issue_id, created_at);

	CREATE TABLE activity (
		id          TEXT PRIMARY KEY,
		issue_id    TEXT NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
		project_id  TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
		actor_id    TEXT,
		kind        TEXT NOT NULL,
		data        TEXT NOT NULL DEFAULT '{}',
		created_at  TEXT NOT NULL
	);
	CREATE INDEX activity_issue ON activity (issue_id, created_at);

	CREATE TABLE notifications (
		id          TEXT PRIMARY KEY,
		user_id     TEXT NOT NULL,
		issue_id    TEXT REFERENCES issues (id) ON DELETE CASCADE,
		project_id  TEXT REFERENCES projects (id) ON DELETE CASCADE,
		-- A mention points at its comment, so deleting the comment deletes the mention.
		comment_id  TEXT REFERENCES comments (id) ON DELETE CASCADE,
		kind        TEXT NOT NULL CHECK (kind IN ('assigned', 'mention')),
		actor_id    TEXT,
		data        TEXT NOT NULL DEFAULT '{}',
		read_at     TEXT,
		created_at  TEXT NOT NULL
	);
	CREATE INDEX notifications_user ON notifications (user_id, created_at);`
];

/** Steps that need code, not just SQL: run after the SQL step of the same number. */
const AFTER_STEP: Readonly<Record<number, (db: Db) => void>> = {
	2: seedExampleBoard
};

/** Open (or create) the database file and bring its schema up to date. */
export function openDb(path: string): Db {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');
	// Lower-case for every alphabet (SQLite's lower() folds ASCII only); search uses it.
	db.function('norn_lower', { deterministic: true }, (value: unknown) =>
		typeof value === 'string' ? value.toLocaleLowerCase() : value
	);
	migrate(db);
	return db;
}

function migrate(db: Db): void {
	const current = db.pragma('user_version', { simple: true }) as number;
	for (let step = current; step < MIGRATIONS.length; step++) {
		db.transaction(() => {
			db.exec(MIGRATIONS[step]);
			AFTER_STEP[step + 1]?.(db);
			db.pragma(`user_version = ${step + 1}`);
		})();
	}
}
