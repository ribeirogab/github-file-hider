import type { BrowserContext, Page } from "@playwright/test";
import { extensionId, seedSettings } from "../support/extension.ts";
import type { HarnessState, Part, Rect } from "./harness.ts";
import {
	backgroundOf,
	demo,
	firstInstall,
	isolate,
	isolateBare,
	layerOf,
	NO_MOTION,
	openPrototype,
	type PrototypeState,
	prototypeState,
	rectOf,
	type Theme,
	union,
} from "./prototype.ts";

export type Recorded = {
	clip: Rect;
	scroll?: { x: number; y: number };
	background: string;
	parts: Part[];
	state?: HarnessState;
};

export type SceneContext = { origin: string; theme: Theme };

export type Scene = {
	name: string;
	surface: "page" | "settings";
	prototype: (page: Page, context: SceneContext) => Promise<Recorded>;
	extension: (
		page: Page,
		context: SceneContext & { recorded: Recorded; browser: BrowserContext },
	) => Promise<Rect | undefined>;
};

export type Side = "prototype" | "extension";

const TARGETS = {
	control: ".fh-ctl",
	main: ".fh-ctl .fh-ctl-main",
	caret: ".fh-ctl .fh-ctl-menu",
	menu: "#fh-menu",
	tooltip: "#fh-tooltip.is-open",
	blankslate: ".fh-blankslate",
	blankslateShowAll: '.fh-blankslate [data-fh-act="show-all"]',
	blankslateEdit: '.fh-blankslate [data-fh-act="edit-rules"]',
	treeEmpty: ".fh-tree-empty",
	treeEmptyShowAll: '.fh-tree-empty [data-fh-act="show-all"]',
	notice: ".fh-flash[data-fh-notice]",
	noticeHide: '.fh-flash [data-fh-act="hide-revealed"]',
	revealedLabel: '.fh-file-label[data-kind="revealed"]',
	keptLabel: '.fh-file-label[data-kind="kept"]',
	hiddenHint: '.fh-tree-hint[data-kind="hidden"]',
	revealedHint: '.fh-tree-hint[data-kind="revealed"]',
} as const;

type Target = keyof typeof TARGETS | `item:${string}`;

type Component =
	| "control"
	| "blankslate"
	| "treeEmpty"
	| "notice"
	| "revealedLabel"
	| "keptLabel"
	| "hiddenHint"
	| "revealedHint";

const IN_REPLICA = new Set<string>([
	"control",
	"main",
	"caret",
	"blankslate",
	"blankslateShowAll",
	"blankslateEdit",
	"treeEmpty",
	"treeEmptyShowAll",
	"notice",
	"noticeHide",
	"revealedLabel",
	"keptLabel",
	"hiddenHint",
	"revealedHint",
]);

export function selector(side: Side, target: Target) {
	if (target.startsWith("item:"))
		return `#fh-menu [data-key="${target.slice(5)}"]`;
	const css = TARGETS[target as keyof typeof TARGETS];
	return side === "prototype" && IN_REPLICA.has(target) ? `#gh ${css}` : css;
}

export type Step =
	| { click: Target }
	| { hover: Target }
	| { focus: Target }
	| { press: string }
	| { wait: number };

async function run(page: Page, side: Side, steps: Step[]) {
	for (const step of steps) {
		if ("click" in step)
			await page.locator(selector(side, step.click)).first().click();
		if ("hover" in step) {
			await page.locator(selector(side, step.hover)).first().hover();
			await page.waitForTimeout(600);
		}
		if ("focus" in step) {
			await page.keyboard.press("Shift");
			await page.locator(selector(side, step.focus)).first().focus();
			await page.waitForTimeout(200);
		}
		if ("press" in step) {
			await page.keyboard.press(step.press);
			await page.waitForTimeout(100);
		}
		if ("wait" in step) await page.waitForTimeout(step.wait);
	}
	await page.waitForTimeout(400);
}

