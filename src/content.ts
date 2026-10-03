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
	clearHash,
	diffBlock,
	diffEntry,
	digestPaths,
	type LinkTarget,
	linkTarget,
	listedPaths,
	parseRoute,
	type Route,
	restoreVisibility,
	targetLine,
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
	type RevealKind,
	removeDecorations,
	syncBlankslate,
	syncFileStates,
	syncNotices,
	syncTreeNote,
} from "./page-decorations";
import { evaluate } from "./rules";
import { firstInstallSettings, isActive, type Settings } from "./settings";
import { readSettings, watchSettings, writeSettings } from "./settings-store";
import { copy } from "./ui/copy";
import { createPageUi, type PageUi } from "./ui/page-ui";

type Mounted = {
	route: Route;
	ui: PageUi;
	session: SessionState;
	model: PageModel | null;
	reveals: Map<string, RevealKind>;
	handledHash: string | null;
	pendingScroll: LinkTarget | null;
	pendingAnnouncement: string | null;
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
	for (const event of result.events) {
		mounted.session = reduceSession(mounted.session, event);
		if (event.type === "turn-off") mounted.reveals.clear();
	}
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
	} else if (action === "hide-revealed") {
		hideRevealed(target.dataset.path ?? "");
	}
}

function hideRevealed(path: string) {
	if (!mounted) return;
	mounted.ui.control.focus();
	mounted.reveals.delete(path);
	mounted.session = reduceSession(mounted.session, {
		type: "hide-revealed",
		path,
	});
	if (location.hash) clearHash();
	mounted.handledHash = location.hash;
	clearTargetLines();
	mounted.pendingAnnouncement = copy.live.hiddenAgain(path);
	schedule();
}

function clearTargetLines() {
	for (const line of document.querySelectorAll(".fh-target-line"))
		line.classList.remove("fh-target-line");
}

function handleHash(state: Mounted) {
	const hash = location.hash;
	if (hash === state.handledHash) return;
	state.handledHash = hash;
	const target = linkTarget(hash);
	if (!target) return;
	const evaluation = evaluate(target.path, settings);
	const filtering =
		isActive(settings, state.route.key) && !state.session.showingAll;
	if (!filtering || !evaluation.matching) return;
	if (!state.session.revealed.has(target.path)) {
		state.session = reduceSession(state.session, {
			type: "reveal",
			path: target.path,
		});
		state.pendingAnnouncement = copy.notice;
	}
	state.reveals.set(target.path, { kind: target.kind });
	state.pendingScroll = target;
}

const scrollBehavior = (): ScrollBehavior =>
	matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

function scrollToTarget(target: LinkTarget) {
	const block = diffBlock(target.path);
	if (!block) return;
	const notice = diffEntry(block).previousElementSibling;
	const line = targetLine(block, target.line);
	clearTargetLines();
	line?.classList.add("fh-target-line");
	requestAnimationFrame(() => {
		if (line)
			line.scrollIntoView({ block: "center", behavior: scrollBehavior() });
		else
			(notice ?? block).scrollIntoView({
				block: "start",
				behavior: scrollBehavior(),
			});
	});
}

document.addEventListener("click", onPageAction);

function mount(route: Route): Mounted {
	return {
		route,
		ui: createPageUi({ onMain, onMenuItem }),
		session: initialSession(),
		model: null,
		reveals: new Map(),
		handledHash: null,
		pendingScroll: null,
		pendingAnnouncement: null,
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
	handleHash(state);
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
	if (state.pendingAnnouncement) {
		state.ui.announcer.announce(state.pendingAnnouncement);
		state.pendingAnnouncement = null;
	}
	syncFileStates(model);
	syncNotices(model, state.reveals);
	syncBlankslate(model);
	syncTreeNote(model);
	const target = state.pendingScroll;
	state.pendingScroll = null;
	if (target) scrollToTarget(target);
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
	if (mounted && next.mode !== settings.mode)
		mounted.session = reduceSession(mounted.session, { type: "change-mode" });
	settings = next;
	schedule();
});

void readSettings().then((stored) => {
	settings = stored;
	settingsReady = true;
	schedule();
});
