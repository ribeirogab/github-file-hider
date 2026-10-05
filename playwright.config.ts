import { defineConfig } from "@playwright/test";

export default defineConfig({
	workers: 1,
	timeout: 60_000,
	reporter: [["list"]],
	updateSnapshots: "none",
	use: { trace: "retain-on-failure" },
	projects: [
		{ name: "e2e", testDir: "tests/e2e" },
		{ name: "visual", testDir: "tests/visual", testMatch: "visual.spec.ts" },
		{
			name: "baseline",
			testDir: "tests/visual",
			testMatch: "baseline.spec.ts",
		},
		{ name: "store", testDir: "tests/store" },
		{ name: "site", testDir: "tests/site" },
	],
});
