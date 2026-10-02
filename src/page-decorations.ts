import type { PageModel } from "./filtering-session";
import { diffBlock, diffTop, treeRoot } from "./github-page";
import { blankslateHtml, treeEmptyHtml } from "./ui/markup";

function fromHtml(html: string) {
	const template = document.createElement("template");
	template.innerHTML = html;
	return template.content.firstElementChild as HTMLElement;
}

export function syncBlankslate(model: PageModel) {
	const loaded = model.files.filter((file) => diffBlock(file.path) !== null);
	const visible = loaded.filter((file) => file.state !== "hidden");
	const show =
		model.filtering &&
		loaded.length > 0 &&
		visible.every((file) => file.state === "kept");
	const current = document.querySelector<HTMLElement>(".fh-blankslate");
	const top = diffTop();
	if (!show || !top) {
		current?.remove();
		return;
	}
	const kind = visible.length ? "kept" : "all";
	const allLoaded = loaded.length === model.files.length;
	const signature = `${kind}|${allLoaded}|${visible.length}`;
	if (current?.dataset.sig === signature && current.parentElement === top)
		return;
	current?.remove();
	top.prepend(fromHtml(blankslateHtml(kind, allLoaded, visible.length)));
}

export function syncTreeNote(model: PageModel) {
	const tree = treeRoot();
	const current = document.querySelector<HTMLElement>(".fh-tree-empty");
	const show =
		model.filtering &&
		model.treeFiltering &&
		model.files.length > 0 &&
		model.files.every((file) => file.state === "hidden");
	if (!show || !tree) {
		current?.remove();
		return;
	}
	if (current && current.previousElementSibling === tree) return;
	current?.remove();
	tree.after(fromHtml(treeEmptyHtml()));
}

export function largestRulePage(model: PageModel) {
	const hidden = model.files.filter((file) => file.state === "hidden");
	const custom = hidden.filter(
		(file) => file.evaluation.reason?.kind === "custom",
	).length;
	return custom > hidden.length - custom ? "custom" : "presets";
}

export function removeDecorations() {
	for (const element of document.querySelectorAll(
		".fh-blankslate, .fh-tree-empty",
	))
		element.remove();
}
