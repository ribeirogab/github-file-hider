import { expect, type Page, test } from "@playwright/test";
import { type PreviewServer, preview } from "vite";
import { copy } from "../../src/ui/copy";

const SITE = "https://github-file-hider.ribeiro.engineer/";

let server: PreviewServer;
let origin: string;

test.beforeAll(async () => {
	server = await preview({
		root: "site",
		logLevel: "silent",
		preview: { host: "127.0.0.1", port: 0, strictPort: false },
	});
	origin = (server.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
});

test.afterAll(async () => {
	await server.close();
});

async function openHome(page: Page) {
	const problems: string[] = [];
	const foreign: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") problems.push(message.text());
	});
	page.on("pageerror", (error) => problems.push(error.message));
	page.on("request", (request) => {
		if (!request.url().startsWith(origin)) foreign.push(request.url());
	});
	await page.addInitScript(() => {
		document.addEventListener("securitypolicyviolation", (event) => {
			console.error(`CSP ${event.violatedDirective} ${event.blockedURI}`);
		});
	});
	await page.goto(`${origin}/`);
	await page.evaluate(() => document.fonts.ready);
	return { problems, foreign };
}

const statusCount = (page: Page) => page.locator("#fh-status-count");

test("loads with no errors, no policy violations, and no third-party requests", async ({
	page,
}) => {
	const { problems, foreign } = await openHome(page);
	await page.waitForLoadState("networkidle");
	expect(problems).toEqual([]);
	expect(foreign).toEqual([]);
	await expect(
		page.locator('meta[http-equiv="Content-Security-Policy"]'),
	).toHaveAttribute("content", /script-src 'self'/);
});

test("starts the sandbox with the demo rules hiding 11 of 25 files", async ({
	page,
}) => {
	await openHome(page);
	await expect(page.locator("#fh-noun")).toHaveText(copy.filesHidden(11));
	await expect(statusCount(page)).toHaveText("11");
	await expect(page.locator("#ro-shown")).toHaveText("14");
	await expect(page.locator("#fh-menu")).toBeVisible();
});

test("updates the hidden count as the visitor changes rules", async ({
	page,
}) => {
	await openHome(page);
	await page.locator("label:has(#fh-p-tests)").click();
	await expect(statusCount(page)).toHaveText("3");
	await page.locator("#fh-custom-input").fill("docs/**");
	await page.locator("#fh-custom-input").press("Enter");
	await expect(statusCount(page)).toHaveText("5");
	await page.locator("#fh-custom-input").fill("/docs");
	await page.locator("#fh-custom-input").press("Enter");
	await expect(page.locator("#fh-custom-error")).toHaveText(
		copy.validation.leadingSlash,
	);
	await page.locator("#reset").click();
	await expect(statusCount(page)).toHaveText("11");
});

test("shows every file and offers to hide them again", async ({ page }) => {
	await openHome(page);
	await page.locator("#fh-show").click();
	await expect(page.locator("#fh-main-label")).toHaveText(copy.hideAgain);
	await expect(page.locator("#ro-shown")).toHaveText("25");
});

test("reveals a hidden file from the tree when the tree keeps every file", async ({
	page,
}) => {
	await openHome(page);
	await page.locator("#fh-tree").click();
	await page.locator('[data-file="pnpm-lock.yaml"]').click();
	const section = page.locator('section.df[data-path="pnpm-lock.yaml"]');
	await expect(section.locator(".fh-label")).toHaveText(copy.labelRevealed);
	await expect(section.locator(".fh-flash")).toContainText(copy.notice);
});

test("fits a phone screen with the menu closed", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await openHome(page);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
	await expect(page.locator("#fh-menu")).toBeHidden();
	await expect(statusCount(page)).toHaveText("11");
});

test("describes the page for search engines and link previews", async ({
	page,
	request,
}) => {
	await openHome(page);
	await expect(page).toHaveTitle(/GitHub File Hider/);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		SITE,
	);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		/Chrome extension/,
	);
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
		"content",
		`${SITE}og.png`,
	);
	const structured = JSON.parse(
		(await page.locator('script[type="application/ld+json"]').textContent()) ??
			"{}",
	);
	expect(structured["@type"]).toBe("SoftwareApplication");
	for (const [path, type] of [
		["/og.png", "image/png"],
		["/apple-touch-icon.png", "image/png"],
		["/favicon.svg", "image/svg+xml"],
	] as const) {
		const response = await request.get(`${origin}${path}`);
		expect(response.ok(), path).toBe(true);
		expect(response.headers()["content-type"]).toContain(type);
	}
	expect(await (await request.get(`${origin}/robots.txt`)).text()).toContain(
		`Sitemap: ${SITE}sitemap.xml`,
	);
	expect(await (await request.get(`${origin}/sitemap.xml`)).text()).toContain(
		`<loc>${SITE}</loc>`,
	);
});

test("has a not found page that links home", async ({ page }) => {
	await page.goto(`${origin}/404.html`);
	await expect(page.locator("h1")).toContainText("hidden");
	await expect(page.locator('a[href="/"]').first()).toBeVisible();
});