type HarnessApi = {
	setTheme: (theme: Theme) => void;
	backdrop: (
		rect: Rect,
		color: string,
		scroll?: { x: number; y: number },
	) => void;
	fontsReady: () => Promise<void>;
	mount: (state: HarnessState, parts: Part[]) => void;
};

async function openHarness(
	page: Page,
	origin: string,
	theme: Theme,
	recorded: Recorded,
) {
	await page.goto(`${origin}/tests/visual/harness.html`);
	await page.addStyleTag({ content: NO_MOTION });
	await page.evaluate(
		async ({ theme, recorded }) => {
			const { harness } = window as unknown as { harness: HarnessApi };
			harness.setTheme(theme);
			harness.backdrop(recorded.clip, recorded.background, recorded.scroll);
			await harness.fontsReady();
		},
		{ theme, recorded },
	);
}

async function partOf(page: Page, component: Component): Promise<Part> {
	const css = selector("prototype", component);
	const meta = await page
		.locator(css)
		.first()
		.evaluate((element) => {
			const path =
				(element as HTMLElement).dataset.fhNotice ??
				element.closest<HTMLElement>("[data-path]")?.dataset.path ??
				"";
			let parent = element.parentElement;
			while (parent && getComputedStyle(parent).display === "contents")
				parent = parent.parentElement;
			const style = parent ? getComputedStyle(parent) : null;
			return {
				...(element as HTMLElement).dataset,
				path,
				parentDisplay: style?.display ?? "block",
				parentDirection: style?.flexDirection ?? "row",
				parentAlign: style?.alignItems ?? "normal",
			} as Record<string, string>;
		});
	return {
		component,
		rect: await rectOf(page, css),
		layer: await layerOf(page, css),
		meta,
	};
}

function pageScene(options: {
	name: string;
	state: () => PrototypeState;
	bare?: boolean;
	scenario?: string;
	reveal?: Component;
	steps?: Step[];
	mount?: Component[];
	capture: Target[];
	padding?: number;
}): Scene {
	const steps = options.steps ?? [];
	const mount = options.mount ?? ["control"];
	const padding = options.padding ?? 8;
	return {
		name: options.name,
		surface: "page",
		async prototype(page, { origin, theme }) {
			await openPrototype(page, origin, {
				screen: "github",
				theme,
				state: options.state(),
			});
			if (options.bare)
				await page.addStyleTag({
					content:
						".gh-file-header, .gh-tree-row, .gh-sidebar { position: static !important; } .gh-tree, .gh-sidebar { overflow: visible !important; max-height: none !important; }",
				});
			if (options.scenario)
				await page.evaluate(
					(id) =>
						(
							window as unknown as { Proto: { run: (id: string) => void } }
						).Proto.run(id),
					options.scenario,
				);
			await page.waitForTimeout(1500);
			if (options.reveal) {
				await page
					.locator(selector("prototype", options.reveal))
					.first()
					.evaluate((element) => element.scrollIntoView({ block: "center" }));
				await page.waitForTimeout(300);
			}
			const state = await prototypeState(page);
			const first = selector("prototype", mount[0] ?? "control");
			const background = options.bare
				? await backgroundOf(page, "html")
				: await backgroundOf(page, `${first}`, true);
			const parts: Part[] = [];
			for (const component of mount) {
				const part = await partOf(page, component);
				if (options.bare && part.layer)
					part.layer = {
						...part.layer,
						background: "rgba(0, 0, 0, 0)",
						border: part.layer.border.map(() => "0px none"),
					};
				parts.push(part);
			}
			await run(page, "prototype", steps);
			if (options.bare)
				await isolateBare(page, [
					...mount.map((component) => selector("prototype", component)),
					"#fh-menu",
					"#fh-tooltip",
				]);
			await isolate(page, [
				...mount.map((component) => selector("prototype", component)),
				"#fh-menu",
				"#fh-tooltip",
			]);
			const rects = await Promise.all(
				options.capture.map((target) =>
					rectOf(page, selector("prototype", target)),
				),
			);
			const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
			return { clip: union(rects, padding), scroll, background, parts, state };
		},
		async extension(page, { origin, theme, recorded }) {
			await openHarness(page, origin, theme, recorded);
			await page.evaluate(
				({ state, parts }) =>
					(window as unknown as { harness: HarnessApi }).harness.mount(
						state,
						parts,
					),
				{ state: recorded.state as HarnessState, parts: recorded.parts },
			);
			await run(page, "extension", steps);
			return undefined;
		},
	};
}

