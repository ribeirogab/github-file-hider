export function toolbarAnchor(): Element | null {
	const toolbar = document.querySelector("[data-file-tree-expanded]");
	return (
		toolbar?.querySelector(
			'[data-direction="horizontal"][data-justify="start"]',
		) ?? null
	);
}
export function listedPaths(): string[] {
	return [...document.querySelectorAll<HTMLElement>('[role="treeitem"][id]')]
		.filter((row) => !row.hasAttribute("aria-expanded"))
		.map((row) => row.id);
}
export function treeEntry(path: string): HTMLElement | null {
	const element = document.getElementById(path);
	return element?.getAttribute("role") === "treeitem" ? element : null;
}
export function diffBlock(path: string): HTMLElement | null {
	for (const block of document.querySelectorAll<HTMLElement>(
		'[id^="diff-"][role="region"]',
	)) {
		const heading = document.getElementById(
			block.getAttribute("aria-labelledby") ?? "",
		);
		if (
			heading?.textContent?.replace(/[\u200e\u200f]/g, "").trim() === path ||
			block
				.querySelector("[data-file-path]")
				?.getAttribute("data-file-path") === path
		)
			return block;
	}
	return null;
}
export function applyVisibility(
	files: { path: string; state: string }[],
	treeFiltering: boolean,
) {
	for (const file of files) {
		diffBlock(file.path)?.classList.toggle(
			"fh-hidden",
			file.state === "hidden",
		);
		treeEntry(file.path)?.classList.toggle(
			"fh-hidden",
			treeFiltering && file.state === "hidden",
		);
	}
	for (const folder of [
		...document.querySelectorAll<HTMLElement>(
			'[role="treeitem"][aria-expanded]',
		),
	].reverse()) {
		const leaves = [
			...folder.querySelectorAll<HTMLElement>('[role="treeitem"]'),
		].filter((row) => !row.hasAttribute("aria-expanded"));
		folder.classList.toggle(
			"fh-hidden",
			treeFiltering &&
				leaves.length > 0 &&
				leaves.every((row) => row.classList.contains("fh-hidden")),
		);
	}
}
export function restoreVisibility() {
	for (const el of document.querySelectorAll(".fh-hidden"))
		el.classList.remove("fh-hidden");
}
export function placeEmptyStates(diff: HTMLElement, tree: HTMLElement) {
	const first = document.querySelector('[id^="diff-"][role="region"]');
	if (first && diff.parentElement !== first.parentElement) first.before(diff);
	const treeRoot = document.querySelector('[role="tree"]');
	if (treeRoot && tree.previousElementSibling !== treeRoot)
		treeRoot.after(tree);
}
export function placeFileLabel(path: string, label: HTMLElement) {
	const header = diffBlock(path)?.querySelector("[data-diff-header-wrapper]");
	if (header && label.parentElement !== header) header.append(label);
}
