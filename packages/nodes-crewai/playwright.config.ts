import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './scripts',
	timeout: 90_000,
	fullyParallel: false,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5678',
		viewport: { width: 1440, height: 900 },
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'visual-capture',
			testMatch: 'visual-capture.spec.ts',
		},
	],
});
