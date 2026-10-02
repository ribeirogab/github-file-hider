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
	for (const el of document.querySelectorAll(".fh-hidden, .fh-target-line"))
		el.classList.remove("fh-hidden", "fh-target-line");
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
export type LinkTarget = {
	path: string;
	line: string | null;
	commentId: string | null;
};
type PageData = {
	diffSummaries?: {
		path: string;
		markersMap?: Record<string, { threads?: { id: number }[] }>;
	}[];
	markers?: {
		threads?: Record<
			string,
			{ commentsData?: { comments?: { databaseId: number }[] } }
		>;
	};
};
function pageData(): PageData | null {
	for (const script of document.querySelectorAll(
		'script[type="application/json"]',
	)) {
		try {
			const data = JSON.parse(script.textContent ?? "{}");
			if (data?.payload?.pullRequestsChangesRoute)
				return data.payload.pullRequestsChangesRoute as PageData;
		} catch {}
	}
	return null;
}
const pathDigests = new Map<string, Promise<string>>();
export function pathDigest(path: string): Promise<string> {
	let digest = pathDigests.get(path);
	if (!digest) {
		digest = crypto.subtle
			.digest("SHA-256", new TextEncoder().encode(path))
			.then((buffer) =>
				[...new Uint8Array(buffer)]
					.map((byte) => byte.toString(16).padStart(2, "0"))
					.join(""),
			);
		pathDigests.set(path, digest);
	}
	return digest;
}
export async function directLinkTarget(
	paths: string[],
): Promise<LinkTarget | null> {
	const hash = location.hash;
	const fileLink = /^#diff-([a-f0-9]{64})([LR]\d+(?:-[LR]?\d+)?)?$/.exec(hash);
	if (fileLink) {
		const entries = await Promise.all(
			paths.map(async (path) => ({ path, digest: await pathDigest(path) })),
		);
		const path = entries.find((entry) => entry.digest === fileLink[1])?.path;
		return path ? { path, line: fileLink[2] ?? null, commentId: null } : null;
	}
	const commentLink = /^#r(\d+)$/.exec(hash);
	if (!commentLink) return null;
	const data = pageData();
	if (!data) return null;
	for (const summary of data.diffSummaries ?? []) {
		if (!paths.includes(summary.path)) continue;
		for (const [line, markers] of Object.entries(summary.markersMap ?? {}))
			for (const thread of markers.threads ?? []) {
				const comments =
					data.markers?.threads?.[String(thread.id)]?.commentsData?.comments ??
					[];
				if (
					comments.some(
						(comment) => String(comment.databaseId) === commentLink[1],
					)
				)
					return {
						path: summary.path,
						line,
						commentId: commentLink[1] ?? null,
					};
			}
	}
	return null;
}
export function placeFileNotice(path: string, notice: HTMLElement) {
	const block = diffBlock(path);
	if (block && notice.nextElementSibling !== block) block.before(notice);
}
export function scrollToTarget(target: LinkTarget): boolean {
	const block = diffBlock(target.path);
	if (!block) return false;
	let line: Element | null = null;
	if (target.line) {
		const side = target.line.startsWith("L") ? "left" : "right";
		const number = /^\w(\d+)/.exec(target.line)?.[1];
		line = block.querySelector(
			`[data-diff-side="${side}"][data-line-number="${number}"][data-line-anchor]`,
		);
	}
	for (const previous of document.querySelectorAll(".fh-target-line"))
		previous.classList.remove("fh-target-line");
	line?.classList.add("fh-target-line");
	(line ?? block).scrollIntoView({ block: "center", behavior: "instant" });
	return true;
}
export function removeDirectLink() {
	for (const previous of document.querySelectorAll(".fh-target-line"))
		previous.classList.remove("fh-target-line");
	history.replaceState(
		history.state,
		"",
		`${location.pathname}${location.search}`,
	);
}
