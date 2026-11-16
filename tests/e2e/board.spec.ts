import { expect, test, type Page } from '@playwright/test';
import { clickUntil, cspErrors, setName, signedIn } from './helpers';

test.describe.configure({ mode: 'serial' });

let admin: Page;
let member: Page;
let boardUrl = '';

const columns = (page: Page) => page.locator('section[aria-label]');

test('people sign in with an emailed link; strangers get nothing', async ({ browser, request }) => {
	member = await signedIn(browser, 'asa@team.example');
	await setName(member, 'Åsa Member');
	admin = await signedIn(browser, 'ada@example.com');
	await setName(admin, 'Ada Admin');
	const res = await request.post('/api/auth/link', {
		headers: { Origin: 'http://localhost:4174' },
		data: { email: 'stranger@elsewhere.example' }
	});
	expect(res.status()).toBe(202);
});

test('an admin creates a project and adds a member', async () => {
	await admin.goto('/');
	await expect(admin.getByText('Getting started')).toBeVisible();
	await clickUntil(
		admin,
		() => admin.getByRole('button', { name: 'New project' }).click(),
		async () => (await admin.getByRole('dialog').count()) > 0
	);
	await admin.getByRole('dialog').locator('input').first().fill('Launch site');
	await admin.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
	await admin.waitForURL(/\/p\/[0-9a-f-]{36}$/);
	boardUrl = admin.url();
	await expect(columns(admin)).toHaveCount(4);

	await admin.getByPlaceholder('Account email').fill('asa@team.example');
	await admin.getByRole('button', { name: 'Add member' }).click();
	await expect(admin.getByTitle('asa@team.example')).toBeVisible();

	const first = columns(admin).first();
	await first.getByRole('button', { name: 'Add a card' }).click();
	for (const title of ['Write the copy', 'Pick a domain']) {
		await first.locator('textarea').fill(title);
		await first.locator('textarea').press('Enter');
		await expect(first.getByText(title)).toBeVisible();
	}
});

test('a member drags a card to another column, and it stays after a reload', async () => {
	await member.goto('/');
	await expect(member.getByText('Launch site')).toBeVisible();
	await expect(member.getByText('Getting started')).toHaveCount(0);
	await member.goto(boardUrl);
	await member.waitForLoadState('networkidle');
	const card = columns(member).first().getByText('Pick a domain');
	const target = columns(member).nth(2).locator('ul').first();
	const from = (await card.boundingBox())!;
	const to = (await target.boundingBox())!;
	await member.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await member.mouse.down();
	await member.mouse.move(from.x + 40, from.y + 10, { steps: 5 });
	await member.mouse.move(to.x + to.width / 2, to.y + 30, { steps: 15 });
	await member.waitForTimeout(400);
	await member.mouse.move(to.x + to.width / 2, to.y + 34, { steps: 3 });
	await member.mouse.up();
	await member.waitForTimeout(800);
	await member.reload();
	await expect(columns(member).nth(2).getByText('Pick a domain')).toBeVisible();
});

test('an estimate of "1,5h" saves and shows in the timeline', async () => {
	await clickUntil(
		member,
		() => member.getByText('Write the copy').click(),
		async () => (await member.getByRole('dialog').count()) > 0
	);
	const dialog = member.getByRole('dialog');
	await dialog.locator('#norn-estimate').fill('1,5h');
	await dialog.locator('#norn-estimate').blur();
	await expect(dialog.getByText('Saved')).toBeVisible();
	await expect(dialog.getByText(/set the estimate to 1 h 30 min/)).toBeVisible();
	await member.keyboard.press('Escape');
	await expect(member.getByRole('dialog')).toHaveCount(0);
});

test('an @mention reaches the member’s bell, and search finds the card', async () => {
	await admin.goto(boardUrl);
	await admin.waitForLoadState('networkidle');
	await clickUntil(
		admin,
		() => admin.getByText('Write the copy').click(),
		async () => (await admin.getByRole('dialog').count()) > 0
	);
	await admin.getByRole('dialog').locator('#norn-comment').fill('@åsa can you take this one?');
	await admin.getByRole('dialog').getByRole('button', { name: 'Comment', exact: true }).click();
	await expect(admin.getByRole('dialog').getByText('@åsa can you take this one?')).toBeVisible();

	await member.goto('/');
	await member.waitForLoadState('networkidle');
	const bell = member.getByRole('button', { name: 'Notifications' });
	await expect(bell).toHaveText('1');
	await clickUntil(
		member,
		() => bell.click(),
		async () => (await member.getByText('Ada Admin mentioned you in Write the copy').count()) > 0
	);

	await member.goto('/search?q=domain');
	await expect(member.getByText('Pick a domain')).toBeVisible();
});

test('someone who is not on the project gets 404', async ({ browser }) => {
	const outsider = await signedIn(browser, 'otto@team.example');
	const res = await outsider.goto(boardUrl);
	expect(res?.status()).toBe(404);
});

test('the API refuses a request from another site', async ({ request }) => {
	const res = await request.post('/api/projects', { headers: { Origin: 'https://evil.example' }, data: { name: 'x' } });
	expect(res.status()).toBe(403);
});

test('no page broke its Content-Security-Policy', () => {
	expect(cspErrors).toEqual([]);
});