type RawStep =
	| { click: string }
	| { hover: string }
	| { focus: string }
	| { fill: string; value: string }
	| { press: string }
	| { wait: number };

async function runRaw(page: Page, steps: RawStep[]) {
	for (const step of steps) {
		if ("click" in step) await page.locator(step.click).first().click();
		if ("hover" in step) {
			await page.locator(step.hover).first().hover();
			await page.waitForTimeout(600);
		}
		if ("focus" in step) {
			await page.keyboard.press("Shift");
			await page.locator(step.focus).first().focus();
			await page.waitForTimeout(200);
		}
		if ("fill" in step) await page.locator(step.fill).first().fill(step.value);
		if ("press" in step) {
			await page.keyboard.press(step.press);
			await page.waitForTimeout(100);
		}
		if ("wait" in step) await page.waitForTimeout(step.wait);
	}
	await page.waitForTimeout(300);
}

const APP = "#fh-app";

const WITHOUT_PROTOTYPE_CHROME =
	":root { --proto-h: 0px !important; } body { padding-top: 0 !important; } .proto-bar, .proto-toast, #fh-app > .fh-chrome { display: none !important; }";

const toSettings = (state: PrototypeState) => {
	const { activePRs, ...rest } = state;
	return { schemaVersion: 1, ...rest, activations: activePRs };
};

function settingsScene(options: {
	name: string;
	state: () => PrototypeState;
	steps?: RawStep[];
	capture: string[];
	padding?: number;
}): Scene {
	const steps = options.steps ?? [];
	const padding = options.padding ?? 0;
	return {
		name: options.name,
		surface: "settings",
		async prototype(page, { origin, theme }) {
			await openPrototype(page, origin, {
				screen: "settings",
				theme,
				state: options.state(),
			});
			await page.addStyleTag({ content: WITHOUT_PROTOTYPE_CHROME });
			await runRaw(page, steps);
			const anchor = await rectOf(page, `${APP} .fh-appheader`);
			await isolate(page, [
				`${APP} .fh-appheader`,
				`${APP} .fh-page`,
				"#fh-tooltip",
			]);
			const rects = await Promise.all(
				options.capture.map((target) => rectOf(page, target)),
			);
			return {
				clip: union(rects, padding),
				background: await backgroundOf(page, `${APP} .fh-page`),
				parts: [{ component: "anchor", rect: anchor, layer: null, meta: {} }],
			};
		},
		async extension(page, { theme, recorded, browser }) {
			await seedSettings(browser, toSettings(options.state()));
			const id = await extensionId(browser);
			await page.goto(`chrome-extension://${id}/settings.html#general`);
			await page.locator("html[data-ready]").waitFor({ state: "attached" });
			await page.addStyleTag({ content: NO_MOTION });
			await page.evaluate(async () => {
				await document.fonts.load('500 12px "FH Mona Sans"');
				await document.fonts.ready;
			});
			void theme;
			await runRaw(page, steps);
			const anchor = await rectOf(page, `${APP} .fh-appheader`);
			const expected = recorded.parts[0]?.rect ?? anchor;
			return {
				...recorded.clip,
				x: recorded.clip.x + anchor.x - expected.x,
				y: recorded.clip.y + anchor.y - expected.y,
			};
		},
	};
}

