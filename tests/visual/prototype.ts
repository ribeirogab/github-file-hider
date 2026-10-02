import type { Page } from "@playwright/test";
import type { HarnessState, Rect } from "./harness.ts";
import { MONA_SANS_CSS } from "./server.ts";

export type Theme = "light" | "dark";

export const THEMES: Theme[] = ["light", "dark"];

export const VIEWPORT = { width: 1440, height: 900 };

export const SETTINGS_VIEWPORT = { width: 1440, height: 1600 };

export const SCALE = 2;

export type PrototypeState = {
	mode: "manual" | "automatic";
	treeFiltering: boolean;
	presets: Record<
		"tests" | "lockfiles",
		{ enabled: boolean; rules?: string[] }
	>;
	customRules: { id: string; pattern: string; enabled: boolean }[];
	alwaysShow: { id: string; pattern: string }[];
	activePRs: Record<string, true>;
};

export const firstInstall = (): PrototypeState => ({
	mode: "manual",
	treeFiltering: true,
	presets: { tests: { enabled: false }, lockfiles: { enabled: false } },
	customRules: [],
	alwaysShow: [],
	activePRs: {},
});

export const demo = (): PrototypeState => ({
	...firstInstall(),
	presets: { tests: { enabled: true }, lockfiles: { enabled: true } },
	customRules: [
		{ id: "generated", pattern: "**/generated/**", enabled: true },
		{ id: "docs", pattern: "docs/**", enabled: false },
	],
	alwaysShow: [{ id: "checkout", pattern: "src/payments/checkout.spec.ts" }],
});

export const NO_MOTION =
	"*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }";

export async function routeFonts(page: Page, origin: string) {
	await page.route("https://fonts.googleapis.com/**", (route) =>
		route.fulfill({
			contentType: "text/css",
			body: route.request().url().includes("wdth") ? MONA_SANS_CSS(origin) : "",
		}),
	);
	await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
}

export async function openPrototype(
	page: Page,
	origin: string,
	options: {
		screen: "github" | "settings";
		theme: Theme;
		state: PrototypeState;
		pr?: number;
	},
) {
	await routeFonts(page, origin);
	const url = `${origin}/design/prototype/index.html?screen=${options.screen}${options.pr ? `&pr=${options.pr}` : ""}`;
	await page.goto(url);
	await page.evaluate(
		({ state, theme, screen }) => {
			localStorage.clear();
			localStorage.setItem("fh-proto:prototype", JSON.stringify(state));
			localStorage.setItem("fh-proto-theme:prototype", theme);
			localStorage.setItem("fh-proto-screen:prototype", screen);
		},
		{ state: options.state, theme: options.theme, screen: options.screen },
	);
	await page.goto(url);
	await page.addStyleTag({ content: NO_MOTION });
	await page.evaluate(async () => {
		await document.fonts.load('500 12px "Mona Sans"');
		await document.fonts.ready;
	});
}

export async function prototypeState(page: Page): Promise<HarnessState> {
	return page.evaluate(() => {
		const w = window as unknown as {
			FH: {
				state: PrototypeState;
				detail: { prKey: string; showingAll: boolean; revealed: string[] };
			};
			GH: { paths: string[] };
		};
		const { activePRs, ...rest } = w.FH.state;
		return {
			settings: { ...rest, activations: activePRs },
			paths: w.GH.paths,
			pullRequestKey: w.FH.detail.prKey,
			showingAll: w.FH.detail.showingAll,
			revealed: w.FH.detail.revealed,
		};
	});
}

export async function prototypeDetail(page: Page) {
	return page.evaluate(() => {
		const w = window as unknown as {
			FH: { detail: { hiddenCount: number; matchCount: number } };
		};
		return {
			hiddenCount: w.FH.detail.hiddenCount,
			matchCount: w.FH.detail.matchCount,
		};
	});
}

export async function isolate(page: Page, selectors: string[]) {
	await page.evaluate((list) => {
		const targets = list.flatMap((selector) => [
			...document.querySelectorAll(selector),
		]);
		const keep = new Set<Element>();
		for (const target of targets) {
			let node: Element | null = target;
			while (node) {
				keep.add(node);
				node = node.parentElement;
			}
		}
		for (const node of keep) {
			if (targets.includes(node)) continue;
			for (const child of node.children)
				if (!keep.has(child) && child instanceof HTMLElement)
					child.style.setProperty("visibility", "hidden", "important");
		}
	}, selectors);
}

export async function backgroundOf(page: Page, selector: string) {
	return page
		.locator(selector)
		.first()
		.evaluate((element) => {
			let node: Element | null = element;
			while (node) {
				const color = getComputedStyle(node).backgroundColor;
				if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent")
					return color;
				node = node.parentElement;
			}
			return getComputedStyle(document.documentElement).backgroundColor;
		});
}

export type Layer = {
	rect: Rect;
	background: string;
	position: string;
	top: string;
	zIndex: string;
	border: string[];
};

export async function layerOf(
	page: Page,
	selector: string,
): Promise<Layer | null> {
	return page
		.locator(selector)
		.first()
		.evaluate((element) => {
			let node: Element | null = element.parentElement;
			while (node && node !== document.body) {
				const style = getComputedStyle(node);
				if (
					style.position === "sticky" ||
					style.position === "fixed" ||
					style.transform !== "none" ||
					style.willChange !== "auto"
				) {
					const rect = node.getBoundingClientRect();
					return {
						rect: {
							x: rect.x,
							y: rect.y,
							width: rect.width,
							height: rect.height,
						},
						background: style.backgroundColor,
						position: style.position,
						top: style.top,
						zIndex: style.zIndex,
						border: ["top", "right", "bottom", "left"].map(
							(side) =>
								`${style.getPropertyValue(`border-${side}-width`)} ${style.getPropertyValue(`border-${side}-style`)} ${style.getPropertyValue(`border-${side}-color`)}`,
						),
					};
				}
				node = node.parentElement;
			}
			return null;
		});
}

export async function rectOf(page: Page, selector: string): Promise<Rect> {
	const box = await page
		.locator(selector)
		.first()
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
		});
	return box;
}

export function union(rects: Rect[], padding: number): Rect {
	const left = Math.floor(Math.min(...rects.map((r) => r.x)) - padding);
	const top = Math.floor(Math.min(...rects.map((r) => r.y)) - padding);
	const right = Math.ceil(
		Math.max(...rects.map((r) => r.x + r.width)) + padding,
	);
	const bottom = Math.ceil(
		Math.max(...rects.map((r) => r.y + r.height)) + padding,
	);
	return { x: left, y: top, width: right - left, height: bottom - top };
}
