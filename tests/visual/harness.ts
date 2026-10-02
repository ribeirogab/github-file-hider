import {
	derivePage,
	type PageModel,
	reduceSession,
	type SessionState,
} from "../../src/filtering-session";
import {
	type ActionResult,
	mainAction,
	menuAction,
} from "../../src/page-actions";
import { normalizeSettings, type Settings } from "../../src/settings";
import { createPageUi, type PageUi } from "../../src/ui/page-ui";

export type HarnessState = {
	settings: unknown;
	paths: string[];
	pullRequestKey: string;
	showingAll: boolean;
	revealed: string[];
};

export type Rect = { x: number; y: number; width: number; height: number };

let ui: PageUi | null = null;
let settings: Settings | null = null;
let session: SessionState = { showingAll: false, revealed: new Set() };
let key = "";
let paths: string[] = [];
let current: PageModel | null = null;

function refresh() {
	if (!ui || !settings) return;
	current = derivePage({ settings, pullRequestKey: key, paths, session });
	ui.update(current);
}

function apply(result: ActionResult) {
	for (const event of result.events) session = reduceSession(session, event);
	if (result.closeMenu)
		ui?.menu.close({ restore: result.closeMenu === "restore-focus" });
	if (result.settings) settings = result.settings;
	refresh();
}

const actionContext = () => ({
	settings: settings as Settings,
	pullRequestKey: key,
	active: current?.active ?? false,
});

function model(state: HarnessState): PageModel {
	return derivePage({
		settings: normalizeSettings(state.settings),
		pullRequestKey: state.pullRequestKey,
		paths: state.paths,
		session: {
			showingAll: state.showingAll,
			revealed: new Set(state.revealed),
		},
	});
}

let container: HTMLElement = document.body;
let origin = { x: 0, y: 0 };

function place(element: HTMLElement, rect: Rect, width?: number) {
	const slot = document.createElement("div");
	slot.className = "harness-slot";
	const left = rect.x - origin.x;
	const top = rect.y - origin.y;
	slot.style.left = `${left}px`;
	slot.style.top = `${top}px`;
	if (width !== undefined) slot.style.width = `${width}px`;
	slot.append(element);
	container.append(slot);
	const actual = element.getBoundingClientRect();
	slot.style.left = `${left + (rect.x - actual.x)}px`;
	slot.style.top = `${top + (rect.y - actual.y)}px`;
	return slot;
}

function setTheme(theme: "light" | "dark") {
	const root = document.documentElement;
	root.dataset.colorMode = theme;
	root.dataset.lightTheme = "light";
	root.dataset.darkTheme = "dark";
}

export type Layer = {
	rect: Rect;
	background: string;
	position: string;
	top: string;
	zIndex: string;
	border: string[];
};

function box(rect: Rect, color: string, parent: HTMLElement) {
	const element = document.createElement("div");
	element.className = "harness-slot";
	Object.assign(element.style, {
		left: `${rect.x}px`,
		top: `${rect.y}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
		background: color,
	});
	parent.append(element);
	return element;
}

function backdrop(rect: Rect, color: string, layer: Layer | null) {
	box(
		{
			x: rect.x - 32,
			y: rect.y - 32,
			width: rect.width + 64,
			height: rect.height + 64,
		},
		color,
		document.body,
	);
	if (!layer) return;
	container = document.createElement("div");
	Object.assign(container.style, {
		position: layer.position === "sticky" ? "sticky" : "absolute",
		top: layer.position === "sticky" ? layer.top : `${layer.rect.y}px`,
		left: `${layer.rect.x}px`,
		marginTop: layer.position === "sticky" ? `${layer.rect.y}px` : "0",
		width: `${layer.rect.width}px`,
		height: `${layer.rect.height}px`,
		background: layer.background,
		zIndex: layer.zIndex,
		boxSizing: "border-box",
		borderTop: layer.border[0],
		borderRight: layer.border[1],
		borderBottom: layer.border[2],
		borderLeft: layer.border[3],
	});
	if (layer.position !== "sticky") container.style.willChange = "transform";
	document.body.append(container);
	origin = { x: layer.rect.x, y: layer.rect.y };
}

const harness = {
	setTheme,
	backdrop,
	model: (state: HarnessState) => {
		const page = model(state);
		return {
			view: page.view,
			hiddenCount: page.hiddenCount,
			matchCount: page.matchCount,
		};
	},
	control(state: HarnessState, rect: Rect) {
		ui?.remove();
		settings = normalizeSettings(state.settings);
		session = {
			showingAll: state.showingAll,
			revealed: new Set(state.revealed),
		};
		key = state.pullRequestKey;
		paths = state.paths;
		ui = createPageUi({
			onMain: (view) => apply(mainAction(view, actionContext())),
			onMenuItem: (item) => apply(menuAction(item, actionContext())),
		});
		refresh();
		place(ui.control.element, rect);
	},
	async fontsReady() {
		await document.fonts.load('500 12px "FH Mona Sans"');
		await document.fonts.ready;
	},
};

Object.assign(window, { harness });
