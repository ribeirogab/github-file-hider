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
import {
	type BlankslateKind,
	blankslateHtml,
	type FileLabelKind,
	fileLabelHtml,
	type NoticeKind,
	noticeHtml,
	type TreeHintKind,
	treeEmptyHtml,
	treeHintHtml,
} from "../../src/ui/markup";
import { createPageUi, type PageUi } from "../../src/ui/page-ui";

export type HarnessState = {
	settings: unknown;
	paths: string[];
	pullRequestKey: string;
	showingAll: boolean;
	revealed: string[];
};

export type Rect = { x: number; y: number; width: number; height: number };

export type Layer = {
	rect: Rect;
	background: string;
	position: string;
	top: string;
	zIndex: string;
	border: string[];
};

export type Part = {
	component: string;
	rect: Rect;
	layer: Layer | null;
	meta: Record<string, string>;
};

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

function setTheme(theme: "light" | "dark") {
	const root = document.documentElement;
	root.dataset.colorMode = theme;
	root.dataset.lightTheme = "light";
	root.dataset.darkTheme = "dark";
}

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

function backdrop(rect: Rect, color: string) {
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
}

const layers = new Map<string, HTMLElement>();

function layerContainer(layer: Layer | null) {
	if (!layer) return { container: document.body, origin: { x: 0, y: 0 } };
	const id = JSON.stringify(layer.rect);
	let container = layers.get(id);
	if (!container) {
		container = document.createElement("div");
		const sticky = layer.position === "sticky";
		Object.assign(container.style, {
			position: sticky ? "sticky" : "absolute",
			top: sticky ? layer.top : `${layer.rect.y}px`,
			left: `${layer.rect.x}px`,
			marginTop: sticky ? `${layer.rect.y}px` : "0",
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
		if (!sticky) container.style.willChange = "transform";
		document.body.append(container);
		layers.set(id, container);
	}
	return { container, origin: { x: layer.rect.x, y: layer.rect.y } };
}

function place(element: HTMLElement, part: Part, width?: number) {
	const { container, origin } = layerContainer(part.layer);
	const slot = document.createElement("div");
	slot.className = "harness-slot";
	const left = part.rect.x - origin.x;
	const top = part.rect.y - origin.y;
	slot.style.left = `${left}px`;
	slot.style.top = `${top}px`;
	if (width !== undefined) slot.style.width = `${width}px`;
	slot.append(element);
	container.append(slot);
	const actual = element.getBoundingClientRect();
	slot.style.left = `${left + (part.rect.x - actual.x)}px`;
	slot.style.top = `${top + (part.rect.y - actual.y)}px`;
	return slot;
}

function fromHtml(html: string) {
	const template = document.createElement("template");
	template.innerHTML = html;
	return template.content.firstElementChild as HTMLElement;
}

function mountControl(state: HarnessState, part: Part) {
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
	place(ui.control.element, part);
}

function mountMarkup(part: Part) {
	const { meta } = part;
	if (part.component === "blankslate") {
		const [kind, allLoaded, kept] = (meta.sig ?? "").split("|");
		place(
			fromHtml(
				blankslateHtml(
					kind as BlankslateKind,
					allLoaded === "true",
					Number(kept),
				),
			),
			part,
			part.rect.width,
		);
	}
	if (part.component === "treeEmpty")
		place(fromHtml(treeEmptyHtml()), part, part.rect.width);
	if (part.component === "notice")
		place(
			fromHtml(
				noticeHtml(meta.path ?? "", meta.kind as NoticeKind, meta.reason ?? ""),
			),
			part,
			part.rect.width,
		);
	if (part.component === "fileLabel")
		place(
			fromHtml(fileLabelHtml(meta.kind as FileLabelKind, meta.tip ?? "")),
			part,
		);
	if (part.component === "treeHint")
		place(
			fromHtml(treeHintHtml(meta.kind as TreeHintKind, meta.tip ?? "")),
			part,
		);
}

const harness = {
	setTheme,
	backdrop,
	mount(state: HarnessState, parts: Part[]) {
		for (const part of parts) {
			if (part.component === "control") mountControl(state, part);
			else mountMarkup(part);
		}
	},
	async fontsReady() {
		await document.fonts.load('500 12px "FH Mona Sans"');
		await document.fonts.ready;
	},
};

Object.assign(window, { harness });
