import {
	createSession,
	filteringModel,
	type Session,
} from "./filtering-session";
import {
	applyVisibility,
	directLinkTarget,
	type LinkTarget,
	listedPaths,
	placeEmptyStates,
	placeFileLabel,
	placeFileNotice,
	removeDirectLink,
	restoreVisibility,
	scrollToTarget,
	toolbarAnchor,
} from "./github-page";
import { pullRequestKey } from "./route";
import { evaluate } from "./rules";
import {
	firstInstallSettings,
	readSettings,
	updateSettings,
	watchSettings,
} from "./settings-store";
import type { PresetId } from "./types";
import { PageUI } from "./ui";

let settings = firstInstallSettings();
let session: Session | null = null;
let ui: PageUI | null = null;
let queued = false;
let signature = "";
let lastUrl = location.href;
let handledLink = "";
let resolvingLink = "";
let pendingTarget: LinkTarget | null = null;
let nextAnnouncement: string | undefined;
async function action(action: string) {
	const current = session;
	if (!current) return;
	if (action.startsWith("hide-revealed:")) {
		const path = action.slice(14);
		current.revealed.delete(path);
		removeDirectLink();
		handledLink = "";
		pendingTarget = null;
		queueRefresh();
		ui?.menuButton.focus();
		nextAnnouncement = `${path} is hidden again.`;
		return;
	}
	if (action === "show-all" || action === "hide-again") {
		current.showingAll = action === "show-all";
		if (current.showingAll) current.revealed.clear();
		ui?.close();
		queueRefresh();
		return;
	}
	if (action === "settings" || action === "custom") {
		await chrome.runtime.sendMessage({ type: "open-settings" });
		return;
	}
	await updateSettings((settings) => {
		if (action === "activate") {
			current.showingAll = false;
			if (settings.mode === "manual") settings.activations[current.key] = true;
		}
		if (action === "activation") {
			if (settings.activations[current.key]) {
				delete settings.activations[current.key];
				current.revealed.clear();
			} else if (settings.mode === "manual")
				settings.activations[current.key] = true;
		}
		if (action.startsWith("preset:")) {
			const id = action.slice(7) as PresetId;
			settings.presets[id].enabled = !settings.presets[id].enabled;
		}
		if (action === "tree") settings.treeFiltering = !settings.treeFiltering;
	});
}
function refresh() {
	lastUrl = location.href;
	const key = pullRequestKey(new URL(location.href));
	if (!key) {
		ui?.destroy();
		ui = null;
		session = null;
		handledLink = "";
		pendingTarget = null;
		signature = "";
		restoreVisibility();
		return;
	}
	if (session?.key !== key) {
		ui?.destroy();
		ui = null;
		restoreVisibility();
		session = createSession(key);
		handledLink = "";
		pendingTarget = null;
		signature = "";
	}
	const anchor = toolbarAnchor();
	if (!anchor || !session) return;
	if (!ui?.control.isConnected) {
		ui?.destroy();
		ui = new PageUI(action);
		anchor.append(ui.control);
		signature = "";
	}
	const paths = listedPaths();
	const model = filteringModel(settings, session, paths);
	applyVisibility(model.files, settings.treeFiltering);
	placeEmptyStates(ui.emptyDiff, ui.emptyTree);
	for (const [path, label] of ui.fileLabels(model)) placeFileLabel(path, label);
	for (const [path, notice] of ui.fileNotices(model))
		placeFileNotice(path, notice);
	if (pendingTarget && scrollToTarget(pendingTarget)) {
		nextAnnouncement = `${pendingTarget.path} is temporarily visible.`;
		pendingTarget = null;
	}
	if (model.filtering) void revealLink(paths);
	const nextSignature = JSON.stringify([
		settings,
		paths,
		session.showingAll,
		[...session.revealed],
	]);
	if (signature !== nextSignature) {
		signature = nextSignature;
		ui.render(model, settings, nextAnnouncement);
		nextAnnouncement = undefined;
	}
}
async function revealLink(paths: string[]) {
	const url = location.href;
	const current = session;
	if (
		!current ||
		!location.hash ||
		handledLink === url ||
		resolvingLink === url
	)
		return;
	resolvingLink = url;
	try {
		const target = await directLinkTarget(paths);
		if (
			!target ||
			session !== current ||
			location.href !== url ||
			!evaluate(target.path, settings).matching
		)
			return;
		current.revealed.add(target.path);
		handledLink = url;
		pendingTarget = target;
		queueRefresh();
	} finally {
		if (resolvingLink === url) resolvingLink = "";
	}
}
function queueRefresh() {
	if (queued) return;
	queued = true;
	requestAnimationFrame(() => {
		queued = false;
		refresh();
	});
}
const observer = new MutationObserver((records) => {
	if (
		records.some(
			(record) =>
				!(record.target as Element).closest?.('[id^="fh-"], [data-fh-owned]'),
		)
	)
		queueRefresh();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", queueRefresh);
window.addEventListener("hashchange", queueRefresh);
setInterval(() => {
	if (lastUrl !== location.href) {
		lastUrl = location.href;
		queueRefresh();
	}
}, 250);
watchSettings((next) => {
	if (session && !filteringModel(next, session, []).active) {
		session.revealed.clear();
		handledLink = "";
		pendingTarget = null;
	}
	settings = next;
	queueRefresh();
});
void readSettings().then((next) => {
	settings = next;
	refresh();
});
