import { resolve } from "node:path";
import {
	type BrowserContext,
	chromium,
	type Page,
	test,
} from "@playwright/test";
import {
	FIXTURE_URLS,
	fixtureHtml,
	GITHUB_CSP,
	launchExtension,
	openSettings,
	RENDERING_ARGS,
	seedSettings,
} from "../support/extension.ts";
import { diffId, menuButton } from "../support/page.ts";
import { DEMO_KEY, demoSettings } from "../support/settings.ts";

type Theme = "light" | "dark";

type Screenshot = {
	name: string;
	theme: Theme;
	show: (page: Page, context: BrowserContext, theme: Theme) => Promise<void>;
};

const DIRECTORY = "store";
const VIEWPORT = { width: 1280, height: 800 };
const PROMO_TILE = { width: 440, height: 280 };
const CHANGES = FIXTURE_URLS["pr1-changes"];
const AVATARS = "avatars.githubusercontent.com";

async function openPullRequest(
	page: Page,
	theme: Theme,
	url: string = CHANGES,
) {
	const html = (await fixtureHtml("pr1-changes"))
		.replace('data-color-mode="dark"', `data-color-mode="${theme}"`)
		.replace(
			/<link data-color-theme="light" ([^>]*)data-href=/,
			'<link data-color-theme="light" $1href=',
		);
	const target = url.split("#")[0];
	await page.route(
		(candidate) => candidate.href.split("#")[0] === target,
		(route) =>
			route.fulfill({
				status: 200,
				contentType: "text/html; charset=utf-8",
				headers: {
					"content-security-policy": GITHUB_CSP.replace(
						"img-src 'self'",
						`img-src 'self' ${AVATARS}`,
					),
				},
				body: html,
			}),
	);
	await page.goto(url);
	await page.waitForTimeout(2500);
}

const SCREENSHOTS: Screenshot[] = [
	{
		name: "screenshot-1-menu",
		theme: "light",
		show: async (page, _context, theme) => {
			await openPullRequest(page, theme);
			await menuButton(page).click();
			await page.waitForTimeout(600);
		},
	},
	{
		name: "screenshot-2-hidden-files",
		theme: "dark",
		show: (page, _context, theme) => openPullRequest(page, theme),
	},
	{
		name: "screenshot-3-direct-link",
		theme: "light",
		show: (page, _context, theme) =>
			openPullRequest(
				page,
				theme,
				`${CHANGES}#${diffId("src/components/Button.spec.tsx")}`,
			),
	},
	{
		name: "screenshot-4-presets",
		theme: "light",
		show: (page, context) => openSettings(context, page, "presets"),
	},
	{
		name: "screenshot-5-custom-rules",
		theme: "dark",
		show: (page, context) => openSettings(context, page, "custom"),
	},
];

for (const screenshot of SCREENSHOTS)
	test(`captures ${screenshot.name} for the store`, async () => {
		const { context, close } = await launchExtension({
			allow: (url) => url.includes("githubassets.com") || url.includes(AVATARS),
			viewport: VIEWPORT,
			colorScheme: screenshot.theme,
		});
		try {
			const page = context.pages()[0] ?? (await context.newPage());
			await seedSettings(
				context,
				demoSettings({ activations: { [DEMO_KEY]: true } }),
			);
			await screenshot.show(page, context, screenshot.theme);
			await page.screenshot({ path: `${DIRECTORY}/${screenshot.name}.png` });
		} finally {
			await close();
		}
	});

test("captures the small promo tile for the store", async () => {
	const browser = await chromium.launch({
		channel: "chromium",
		args: RENDERING_ARGS,
	});
	try {
		const page = await browser.newPage({ viewport: PROMO_TILE });
		await page.goto(`file://${resolve("tests/store/promo.html")}`);
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({ path: `${DIRECTORY}/promo-small.png` });
	} finally {
		await browser.close();
	}
});
