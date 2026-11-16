import { defineEnvVars } from '@sveltejs/kit/env';

// Every setting is optional and read at runtime (see config.example.env).
// Unset or empty means undefined, as before SvelteKit 3: the code's own
// defaults apply (an empty NORN_DATABASE must never reach openDb as '', which
// better-sqlite3 would open as a throwaway temporary database).
const optional = { schema: (input: string | undefined) => input || undefined };

export const variables = defineEnvVars({
	NORN_LANG: optional,
	NORN_ALLOWED_EMAILS: optional,
	NORN_ADMIN_EMAILS: optional,
	ORIGIN: optional,
	NORN_SMTP_URL: optional,
	NORN_MAIL_FROM: optional,
	NORN_MAIL_CONSOLE: optional,
	NORN_DATABASE: optional
});
