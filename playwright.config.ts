import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the production build, on a fresh database each run.
 * Sign-in emails go to the console mailer, which writes them to
 * e2e-data/server.log; the tests read their links from there.
 *
 * Run: pnpm build && pnpm test:e2e
 */
const PORT = 4174;

export default defineConfig({
	testDir: 'tests/e2e',
	// One worker, in file order: the sign-in rate limit counts every request from 127.0.0.1.
	workers: 1,
	fullyParallel: false,
	retries: 0,
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		...devices['Desktop Chrome'],
		viewport: { width: 1440, height: 900 },
		locale: 'en-US'
	},
	webServer: {
		command: 'rm -rf e2e-data && mkdir e2e-data && node build 2>&1 | tee e2e-data/server.log',
		url: `http://localhost:${PORT}/auth`,
		reuseExistingServer: false,
		env: {
			PORT: String(PORT),
			ORIGIN: `http://localhost:${PORT}`,
			NORN_DATABASE: 'e2e-data/norn.db',
			NORN_ALLOWED_EMAILS: 'ada@example.com,@team.example',
			NORN_ADMIN_EMAILS: 'ada@example.com',
			NORN_MAIL_CONSOLE: 'true'
		}
	}
});
