import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	type BrowserContext,
	chromium,
	type Page,
	test,
} from "@playwright/test";
import { logo } from "../../src/ui/icons.ts";
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
const LOGO_SIZE = 72;
const LOGO_COLORS = {
	light: { ink: "#1f2328", band: "#0969da" },
	dark: { ink: "#f0f6fc", band: "#4493f8" },
};
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

async function captureComposition(
	source: string,
	viewport: { width: number; height: number },
	path: string,
) {
	const browser = await chromium.launch({
		channel: "chromium",
		args: RENDERING_ARGS,
	});
	try {
		const page = await browser.newPage({ viewport });
		await page.goto(`file://${resolve(source)}`);
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({ path });
	} finally {
		await browser.close();
	}
}

test("captures the small promo tile for the store", () =>
	captureComposition(
		"tests/store/promo.html",
		PROMO_TILE,
		`${DIRECTORY}/promo-small.png`,
	));

const SITE_PUBLIC = "site/public";
const LINK_PREVIEW = { width: 1200, height: 630 };
const TOUCH_ICON = 180;

test("captures the link preview image for the landing page", () =>
	captureComposition(
		"tests/store/og.html",
		LINK_PREVIEW,
		`${SITE_PUBLIC}/og.png`,
	));

test("captures the touch icon for the landing page", async () => {
	const browser = await chromium.launch({
		channel: "chromium",
		args: RENDERING_ARGS,
	});
	try {
		const page = await browser.newPage({
			viewport: { width: TOUCH_ICON, height: TOUCH_ICON },
		});
		const { ink, band } = LOGO_COLORS.light;
		await page.setContent(
			`<style>html,body{margin:0;width:${TOUCH_ICON}px;height:${TOUCH_ICON}px;display:grid;place-items:center;background:#ffffff}.fh-logo{display:block;color:${ink}}.fh-logo-band{fill:${band}}</style>${logo(120)}`,
		);
		await page.screenshot({ path: `${SITE_PUBLIC}/apple-touch-icon.png` });
	} finally {
		await browser.close();
	}
});

const DEMO_CLIP = { x: 0, y: 222, width: 960, height: 540 };
const DEMO_BORDER = { light: "#d1d9e0", dark: "#3d444d" };

async function framed(page: Page, image: Buffer, theme: Theme) {
	await page.setViewportSize({
		width: DEMO_CLIP.width,
		height: DEMO_CLIP.height,
	});
	await page.setContent(
		`<style>html,body{margin:0;background:transparent}img{display:block;box-sizing:border-box;width:${DEMO_CLIP.width}px;height:${DEMO_CLIP.height}px;border:1px solid ${DEMO_BORDER[theme]};border-radius:12px}</style><img src="data:image/png;base64,${image.toString("base64")}">`,
	);
	return page.locator("img").screenshot({ omitBackground: true });
}

for (const theme of ["light", "dark"] as const)
	test(`captures the ${theme} demo image for the README`, async () => {
		const { context, close } = await launchExtension({
			allow: (url) => url.includes("githubassets.com") || url.includes(AVATARS),
			viewport: VIEWPORT,
			deviceScaleFactor: 2,
			colorScheme: theme,
		});
		try {
			const page = context.pages()[0] ?? (await context.newPage());
			await seedSettings(
				context,
				demoSettings({ activations: { [DEMO_KEY]: true } }),
			);
			await openPullRequest(page, theme);
			await menuButton(page).click();
			await page.waitForTimeout(600);
			const image = await page.screenshot({ clip: DEMO_CLIP });
			await writeFile(
				`${DIRECTORY}/readme-${theme}.png`,
				await framed(await context.newPage(), image, theme),
			);
		} finally {
			await close();
		}
	});

test("captures the logo for the README in both themes", async () => {
	const browser = await chromium.launch({
		channel: "chromium",
		args: RENDERING_ARGS,
	});
	try {
		const page = await browser.newPage({
			viewport: { width: LOGO_SIZE, height: LOGO_SIZE },
			deviceScaleFactor: 2,
		});
		for (const theme of ["light", "dark"] as const) {
			const { ink, band } = LOGO_COLORS[theme];
			await page.setContent(
				`<style>html,body{margin:0;background:transparent}.fh-logo{display:block;color:${ink}}.fh-logo-band{fill:${band}}</style>${logo(LOGO_SIZE)}`,
			);
			await page.locator("svg").screenshot({
				path: `${DIRECTORY}/readme-logo-${theme}.png`,
				omitBackground: true,
			});
		}
	} finally {
		await browser.close();
	}
});
