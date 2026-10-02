import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
	type BrowserContext,
	test as base,
	chromium,
	type Page,
} from "@playwright/test";
export const demo = "https://github.com/ribeirogab/github-file-hider-demo/pull";
export async function fixture(name: string) {
	return gunzipSync(
		await readFile(resolve(`tests/fixtures/github/${name}.html.gz`)),
	).toString();
}
export async function navigate(
	page: Page,
	path = "/1/changes",
	name = "pr1-changes",
) {
	await page.context().route(`${demo}${path.split("#")[0]}`, async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: await fixture(name),
		});
	});
	await page.goto(`${demo}${path}`);
}
export const test = base.extend<{ extension: BrowserContext; page: Page }>({
	extension: async ({ browserName }, use) => {
		void browserName;
		const directory = await mkdtemp(join(tmpdir(), "file-hider-"));
		const extension = resolve("dist");
		const context = await chromium.launchPersistentContext(directory, {
			channel: "chromium",
			headless: true,
			args: [
				`--disable-extensions-except=${extension}`,
				`--load-extension=${extension}`,
			],
		});
		await context.route("**/*", async (route) => {
			await route.abort();
		});
		await use(context);
		await context.close();
		await rm(directory, { recursive: true, force: true });
	},
	page: async ({ extension }, use) => {
		const page = await extension.newPage();
		await use(page);
	},
});
export { expect } from "@playwright/test";
