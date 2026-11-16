import { readFileSync } from 'node:fs';
import { expect, type Browser, type Page } from '@playwright/test';

/** Every email the console mailer has written for `address`, oldest first. */
function mailsTo(address: string): string[] {
	return readFileSync('e2e-data/server.log', 'utf8')
		.split('norn: email to ')
		.filter((m) => m.startsWith(address));
}

/** The sign-in link in the newest email to `address`, waiting for it to arrive. */
async function signInLink(address: string): Promise<string> {
	let link: string | undefined;
	await expect
		.poll(() => (link = mailsTo(address).at(-1)?.match(/http:\/\/\S+\/auth#token=[A-Za-z0-9_-]{43}/)?.[0]))
		.toBeTruthy();
	return link as string;
}

/** Content-Security-Policy complaints from every page signed in through `signedIn`. */
export const cspErrors: string[] = [];

/** Sign in through the real pages, in a browser context of its own. */
export async function signedIn(browser: Browser, address: string): Promise<Page> {
	const page = await (await browser.newContext()).newPage();
	page.on('console', (m) => {
		if (/Content Security Policy|Refused to/.test(m.text())) cspErrors.push(m.text());
	});
	await page.goto('/auth');
	await page.getByLabel('Email address').fill(address);
	await page.getByRole('button', { name: 'Send sign-in link' }).click();
	await expect(page.getByText('Check your inbox')).toBeVisible();
	await page.goto(await signInLink(address));
	// The token is scrubbed from the address bar (and history) at once.
	await expect(page).not.toHaveURL(/#token=/);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL((url) => url.pathname === '/');
	return page;
}

/** Set the display name on /account. */
export async function setName(page: Page, name: string): Promise<void> {
	await page.goto('/account');
	await page.getByLabel('Display name').fill(name);
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByText('Saved')).toBeVisible();
}

/** Click until the page has hydrated and the click has an effect. */
export async function clickUntil(page: Page, click: () => Promise<void>, done: () => Promise<boolean>): Promise<void> {
	for (let i = 0; i < 10 && !(await done()); i++) {
		await click();
		await page.waitForTimeout(300);
	}
	expect(await done()).toBe(true);
}
