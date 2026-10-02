import { derivePage, initialSession } from "./filtering-session";
import {
	listedPaths,
	parseRoute,
	type Route,
	toolbarSlot,
} from "./github-page";
import { firstInstallSettings } from "./settings";
import { createPageUi, type PageUi } from "./ui/page-ui";

type Mounted = { route: Route; ui: PageUi };

let mounted: Mounted | null = null;
let scheduled = false;

function mount(route: Route): Mounted {
	return { route, ui: createPageUi({ onMain: () => {} }) };
}

function unmount() {
	mounted?.ui.remove();
	mounted = null;
}

function render(state: Mounted) {
	state.ui.update(
		derivePage({
			settings: firstInstallSettings(),
			pullRequestKey: state.route.key,
			paths: listedPaths(),
			session: initialSession(),
		}),
	);
}

function sync() {
	scheduled = false;
	const route = parseRoute(new URL(location.href));
	const slot = route ? toolbarSlot() : null;
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
	render(mounted);
}

function schedule() {
	if (scheduled) return;
	scheduled = true;
	queueMicrotask(sync);
}

const ownNode = (node: Node) =>
	node instanceof Element &&
	((node.getAttribute("class") ?? "").startsWith("fh-") ||
		node.closest(".fh-ctl, .fh-overlay") !== null);

new MutationObserver((records) => {
	if (
		records.some(
			(record) =>
				![...record.addedNodes, ...record.removedNodes].every(ownNode),
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

schedule();
