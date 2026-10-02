import type { Page } from "@playwright/test";
import type { HarnessState, Rect } from "./harness.ts";
import {
	backgroundOf,
	demo,
	firstInstall,
	isolate,
	type Layer,
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
	background: string;
	layer: Layer | null;
	rects: Record<string, Rect>;
	state?: HarnessState;
};

export type SceneContext = { origin: string; theme: Theme };

export type Scene = {
	name: string;
	surface: "page" | "settings";
	prototype: (page: Page, context: SceneContext) => Promise<Recorded>;
	extension: (
		page: Page,
		context: SceneContext & { recorded: Recorded },
	) => Promise<void>;
};

export type Side = "prototype" | "extension";

const TARGETS = {
	control: ".fh-ctl",
	main: ".fh-ctl .fh-ctl-main",
	caret: ".fh-ctl .fh-ctl-menu",
	menu: "#fh-menu",
	tooltip: "#fh-tooltip.is-open",
} as const;

type Target = keyof typeof TARGETS | `item:${string}`;

const IN_REPLICA = new Set<string>(["control", "main", "caret"]);

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
		if ("click" in step) await page.locator(selector(side, step.click)).click();
		if ("hover" in step) {
			await page.locator(selector(side, step.hover)).hover();
			await page.waitForTimeout(600);
		}
		if ("focus" in step) {
			await page.keyboard.press("Shift");
			await page.locator(selector(side, step.focus)).focus();
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
	backdrop: (rect: Rect, color: string, layer: Layer | null) => void;
	fontsReady: () => Promise<void>;
	control: (state: HarnessState, rect: Rect) => void;
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
			harness.backdrop(recorded.clip, recorded.background, recorded.layer);
			await harness.fontsReady();
		},
		{ theme, recorded },
	);
}

function pageScene(options: {
	name: string;
	state: () => PrototypeState;
	steps?: Step[];
	capture: Target[];
	padding?: number;
}): Scene {
	const steps = options.steps ?? [];
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
			const state = await prototypeState(page);
			const control = await rectOf(page, selector("prototype", "control"));
			const background = await backgroundOf(
				page,
				selector("prototype", "control"),
			);
			const layer = await layerOf(page, selector("prototype", "control"));
			await run(page, "prototype", steps);
			await isolate(page, [
				selector("prototype", "control"),
				"#fh-menu",
				"#fh-tooltip",
			]);
			const rects = await Promise.all(
				options.capture.map((target) =>
					rectOf(page, selector("prototype", target)),
				),
			);
			return {
				clip: union(rects, padding),
				background,
				layer,
				rects: { control },
				state,
			};
		},
		async extension(page, { origin, theme, recorded }) {
			await openHarness(page, origin, theme, recorded);
			await page.evaluate(
				({ state, rect }) =>
					(window as unknown as { harness: HarnessApi }).harness.control(
						state,
						rect,
					),
				{
					state: recorded.state as HarnessState,
					rect: recorded.rects.control as Rect,
				},
			);
			await run(page, "extension", steps);
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

const MENU: Target[] = ["control", "menu"];

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
		name: "menu-empty-automatic",
		state: () => automatic(firstInstall()),
		steps: [{ click: "caret" }],
		capture: MENU,
		padding: 32,
	}),
];
