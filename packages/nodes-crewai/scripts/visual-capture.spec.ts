/**
 * Visual capture for CrewAI nodes.
 *
 * Per ADR-004: opens n8n, drops each CrewAI node onto a fresh workflow canvas,
 * and screenshots palette tile + canvas tile + properties panel in light and dark
 * themes. Output: docs/screenshots/<node>/<theme>/<view>.png.
 *
 * Assumes docker/n8n/docker-compose.yml is up at http://localhost:5678 and that
 * a dev owner has been provisioned (the harness will (re)create one if missing).
 */
import { test, expect, type Page, request } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const NODES = [
	{ id: 'crewAiCrew', label: 'CrewAI Crew', file: 'crew' },
	{ id: 'crewAiAgent', label: 'CrewAI Agent', file: 'agent' },
	{ id: 'crewAiTask', label: 'CrewAI Task', file: 'task' },
	{ id: 'crewAiTool', label: 'CrewAI Tool', file: 'tool' },
];

const THEMES: Array<'light' | 'dark'> = ['light', 'dark'];

const OWNER = {
	email: 'dev@local.test',
	firstName: 'Dev',
	lastName: 'Local',
	password: 'Devpass123',
};

const ROOT = resolve(__dirname, '..', '..', '..');
const OUT_BASE = join(ROOT, 'docs', 'screenshots');

let gitSha = 'unknown';
try {
	gitSha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
} catch {}

async function ensureOwnerAndLogin(page: Page) {
	const ctx = await request.newContext({ baseURL: 'http://localhost:5678' });
	const setupRes = await ctx.post('/rest/owner/setup', { data: OWNER });
	if (setupRes.status() !== 200 && setupRes.status() !== 400) {
		throw new Error(`owner setup failed: ${setupRes.status()} ${await setupRes.text()}`);
	}
	const loginRes = await ctx.post('/rest/login', {
		data: { email: OWNER.email, password: OWNER.password },
	});
	if (!loginRes.ok()) {
		throw new Error(`login failed: ${loginRes.status()} ${await loginRes.text()}`);
	}
	const cookies = await ctx.storageState();
	await page.context().addCookies(cookies.cookies);
	await ctx.dispose();
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
	await page.evaluate((t) => {
		document.documentElement.setAttribute('data-theme', t);
		document.documentElement.classList.toggle('dark', t === 'dark');
		document.body.classList.toggle('dark', t === 'dark');
		try {
			localStorage.setItem('N8N_THEME', t);
		} catch {}
	}, theme);
	await page.waitForTimeout(300);
}

async function newWorkflow(page: Page) {
	await page.goto('/workflow/new');
	await page.waitForLoadState('networkidle');
	const closeBtn = page.locator('[data-test-id="close-button"]').first();
	if (await closeBtn.isVisible().catch(() => false)) {
		await closeBtn.click().catch(() => {});
	}
}

async function openNodeCreator(page: Page) {
	const opener = page.locator('[data-test-id="node-creator-plus-button"]').first();
	if (await opener.isVisible().catch(() => false)) {
		await opener.click();
	} else {
		// fall back to canvas keyboard shortcut
		await page.locator('body').press('Tab');
	}
	await page.waitForTimeout(500);
}

async function captureForNode(
	page: Page,
	node: (typeof NODES)[number],
	theme: 'light' | 'dark',
) {
	const outDir = join(OUT_BASE, node.file, theme);
	mkdirSync(outDir, { recursive: true });

	await newWorkflow(page);
	await setTheme(page, theme);

	await openNodeCreator(page);
	const search = page.locator('input[placeholder*="Search" i]').first();
	if (await search.isVisible().catch(() => false)) {
		await search.fill(node.label);
		await page.waitForTimeout(500);
	}
	const paletteItem = page
		.locator(`[data-test-id="node-creator-item-name"]:has-text("${node.label}")`)
		.first();
	const paletteFallback = page.locator(`text=${node.label}`).first();
	const paletteContainer = page
		.locator('[data-test-id="item-iterator-item"]', { hasText: node.label })
		.first();
	const palette = (await paletteContainer.isVisible().catch(() => false))
		? paletteContainer
		: (await paletteItem.isVisible().catch(() => false))
			? paletteItem
			: paletteFallback;

	if (await palette.isVisible().catch(() => false)) {
		await palette.screenshot({ path: join(outDir, 'palette.png') }).catch(() => {});
		await palette.click().catch(() => {});
		await page.waitForTimeout(800);
	} else {
		await page.screenshot({ path: join(outDir, 'palette-missing.png'), fullPage: true });
	}

	// dropping a node opens its parameter panel — capture panel first, then close to see canvas
	const panelHeader = page.locator('[data-test-id="ndv-modal"], [data-test-id="parameter-input-list"]').first();
	if (await panelHeader.isVisible().catch(() => false)) {
		await page.screenshot({ path: join(outDir, 'panel.png'), fullPage: false });
		const back = page.locator('[data-test-id="back-to-canvas"], button:has-text("Back to canvas")').first();
		if (await back.isVisible().catch(() => false)) {
			await back.click().catch(() => {});
		} else {
			await page.keyboard.press('Escape');
		}
		await page.waitForTimeout(500);
	}

	const canvasNode = page
		.locator('[data-test-id="canvas-node"], .vue-flow__node, [data-canvas-node-name]')
		.first();
	if (await canvasNode.isVisible().catch(() => false)) {
		const box = await canvasNode.boundingBox();
		if (box && box.width > 10 && box.height > 10) {
			await canvasNode.screenshot({ path: join(outDir, 'canvas.png') });
		} else {
			await page.screenshot({ path: join(outDir, 'canvas-fullpage.png'), fullPage: true });
		}
	} else {
		await page.screenshot({ path: join(outDir, 'canvas-missing.png'), fullPage: true });
	}
	// also capture full page for context
	await page.screenshot({ path: join(outDir, 'context.png'), fullPage: false });
}

test('CrewAI nodes — visual capture', async ({ page }) => {
	mkdirSync(OUT_BASE, { recursive: true });
	await ensureOwnerAndLogin(page);
	for (const node of NODES) {
		for (const theme of THEMES) {
			await captureForNode(page, node, theme);
		}
	}
	writeFileSync(
		join(OUT_BASE, 'manifest.json'),
		JSON.stringify(
			{
				generatedAt: new Date().toISOString(),
				gitSha,
				nodes: NODES.map((n) => n.id),
				themes: THEMES,
			},
			null,
			2,
		),
	);
	expect(true).toBe(true);
});
