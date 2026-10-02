import {
	type ControlViewName,
	derivePage,
	initialSession,
	type PageModel,
	reduceSession,
	type SessionState,
} from "./filtering-session";
import {
	applyVisibility,
	digestPaths,
	listedPaths,
	parseRoute,
	type Route,
	restoreVisibility,
	toolbarSlot,
} from "./github-page";
import {
	type ActionContext,
	type ActionResult,
	mainAction,
	menuAction,
} from "./page-actions";
import {
	largestRulePage,
	removeDecorations,
	syncBlankslate,
	syncTreeNote,
} from "./page-decorations";
import { firstInstallSettings, type Settings } from "./settings";
import { readSettings, watchSettings, writeSettings } from "./settings-store";
import { createPageUi, type PageUi } from "./ui/page-ui";

type Mounted = {
	route: Route;
	ui: PageUi;
	session: SessionState;
	model: PageModel | null;
};

let settings: Settings = firstInstallSettings();
let settingsReady = false;
let mounted: Mounted | null = null;
let scheduled = false;
let running = false;
let rerun = false;

function openSettings(page: string) {
	void chrome.runtime.sendMessage({ type: "open-settings", page });
}

function saveSettings(next: Settings) {
	settings = next;
	schedule();
	void writeSettings(next);
}

function apply(result: ActionResult) {
	if (!mounted) return;
	for (const event of result.events)
		mounted.session = reduceSession(mounted.session, event);
	if (result.closeMenu)
		mounted.ui.menu.close({ restore: result.closeMenu === "restore-focus" });
	if (result.openSettings) openSettings(result.openSettings);
	if (result.settings) saveSettings(result.settings);
	else schedule();
}

const context = (state: Mounted): ActionContext => ({
	settings,
	pullRequestKey: state.route.key,
	active: state.model?.active ?? false,
});

function onMain(view: ControlViewName) {
	if (mounted) apply(mainAction(view, context(mounted)));
}

function onMenuItem(key: string) {
	if (mounted) apply(menuAction(key, context(mounted)));
}

function onPageAction(event: MouseEvent) {
	const target =
		event.target instanceof Element
			? event.target.closest<HTMLElement>("[data-fh-act]")
			: null;
	if (!target || !mounted?.model) return;
	const action = target.dataset.fhAct;
	if (action === "show-all") {
		apply({ events: [{ type: "show-all" }] });
		mounted.ui.control.focus();
	} else if (action === "edit-rules") {
		openSettings(largestRulePage(mounted.model));
	}
}

document.addEventListener("click", onPageAction);

function mount(route: Route): Mounted {
	return {
		route,
		ui: createPageUi({ onMain, onMenuItem }),
		session: initialSession(),
		model: null,
	};
}

function unmount() {
	if (!mounted) return;
	mounted.ui.remove();
	removeDecorations();
	restoreVisibility();
	mounted = null;
}

async function render(state: Mounted) {
	const paths = listedPaths();
	await digestPaths(paths);
	if (mounted !== state) return;
	const model = derivePage({
		settings,
		pullRequestKey: state.route.key,
		paths,
		session: state.session,
	});
	state.model = model;
	applyVisibility(
		model.files.map((file) => ({
			path: file.path,
			hidden: file.state === "hidden",
		})),
		model.treeFiltering,
	);
	state.ui.update(model);
	syncBlankslate(model);
	syncTreeNote(model);
}

async function sync() {
	scheduled = false;
	if (running) {
		rerun = true;
		return;
	}
	running = true;
	try {
		const route = parseRoute(new URL(location.href));
		const slot = route && settingsReady ? toolbarSlot() : null;
		if (!route || !slot) {
			unmount();
			return;
		}
		if (mounted?.route.key !== route.key) {
			unmount();
			mounted = mount(route);
		}
		mounted.route = route;
		const element = mounted.ui.control.element;
		if (element.parentElement !== slot) slot.append(element);
		await render(mounted);
	} finally {
		running = false;
		if (rerun) {
			rerun = false;
			schedule();
		}
	}
}

function schedule() {
	if (scheduled) return;
	scheduled = true;
	queueMicrotask(() => void sync());
}

const OWN =
	".fh-ctl, .fh-overlay, .fh-tooltip, .fh-sr, .fh-flash, .fh-blankslate, .fh-tree-empty, .fh-file-label, .fh-tree-hint";

const isOwn = (node: Node) => {
	const element = node instanceof Element ? node : node.parentElement;
	return element?.closest(OWN) != null;
};

new MutationObserver((records) => {
	if (
		records.some(
			(record) =>
				!isOwn(record.target) &&
				![...record.addedNodes, ...record.removedNodes].every(isOwn),
		)
	)
		schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

addEventListener("popstate", schedule);
addEventListener("hashchange", schedule);
(globalThis as { navigation?: EventTarget }).navigation?.addEventListener(
	"currententrychange",
	schedule,
);

watchSettings((next) => {
	settings = next;
	schedule();
});

void readSettings().then((stored) => {
	settings = stored;
	settingsReady = true;
	schedule();
});
