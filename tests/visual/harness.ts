import {
	derivePage,
	type PageModel,
	type SessionState,
} from "../../src/filtering-session";
import { normalizeSettings } from "../../src/settings";
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

function model(state: HarnessState): PageModel {
	const session: SessionState = {
		showingAll: state.showingAll,
		revealed: new Set(state.revealed),
	};
	return derivePage({
		settings: normalizeSettings(state.settings),
		pullRequestKey: state.pullRequestKey,
		paths: state.paths,
		session,
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
		ui = createPageUi({ onMain: () => {} });
		ui.update(model(state));
		place(ui.control.element, rect);
	},
	async fontsReady() {
		await document.fonts.load('500 12px "FH Mona Sans"');
		await document.fonts.ready;
	},
};

Object.assign(window, { harness });
