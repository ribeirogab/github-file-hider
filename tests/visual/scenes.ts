import type { Page } from "@playwright/test";
import type { HarnessState, Rect } from "./harness.ts";
import {
	backgroundOf,
	firstInstall,
	isolate,
	type Layer,
	layerOf,
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

type Interaction = "rest" | "hover" | "focus";

const PADDING = 8;

async function interact(
	page: Page,
	selector: string,
	interaction: Interaction,
) {
	if (interaction === "hover") {
		await page.locator(selector).hover();
		await page.waitForTimeout(600);
	}
	if (interaction === "focus") {
		await page.keyboard.press("Shift");
		await page.locator(selector).focus();
		await page.waitForTimeout(200);
	}
}

async function openHarness(
	page: Page,
	origin: string,
	theme: Theme,
	recorded: Recorded,
) {
	await page.goto(`${origin}/tests/visual/harness.html`);
	await page.evaluate(
		async ({ theme, clip, background, layer }) => {
			const { harness } = window as unknown as {
				harness: {
					setTheme: (t: Theme) => void;
					backdrop: (r: Rect, color: string, layer: Layer | null) => void;
					fontsReady: () => Promise<void>;
				};
			};
			harness.setTheme(theme);
			harness.backdrop(clip, background, layer);
			await harness.fontsReady();
		},
		{
			theme,
			clip: recorded.clip,
			background: recorded.background,
			layer: recorded.layer,
		},
	);
}

function controlScene(options: {
	name: string;
	state: () => PrototypeState;
	interaction?: Interaction;
	target?: string;
}): Scene {
	const interaction = options.interaction ?? "rest";
	const target = options.target ?? ".fh-ctl-menu";
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
			const control = await rectOf(page, "#gh .fh-ctl");
			const background = await backgroundOf(page, "#gh .fh-ctl");
			const layer = await layerOf(page, "#gh .fh-ctl");
			await interact(page, `#gh .fh-ctl ${target}`, interaction);
			await isolate(page, ["#gh .fh-ctl", ".fh-tooltip"]);
			const rects: Rect[] = [control];
			if (interaction !== "rest")
				rects.push(await rectOf(page, ".fh-tooltip.is-open"));
			return {
				clip: union(rects, PADDING),
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
					(
						window as unknown as {
							harness: { control: (s: HarnessState, r: Rect) => void };
						}
					).harness.control(state, rect),
				{
					state: recorded.state as HarnessState,
					rect: recorded.rects.control as Rect,
				},
			);
			await interact(page, `.fh-ctl ${target}`, interaction);
		},
	};
}

export const SCENES: Scene[] = [
	controlScene({ name: "control-empty", state: firstInstall }),
	controlScene({
		name: "control-empty-hover",
		state: firstInstall,
		interaction: "hover",
	}),
	controlScene({
		name: "control-empty-focus",
		state: firstInstall,
		interaction: "focus",
	}),
];