const KEY = "acme/storefront#482";

const active = (state: PrototypeState): PrototypeState => ({
	...state,
	activePRs: { [KEY]: true },
});

const automatic = (state: PrototypeState): PrototypeState => ({
	...state,
	mode: "automatic",
});

const oneFile = (): PrototypeState => ({
	...firstInstall(),
	customRules: [{ id: "readme", pattern: "README.md", enabled: true }],
	activePRs: { [KEY]: true },
});

const presetsOnly = (): PrototypeState => ({
	...firstInstall(),
	presets: { tests: { enabled: true }, lockfiles: { enabled: true } },
});

const customOff = (): PrototypeState => ({
	...demo(),
	customRules: demo().customRules.map((rule) => ({ ...rule, enabled: false })),
});

const treeOff = (): PrototypeState => ({
	...active(demo()),
	treeFiltering: false,
});

const allHidden = (): PrototypeState => ({
	...firstInstall(),
	customRules: [{ id: "all", pattern: "**", enabled: true }],
	activePRs: { [KEY]: true },
});

const allHiddenKept = (): PrototypeState => ({
	...allHidden(),
	alwaysShow: [{ id: "checkout", pattern: "src/payments/checkout.spec.ts" }],
});

const MENU: Target[] = ["control", "menu"];

const linked = () => active(demo());

const SHOW_ALL: Step[] = [{ click: "caret" }, { click: "item:show-all" }];

