import { type PullRequestKey, pullRequestKey } from "./settings";

export type Route = { key: PullRequestKey; singleFile: boolean };

const CHANGES_ROUTE =
	/^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/changes(?:\/[0-9a-f]{7,40}(?:\.\.[0-9a-f]{7,40})?)?\/?$/i;

export function parseRoute(url: URL): Route | null {
	if (url.hostname !== "github.com") return null;
	const match = CHANGES_ROUTE.exec(url.pathname);
	if (!match) return null;
	const [, owner = "", repo = "", number = ""] = match;
	return {
		key: pullRequestKey(owner, repo, number),
		singleFile: url.searchParams.get("mode") === "single",
	};
}

const digests = new Map<string, string>();
const pathsByDigest = new Map<string, string>();

async function sha256(text: string) {
	const buffer = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(text),
	);
	return [...new Uint8Array(buffer)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

export async function digestPaths(paths: readonly string[]) {
	const missing = paths.filter((path) => !digests.has(path));
	const computed = await Promise.all(missing.map(sha256));
	missing.forEach((path, index) => {
		const digest = computed[index] ?? "";
		digests.set(path, digest);
		pathsByDigest.set(digest, path);
	});
}

export const pathForDigest = (digest: string) => pathsByDigest.get(digest);

export const anchorFor = (path: string) => {
	const digest = digests.get(path);
	return digest ? `diff-${digest}` : null;
};

export function toolbarSlot(): HTMLElement | null {
	const toolbar = document.querySelector("section[data-file-tree-expanded]");
	return (
		toolbar?.querySelector<HTMLElement>(
			':scope > [data-component="Stack"][data-justify="start"]',
		) ?? null
	);
}

export function treeRoot(): HTMLElement | null {
	return document.querySelector<HTMLElement>('#pr-file-tree [role="tree"]');
}

function treeFiles(): HTMLElement[] {
	const root = treeRoot();
	if (!root) return [];
	return [
		...root.querySelectorAll<HTMLElement>('[role="treeitem"][id]'),
	].filter((item) => !item.hasAttribute("aria-expanded"));
}

export function treeFolders(): HTMLElement[] {
	const root = treeRoot();
	if (!root) return [];
	return [
		...root.querySelectorAll<HTMLElement>('[role="treeitem"][aria-expanded]'),
	];
}

export function diffBlocks(): HTMLElement[] {
	return [
		...document.querySelectorAll<HTMLElement>('[id^="diff-"][role="region"]'),
	].filter((block) => /^diff-[0-9a-f]{64}$/.test(block.id));
}

function headingPath(block: HTMLElement) {
	const heading = document.getElementById(
		block.getAttribute("aria-labelledby") ?? "",
	);
	return heading?.textContent?.replace(/[‎‏]/g, "").trim() ?? null;
}

export function listedPaths(): string[] {
	const files = treeFiles();
	if (files.length) return files.map((item) => item.id);
	return diffBlocks().flatMap((block) => {
		const path = headingPath(block);
		return path ? [path] : [];
	});
}

export function treeItem(path: string): HTMLElement | null {
	const element = document.getElementById(path);
	return element?.getAttribute("role") === "treeitem" ? element : null;
}

export function treeRowContent(item: HTMLElement): HTMLElement | null {
	return item.querySelector<HTMLElement>(":scope > div > div:last-child");
}

export function diffBlock(path: string): HTMLElement | null {
	const anchor = anchorFor(path);
	return anchor ? document.getElementById(anchor) : null;
}

export function diffEntry(block: HTMLElement): HTMLElement {
	const parent = block.parentElement;
	return parent?.parentElement?.matches(
		'[data-testid="progressive-diffs-list"]',
	)
		? parent
		: block;
}

export function fileHeaderActions(block: HTMLElement): HTMLElement | null {
	const header = block.querySelector<HTMLElement>(
		"[data-diff-header-wrapper] > div",
	);
	return header?.lastElementChild instanceof HTMLElement
		? header.lastElementChild
		: null;
}

export function diffTop(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-testid="diff-content"]');
}

export function openFilePath(): string | null {
	const [block] = diffBlocks();
	if (!block) return null;
	return pathForDigest(block.id.slice(5)) ?? headingPath(block);
}

export type LinkTarget = {
	path: string;
	kind: "file" | "comment";
	line: string | null;
};

type ChangesRoute = {
	diffSummaries?: {
		path?: string;
		markersMap?: Record<string, { threads?: { id: number }[] }>;
	}[];
	markers?: {
		threads?: Record<
			string,
			{ commentsData?: { comments?: { databaseId?: number }[] } }
		>;
	};
};

function changesRoute(): ChangesRoute | null {
	for (const script of document.querySelectorAll(
		'script[type="application/json"]',
	)) {
		try {
			const data = JSON.parse(script.textContent ?? "{}");
			const route = data?.payload?.pullRequestsChangesRoute;
			if (route) return route as ChangesRoute;
		} catch {}
	}
	return null;
}

function commentTarget(commentId: string): LinkTarget | null {
	const route = changesRoute();
	for (const summary of route?.diffSummaries ?? []) {
		for (const [line, markers] of Object.entries(summary.markersMap ?? {}))
			for (const thread of markers.threads ?? []) {
				const comments =
					route?.markers?.threads?.[String(thread.id)]?.commentsData
						?.comments ?? [];
				if (
					summary.path &&
					comments.some((comment) => String(comment.databaseId) === commentId)
				)
					return { path: summary.path, kind: "comment", line };
			}
	}
	return null;
}

export function linkTarget(hash: string): LinkTarget | null {
	const file = /^#diff-([0-9a-f]{64})([LR]\d+(?:-[LR]?\d+)?)?$/.exec(hash);
	if (file) {
		const path = pathForDigest(file[1] ?? "");
		return path ? { path, kind: "file", line: file[2] ?? null } : null;
	}
	const comment = /^#r(\d+)$/.exec(hash);
	return comment ? commentTarget(comment[1] ?? "") : null;
}

export function targetLine(block: HTMLElement, line: string | null) {
	if (!line) return null;
	const side = line.startsWith("L") ? "left" : "right";
	const number = /^[LR]?(\d+)/.exec(line)?.[1];
	return block.querySelector<HTMLElement>(
		`[data-diff-side="${side}"][data-line-number="${number}"]`,
	);
}

export function clearHash() {
	history.replaceState(
		history.state,
		"",
		`${location.pathname}${location.search}`,
	);
}
