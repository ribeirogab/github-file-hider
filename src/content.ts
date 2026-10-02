import {
	createSession,
	filteringModel,
	type Session,
} from "./filtering-session";
import {
	applyVisibility,
	listedPaths,
	placeEmptyStates,
	restoreVisibility,
	toolbarAnchor,
} from "./github-page";
import { pullRequestKey } from "./route";
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
async function action(action: string) {
	const current = session;
	if (!current) return;
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
			settings.activations[current.key] = true;
		}
		if (action === "activation") {
			if (settings.activations[current.key]) {
				delete settings.activations[current.key];
				current.revealed.clear();
			} else settings.activations[current.key] = true;
		}
		if (action.startsWith("preset:")) {
			const id = action.slice(7) as PresetId;
			settings.presets[id].enabled = !settings.presets[id].enabled;
		}
		if (action === "tree") settings.treeFiltering = !settings.treeFiltering;
	});
}
function refresh() {
	const key = pullRequestKey(new URL(location.href));
	if (!key) {
		ui?.destroy();
		ui = null;
		session = null;
		signature = "";
		restoreVisibility();
		return;
	}
	if (session?.key !== key) {
		ui?.destroy();
		ui = null;
		restoreVisibility();
		session = createSession(key);
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
	const nextSignature = JSON.stringify([
		settings,
		paths,
		session.showingAll,
		[...session.revealed],
	]);
	if (signature !== nextSignature) {
		signature = nextSignature;
		ui.render(model, settings);
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
let lastUrl = location.href;
setInterval(() => {
	if (lastUrl !== location.href) {
		lastUrl = location.href;
		queueRefresh();
	}
}, 250);
watchSettings((next) => {
	settings = next;
	queueRefresh();
});
void readSettings().then((next) => {
	settings = next;
	refresh();
});
