import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
	type BrowserContext,
	test as base,
	chromium,
	expect,
	type Page,
	type Worker,
} from "@playwright/test";
import type { Settings } from "../../src/settings";

export const DEMO = "https://github.com/ribeirogab/github-file-hider-demo";

export const FIXTURE_URLS = {
	"pr1-changes": `${DEMO}/pull/1/changes`,
	"pr1-commit": `${DEMO}/pull/1/changes/e398fbd9e231722d3da3a7c3665efc43797fb3e1`,
	"pr1-range": `${DEMO}/pull/1/changes/e3caccf28a9c0ad74ccf4cfad449a36e58cb081e..b4877d0616704e3775667dc3a8d3ae53ad36167d`,
	"pr1-conversation": `${DEMO}/pull/1`,
	"pr1-classic": `${DEMO}/pull/1/files`,
	"pr2-changes": `${DEMO}/pull/2/changes`,
	"pr2-changes-scrolled": `${DEMO}/pull/2/changes`,
	"pr3-optimized": `${DEMO}/pull/3/changes`,
	"pr3-single-file": `${DEMO}/pull/3/changes?mode=single`,
	"pr3-single-file-next": `${DEMO}/pull/3/changes?mode=single`,
} as const;

export type FixtureName = keyof typeof FIXTURE_URLS;

const cache = new Map<FixtureName, string>();

export async function fixtureHtml(name: FixtureName) {
	let html = cache.get(name);
	if (!html) {
		html = gunzipSync(
			await readFile(resolve(`tests/fixtures/github/${name}.html.gz`)),
		).toString();
		cache.set(name, html);
	}
	return html;
}

export const GITHUB_CSP =
	"default-src 'none'; base-uri 'self'; font-src github.githubassets.com; img-src 'self' data: github.githubassets.com; style-src 'unsafe-inline' github.githubassets.com; script-src github.githubassets.com; connect-src 'self'";

export async function serveFixture(
	page: Page,
	name: FixtureName,
	url: string = FIXTURE_URLS[name],
) {
	const target = url.split("#")[0] ?? url;
	await page.route(
		(candidate) => candidate.href.split("#")[0] === target,
		async (route) =>
			route.fulfill({
				status: 200,
				contentType: "text/html; charset=utf-8",
				headers: { "content-security-policy": GITHUB_CSP },
				body: await fixtureHtml(name),
			}),
	);
}

export async function openFixture(
	page: Page,
	name: FixtureName,
	url: string = FIXTURE_URLS[name],
) {
	await serveFixture(page, name, url);
	await page.goto(url);
}

export async function replaceDocument(
	page: Page,
	name: FixtureName,
	url: string = FIXTURE_URLS[name],
) {
	const html = await fixtureHtml(name);
	await page.evaluate(
		({ html, url }) => {
			const next = new DOMParser().parseFromString(html, "text/html");
			history.pushState({}, "", url);
			document.body.replaceWith(document.adoptNode(next.body));
		},
		{ html, url },
	);
}

export async function serviceWorker(context: BrowserContext): Promise<Worker> {
	const [worker] = context.serviceWorkers();
	return worker ?? context.waitForEvent("serviceworker");
}

export const extensionId = async (context: BrowserContext) =>
	new URL((await serviceWorker(context)).url()).host;

export async function seedSettings(context: BrowserContext, settings: unknown) {
	const worker = await serviceWorker(context);
	await worker.evaluate(
		(value) => chrome.storage.local.set({ settings: value }),
		settings,
	);
}

export async function storedSettings(
	context: BrowserContext,
): Promise<Settings> {
	const worker = await serviceWorker(context);
	return worker.evaluate(
		async () =>
			(await chrome.storage.local.get("settings")).settings as Settings,
	);
}

export const RENDERING_ARGS = [
	"--disable-gpu",
	"--disable-partial-raster",
	"--force-color-profile=srgb",
];

export async function launchExtension(options: {
	colorScheme?: "light" | "dark";
	allow?: (url: string) => boolean;
	viewport?: { width: number; height: number };
	deviceScaleFactor?: number;
	reducedMotion?: boolean;
}) {
	const directory = await mkdtemp(join(tmpdir(), "github-file-hider-"));
	const extension = resolve("dist");
	const context = await chromium.launchPersistentContext(directory, {
		channel: "chromium",
		headless: true,
		colorScheme: options.colorScheme ?? "light",
		reducedMotion: options.reducedMotion ? "reduce" : "no-preference",
		viewport: options.viewport ?? { width: 1440, height: 900 },
		deviceScaleFactor: options.deviceScaleFactor ?? 1,
		args: [
			...RENDERING_ARGS,
			"--enable-unsafe-extension-debugging",
			`--disable-extensions-except=${extension}`,
			`--load-extension=${extension}`,
		],
	});
	await context.route("**/*", async (route) => {
		const url = route.request().url();
		if (url.startsWith("chrome-extension://") || options.allow?.(url))
			await route.continue();
		else await route.abort();
	});
	return {
		context,
		close: async () => {
			await context.close();
			await rm(directory, { recursive: true, force: true });
		},
	};
}

export const test = base.extend<{
	extension: BrowserContext;
	page: Page;
	pageErrors: string[];
}>({
	pageErrors: async ({ browserName }, use) => {
		void browserName;
		await use([]);
	},
	extension: async ({ pageErrors }, use) => {
		const { context, close } = await launchExtension({ reducedMotion: true });
		context.on("page", (page) =>
			page.on("pageerror", (error) => pageErrors.push(error.message)),
		);
		await use(context);
		expect(pageErrors).toEqual([]);
		await close();
	},
	page: async ({ extension }, use) => {
		const page = extension.pages()[0] ?? (await extension.newPage());
		await use(page);
	},
});

export { expect } from "@playwright/test";

export async function clickExtensionIcon(context: BrowserContext) {
	const browser = context.browser();
	if (!browser) throw new Error("The extension context has no browser");
	const session = await browser.newBrowserCDPSession();
	const { targetInfos } = (await session.send("Target.getTargets", {
		filter: [{ type: "tab" }],
	} as never)) as { targetInfos: { targetId: string }[] };
	const id = await extensionId(context);
	await session.send(
		"Extensions.triggerAction" as never,
		{
			id,
			targetId: targetInfos[0]?.targetId,
		} as never,
	);
	await session.detach();
}

export async function openSettings(
	context: BrowserContext,
	page: Page,
	hash = "general",
) {
	await page.goto(
		`chrome-extension://${await extensionId(context)}/settings.html#${hash}`,
	);
	await page.locator("html[data-ready]").waitFor({ state: "attached" });
}