export const SCENES: Scene[] = [
	pageScene({
		name: "control-empty",
		state: firstInstall,
		capture: ["control"],
	}),
	pageScene({
		name: "control-empty-hover",
		state: firstInstall,
		steps: [{ hover: "caret" }],
		capture: ["control", "tooltip"],
	}),
	pageScene({
		name: "control-empty-focus",
		state: firstInstall,
		steps: [{ focus: "caret" }],
		capture: ["control", "tooltip"],
	}),
	pageScene({ name: "control-inactive", state: demo, capture: ["control"] }),
	pageScene({
		name: "control-inactive-hover-main",
		state: demo,
		steps: [{ hover: "main" }],
		capture: ["control", "tooltip"],
	}),
	pageScene({
		name: "control-inactive-hover-caret",
		state: demo,
		steps: [{ hover: "caret" }],
		capture: ["control", "tooltip"],
	}),
	pageScene({
		name: "control-inactive-focus-main",
		state: demo,
		steps: [{ focus: "main" }],
		capture: ["control", "tooltip"],
	}),
	pageScene({
		name: "control-filtering",
		state: () => active(demo()),
		capture: ["control"],
	}),
	pageScene({
		name: "control-filtering-hover",
		state: () => active(demo()),
		steps: [{ hover: "caret" }],
		capture: ["control"],
	}),
	pageScene({
		name: "control-filtering-focus",
		state: () => active(demo()),
		steps: [{ focus: "caret" }],
		capture: ["control"],
	}),
	pageScene({
		name: "control-filtering-one",
		state: oneFile,
		capture: ["control"],
	}),
	pageScene({
		name: "control-activated",
		state: demo,
		steps: [{ click: "main" }],
		capture: ["control"],
	}),
	pageScene({
		name: "menu-empty",
		state: firstInstall,
		steps: [{ click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-inactive",
		state: demo,
		steps: [{ click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-filtering",
		state: () => active(demo()),
		steps: [{ click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-filtering-keyboard",
		state: () => active(demo()),
		steps: [{ focus: "caret" }, { press: "ArrowDown" }, { press: "ArrowDown" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-item-hover",
		state: () => active(demo()),
		steps: [{ click: "caret" }, { hover: "item:preset:lockfiles" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-presets-only",
		state: presetsOnly,
		steps: [{ click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-custom-off",
		state: customOff,
		steps: [{ click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-tree-off",
		state: treeOff,
		steps: [{ click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "control-showing",
		state: () => active(demo()),
		steps: SHOW_ALL,
		capture: ["control"],
	}),
	pageScene({
		name: "control-showing-hover-main",
		state: () => active(demo()),
		steps: [...SHOW_ALL, { hover: "main" }],
		capture: ["control", "tooltip"],
	}),
	pageScene({
		name: "menu-showing",
		state: () => active(demo()),
		steps: [...SHOW_ALL, { click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "blankslate-all",
		state: allHidden,
		mount: ["blankslate"],
		capture: ["blankslate"],
	}),
	pageScene({
		name: "blankslate-kept",
		state: allHiddenKept,
		mount: ["blankslate"],
		capture: ["blankslate"],
	}),
	pageScene({
		name: "blankslate-focus",
		state: allHidden,
		mount: ["blankslate"],
		steps: [{ focus: "blankslateShowAll" }],
		capture: ["blankslate"],
	}),
	pageScene({
		name: "blankslate-hover",
		state: allHidden,
		mount: ["blankslate"],
		steps: [{ hover: "blankslateShowAll" }],
		capture: ["blankslate"],
	}),
	pageScene({
		name: "blankslate-edit-hover",
		state: allHidden,
		mount: ["blankslate"],
		steps: [{ hover: "blankslateEdit" }],
		capture: ["blankslate"],
	}),
	pageScene({
		name: "tree-empty",
		state: allHidden,
		mount: ["treeEmpty"],
		capture: ["treeEmpty"],
	}),
	pageScene({
		name: "tree-empty-focus",
		state: allHidden,
		mount: ["treeEmpty"],
		steps: [{ focus: "treeEmptyShowAll" }],
		capture: ["treeEmpty"],
	}),
	pageScene({
		name: "control-all-hidden",
		state: allHidden,
		capture: ["control"],
	}),
	pageScene({
		name: "notice-file",
		state: linked,
		scenario: "link-file",
		mount: ["notice"],
		capture: ["notice"],
	}),
	pageScene({
		name: "notice-comment",
		state: linked,
		scenario: "link-comment",
		mount: ["notice"],
		capture: ["notice"],
	}),
	pageScene({
		name: "notice-hover",
		state: linked,
		scenario: "link-file",
		mount: ["notice"],
		steps: [{ hover: "noticeHide" }],
		capture: ["notice"],
	}),
	pageScene({
		name: "notice-focus",
		state: linked,
		scenario: "link-file",
		mount: ["notice"],
		steps: [{ focus: "noticeHide" }],
		capture: ["notice"],
	}),
	pageScene({
		name: "label-revealed",
		state: linked,
		bare: true,
		scenario: "link-file",
		mount: ["revealedLabel"],
		capture: ["revealedLabel"],
	}),
	pageScene({
		name: "label-revealed-hover",
		state: linked,
		bare: true,
		scenario: "link-file",
		mount: ["revealedLabel"],
		steps: [{ hover: "revealedLabel" }],
		capture: ["revealedLabel", "tooltip"],
	}),
	pageScene({
		name: "label-revealed-focus",
		state: linked,
		bare: true,
		scenario: "link-file",
		mount: ["revealedLabel"],
		steps: [{ focus: "revealedLabel" }],
		capture: ["revealedLabel", "tooltip"],
	}),
	pageScene({
		name: "label-kept",
		state: linked,
		bare: true,
		reveal: "keptLabel",
		mount: ["keptLabel"],
		capture: ["keptLabel"],
	}),
	pageScene({
		name: "label-kept-hover",
		state: linked,
		bare: true,
		reveal: "keptLabel",
		mount: ["keptLabel"],
		steps: [{ hover: "keptLabel" }],
		capture: ["keptLabel", "tooltip"],
	}),
	pageScene({
		name: "tree-hint-hidden",
		state: treeOff,
		bare: true,
		mount: ["hiddenHint"],
		capture: ["hiddenHint"],
	}),
	pageScene({
		name: "tree-hint-hidden-hover",
		state: treeOff,
		bare: true,
		mount: ["hiddenHint"],
		steps: [{ hover: "hiddenHint" }],
		capture: ["hiddenHint", "tooltip"],
	}),
	pageScene({
		name: "tree-hint-revealed",
		state: treeOff,
		bare: true,
		scenario: "link-file",
		reveal: "revealedHint",
		mount: ["revealedHint"],
		capture: ["revealedHint"],
	}),
	pageScene({
		name: "tree-hint-revealed-hover",
		state: treeOff,
		bare: true,
		scenario: "link-file",
		reveal: "revealedHint",
		mount: ["revealedHint"],
		steps: [{ hover: "revealedHint" }],
		capture: ["revealedHint", "tooltip"],
	}),
	pageScene({
		name: "control-revealed",
		state: linked,
		scenario: "link-file",
		capture: ["control"],
	}),
	pageScene({
		name: "control-automatic",
		state: () => automatic(demo()),
		capture: ["control"],
	}),
	pageScene({
		name: "control-automatic-focus",
		state: () => automatic(demo()),
		steps: [{ focus: "caret" }],
		capture: ["control"],
	}),
	pageScene({
		name: "menu-automatic",
		state: () => automatic(demo()),
		steps: [{ click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "control-automatic-showing",
		state: () => automatic(demo()),
		steps: SHOW_ALL,
		capture: ["control"],
	}),
	pageScene({
		name: "menu-automatic-showing",
		state: () => automatic(demo()),
		steps: [...SHOW_ALL, { click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-empty-hover",
		state: firstInstall,
		steps: [{ click: "caret" }, { hover: "item:preset:tests" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-automatic-showing-tree-off",
		state: () => ({ ...automatic(demo()), treeFiltering: false }),
		steps: [...SHOW_ALL, { click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
	pageScene({
		name: "menu-empty-automatic",
		state: () => automatic(firstInstall()),
		steps: [{ click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
];

const PAGE = `${APP} .fh-page`;
const HEADER = `${APP} .fh-appheader`;
const MAIN = `${APP} #fh-main`;
const nav = (page: string): RawStep => ({
	click: `${APP} [data-page="${page}"]`,
});

const lockfilesEmpty = (): PrototypeState => ({
	...demo(),
	presets: {
		tests: { enabled: true },
		lockfiles: { enabled: true, rules: [] },
	},
});

const noCustom = (): PrototypeState => ({ ...presetsOnly() });

const noAlways = (): PrototypeState => ({ ...demo(), alwaysShow: [] });

SCENES.push(
	settingsScene({
		name: "settings-general",
		state: demo,
		capture: [HEADER, PAGE],
	}),
	settingsScene({
		name: "settings-general-first-install",
		state: firstInstall,
		capture: [HEADER, PAGE],
	}),
	settingsScene({
		name: "settings-general-automatic",
		state: () => automatic(demo()),
		capture: [PAGE],
	}),
	settingsScene({
		name: "settings-general-tree-off",
		state: () => ({ ...demo(), treeFiltering: false }),
		capture: [PAGE],
	}),
	settingsScene({
		name: "settings-general-radio-focus",
		state: demo,
		steps: [{ focus: `${APP} [data-focus="radio:automatic"]` }],
		capture: [MAIN],
		padding: 8,
	}),
	settingsScene({
		name: "settings-general-switch-focus",
		state: demo,
		steps: [{ focus: `${APP} [data-focus="switch:tree"]` }],
		capture: [MAIN],
		padding: 8,
	}),
	settingsScene({
		name: "settings-saved",
		state: demo,
		steps: [{ click: `${APP} [data-focus="switch:tree"]` }],
		capture: [HEADER],
	}),
	settingsScene({
		name: "settings-view-source-hover",
		state: demo,
		steps: [{ hover: `${APP} [data-act="source"]` }],
		capture: [HEADER],
	}),
	settingsScene({
		name: "settings-nav-focus",
		state: demo,
		steps: [{ focus: `${APP} [data-page="custom"]` }],
		capture: [`${APP} .fh-nav`],
		padding: 8,
	}),
	settingsScene({
		name: "settings-nav-hover",
		state: demo,
		steps: [{ hover: `${APP} [data-page="always"]` }],
		capture: [`${APP} .fh-nav`],
		padding: 8,
	}),
	settingsScene({
		name: "settings-presets",
		state: demo,
		steps: [nav("presets")],
		capture: [HEADER, PAGE],
	}),
	settingsScene({
		name: "settings-presets-first-install",
		state: firstInstall,
		steps: [nav("presets")],
		capture: [PAGE],
	}),
	settingsScene({
		name: "settings-presets-modified",
		state: demo,
		steps: [
			nav("presets"),
			{ fill: `${APP} [data-input="add:p:tests"]`, value: "**/*.e2e.ts" },
			{ press: "Enter" },
		],
		capture: [MAIN],
		padding: 8,
	}),
	settingsScene({
		name: "settings-presets-editing",
		state: demo,
		steps: [
			nav("presets"),
			{ click: `${APP} [data-list="p:tests"][data-key="1"] [data-act="edit"]` },
		],
		capture: [MAIN],
		padding: 8,
	}),
	settingsScene({
		name: "settings-presets-edit-error",
		state: demo,
		steps: [
			nav("presets"),
			{ click: `${APP} [data-list="p:tests"][data-key="1"] [data-act="edit"]` },
			{ fill: `${APP} [data-input="edit"]`, value: "/src/__tests__/**" },
		],
		capture: [MAIN],
		padding: 8,
	}),
	settingsScene({
		name: "settings-presets-add-error",
		state: demo,
		steps: [
			nav("presets"),
			{ fill: `${APP} [data-input="add:p:lockfiles"]`, value: "**/yarn.lock" },
			{ press: "Enter" },
		],
		capture: [MAIN],
		padding: 8,
	}),
	settingsScene({
		name: "settings-presets-restore-tip",
		state: demo,
		steps: [
			nav("presets"),
			{ hover: `${APP} [data-act="restore"][data-preset="lockfiles"]` },
		],
		capture: [MAIN, "#fh-tooltip.is-open"],
		padding: 8,
	}),
	settingsScene({
		name: "settings-presets-rule-hover",
		state: demo,
		steps: [
			nav("presets"),
			{
				hover: `${APP} [data-list="p:tests"][data-key="0"] [data-act="remove"]`,
			},
		],
		capture: [MAIN, "#fh-tooltip.is-open"],
		padding: 8,
	}),
	settingsScene({
		name: "settings-presets-empty",
		state: lockfilesEmpty,
		steps: [nav("presets")],
		capture: [MAIN],
		padding: 8,
	}),
	settingsScene({
		name: "settings-custom",
		state: demo,
		steps: [nav("custom")],
		capture: [HEADER, PAGE],
	}),
	settingsScene({
		name: "settings-custom-empty",
		state: noCustom,
		steps: [nav("custom")],
		capture: [PAGE],
	}),
	settingsScene({
		name: "settings-custom-checkbox-focus",
		state: demo,
		steps: [nav("custom"), { focus: `${APP} .fh-rule .fh-checkbox` }],
		capture: [MAIN],
		padding: 8,
	}),
	settingsScene({
		name: "settings-always",
		state: demo,
		steps: [nav("always")],
		capture: [HEADER, PAGE],
	}),
	settingsScene({
		name: "settings-always-empty",
		state: noAlways,
		steps: [nav("always")],
		capture: [PAGE],
	}),
	settingsScene({
		name: "settings-always-syntax-open",
		state: demo,
		steps: [nav("always"), { click: `${APP} .fh-details > summary` }],
		capture: [PAGE],
	}),
);
