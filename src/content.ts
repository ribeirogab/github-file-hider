import { toolbarAnchor } from "./github-page";
import { pullRequestKey } from "./route";

function refresh() {
	const key = pullRequestKey(new URL(location.href));
	const existing = document.getElementById("fh-control");
	if (!key) {
		existing?.remove();
		return;
	}
	const anchor = toolbarAnchor();
	if (!anchor || existing) return;
	const control = document.createElement("div");
	control.id = "fh-control";
	const button = document.createElement("button");
	button.type = "button";
	button.textContent = "Hide files";
	control.append(button);
	anchor.append(control);
}
let queued = false;
const observer = new MutationObserver(() => {
	if (queued) return;
	queued = true;
	requestAnimationFrame(() => {
		queued = false;
		refresh();
	});
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", refresh);
window.addEventListener("hashchange", refresh);
setInterval(refresh, 250);
refresh();
