import type { ListedFile, PageModel } from "./filtering-session";
import {
	diffBlock,
	diffEntry,
	diffTop,
	fileHeaderActions,
	treeRoot,
} from "./github-page";
import {
	blankslateHtml,
	type FileLabelKind,
	fileLabelHtml,
	fileLabelTip,
	type NoticeKind,
	noticeHtml,
	noticeReason,
	treeEmptyHtml,
} from "./ui/markup";

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

export type RevealKind = { kind: NoticeKind };

export function syncNotices(
	model: PageModel,
	reveals: ReadonlyMap<string, RevealKind>,
) {
	const wanted = model.files.filter(
		(file) => file.state === "revealed" && reveals.has(file.path),
	);
	const paths = new Set(wanted.map((file) => file.path));
	for (const notice of document.querySelectorAll<HTMLElement>(
		".fh-flash[data-fh-notice]",
	)) {
		const path = notice.dataset.fhNotice ?? "";
		const block = diffBlock(path);
		if (
			!paths.has(path) ||
			!block ||
			notice.nextElementSibling !== diffEntry(block) ||
			notice.dataset.kind !== reveals.get(path)?.kind
		)
			notice.remove();
	}
	for (const file of wanted) {
		const block = diffBlock(file.path);
		if (!block) continue;
		const entry = diffEntry(block);
		const previous = entry.previousElementSibling as HTMLElement | null;
		if (previous?.dataset.fhNotice === file.path) continue;
		entry.before(
			fromHtml(
				noticeHtml(
					file.path,
					reveals.get(file.path)?.kind ?? "file",
					noticeReason(file.evaluation),
				),
			),
		);
	}
}

const labelKind = (file: ListedFile): FileLabelKind | null =>
	file.state === "revealed"
		? "revealed"
		: file.state === "kept"
			? "kept"
			: null;

export function syncFileStates(model: PageModel) {
	for (const file of model.files) {
		const block = diffBlock(file.path);
		if (!block) continue;
		block.classList.toggle("fh-revealed", file.state === "revealed");
		const actions = fileHeaderActions(block);
		const current = actions?.querySelector<HTMLElement>(
			":scope > .fh-file-label",
		);
		const kind = labelKind(file);
		if (!kind || !actions) {
			current?.remove();
			continue;
		}
		const tip = fileLabelTip(kind, file.evaluation);
		if (current?.dataset.kind === kind) {
			current.dataset.fhTip = tip;
			continue;
		}
		current?.remove();
		actions.prepend(fromHtml(fileLabelHtml(kind, tip)));
	}
}

export function removeDecorations() {
	for (const element of document.querySelectorAll(
		".fh-blankslate, .fh-tree-empty, .fh-flash[data-fh-notice], .fh-file-label",
	))
		element.remove();
}
