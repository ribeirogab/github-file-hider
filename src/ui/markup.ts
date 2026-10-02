import type { ControlViewName, PageModel } from "../filtering-session";
import { copy, plural } from "./copy";
import { escapeHtml, icon, logo } from "./icons";

export type ControlView = {
	view: ControlViewName;
	hidden: number;
	match: number;
	auto: boolean;
};

export type MenuModel = Pick<
	PageModel,
	"view" | "pullRequestKey" | "active" | "filtering" | "presets" | "custom"
> & {
	auto: boolean;
	hidden: number;
	match: number;
	tree: boolean;
};

export const controlView = (model: PageModel): ControlView => ({
	view: model.view,
	hidden: model.hiddenCount,
	match: model.matchCount,
	auto: model.mode === "automatic",
});

export const menuModel = (model: PageModel): MenuModel => ({
	view: model.view,
	auto: model.mode === "automatic",
	pullRequestKey: model.pullRequestKey,
	active: model.active,
	filtering: model.filtering,
	hidden: model.hiddenCount,
	match: model.matchCount,
	tree: model.treeFiltering,
	presets: model.presets,
	custom: model.custom,
});

export const codeify = (text: string) =>
	escapeHtml(text).replace(/`([^`]+)`/g, '<code class="fh-code">$1</code>');

export const counterHtml = (n: number, accent = false, roll = false) =>
	`<span class="fh-counter${accent ? " is-accent" : ""}"><span class="fh-roll"${roll ? " data-roll" : ""} data-value="${n}"><span>${n}</span></span></span>`;

export const labelHtml = (text: string, variant = "") =>
	`<span class="fh-label${variant ? ` is-${variant}` : ""}">${text}</span>`;

const checkHtml = () =>
	`<span class="fh-check" aria-hidden="true">${icon("check")}</span>`;

export const switchVisual = (on: boolean, disabled = false) =>
	`<span class="fh-switch-track" data-on="${on}"${disabled ? ' data-disabled="true"' : ""} aria-hidden="true"><span class="fh-switch-knob"></span></span>`;

export const isSplit = (view: ControlViewName) =>
	view === "inactive" || view === "showing";

export const mainInner = (control: ControlView) =>
	`${icon("eyeOff")}<span>${control.view === "showing" ? copy.hideAgain : copy.hideFiles}</span>${counterHtml(control.match, false, true)}`;

export function menuInner(control: ControlView) {
	if (control.view === "filtering")
		return `<span class="fh-ctl-status">${icon("eyeOff", "fh-ctl-icon")}${counterHtml(control.hidden, true, true)}<span class="fh-ctl-noun">${copy.filesHidden(control.hidden)}</span>${control.auto ? labelHtml(copy.automatic, "accent") : ""}</span>${icon("caret", "fh-ctl-caret")}`;
	if (control.view === "empty")
		return `<span class="fh-ctl-status">${icon("eyeOff")}<span>${copy.hideFiles}</span></span>${icon("caret", "fh-ctl-caret")}`;
	return icon("caret", "fh-ctl-caret");
}

type ItemOptions = {
	key: string;
	role?: "menuitem" | "menuitemcheckbox";
	checked?: boolean;
	lead?: string;
	label: string;
	desc?: string;
	trail?: string;
	trailClass?: string;
	screenReader?: string;
};

function itemHtml({
	key,
	role = "menuitem",
	checked = false,
	lead = "",
	label,
	desc = "",
	trail = "",
	trailClass = "",
	screenReader = "",
}: ItemOptions) {
	const aria = role === "menuitemcheckbox" ? ` aria-checked="${checked}"` : "";
	return `<div class="fh-al-item" role="${role}" tabindex="-1" data-key="${key}"${aria}><span class="fh-al-lead">${lead}</span><span class="fh-al-content"><span class="fh-al-label">${label}${screenReader ? `<span class="fh-sr">${screenReader}</span>` : ""}</span>${desc ? `<span class="fh-al-desc">${desc}</span>` : ""}</span>${trail ? `<span class="fh-al-trail${trailClass ? ` ${trailClass}` : ""}" aria-hidden="true">${trail}</span>` : ""}</div>`;
}

function topItems(menu: MenuModel) {
	if (menu.view === "empty")
		return `<div class="fh-ov-empty"><span class="fh-ov-empty-visual">${icon("eyeOff")}</span><div><strong>${copy.menuEmptyTitle}</strong><p>${menu.auto ? copy.menuEmptyAuto : copy.menuEmptyManual}</p></div></div>`;
	let html = "";
	if (!menu.auto)
		html += itemHtml({
			key: "pr-toggle",
			role: "menuitemcheckbox",
			checked: menu.active,
			lead: icon("eyeOff"),
			label: copy.menuToggle,
			desc: copy.menuToggleDesc(escapeHtml(menu.pullRequestKey)),
			trail: switchVisual(menu.active),
			trailClass: "is-switch",
		});
	if (menu.view === "filtering")
		html += itemHtml({
			key: "show-all",
			lead: icon("eye"),
			label: copy.showAll,
			desc: menu.auto ? copy.menuShowAllAutoDesc : copy.menuShowAllDesc,
		});
	if (menu.view === "showing")
		html += itemHtml({
			key: "hide-again",
			lead: icon("eyeOff"),
			label: copy.hideAgain,
			desc: copy.menuHideAgainDesc,
			trail: counterHtml(menu.match),
			screenReader: `, ${menu.match} ${plural(menu.match, "file", "files")}`,
		});
	return html;
}

function customDescription(menu: MenuModel) {
	if (menu.custom.on)
		return menu.custom.preview
			.map((pattern) => `<code>${escapeHtml(pattern)}</code>`)
			.join(", ");
	return menu.custom.total
		? copy.menuCustomOff(menu.custom.total)
		: copy.menuCustomNone;
}

export function menuHtml(menu: MenuModel, uid = "live") {
	const head = `<div class="fh-ov-header">${logo(20)}<span class="fh-ov-title">${copy.product}</span>${labelHtml(menu.auto ? copy.automatic : copy.manual, menu.auto ? "accent" : "")}</div><div class="fh-al-divider" role="separator"></div>`;
	const presetItems = menu.presets
		.map((preset) =>
			itemHtml({
				key: `preset:${preset.id}`,
				role: "menuitemcheckbox",
				checked: preset.enabled,
				lead: checkHtml(),
				label: preset.name,
				trail: `<span class="fh-al-count${preset.enabled && menu.filtering ? " is-live" : ""}">${preset.count}</span>`,
				screenReader: `, ${preset.count} ${plural(preset.count, "file", "files")} ${preset.enabled && menu.filtering ? "hidden" : "match"}`,
			}),
		)
		.join("");
	const customItem = itemHtml({
		key: "custom",
		lead: icon("filter"),
		label: copy.customRules,
		desc: customDescription(menu),
		trail: `${menu.custom.on ? `<span class="fh-al-count${menu.filtering ? " is-live" : ""}">${menu.custom.count}</span>` : ""}${icon("chevronRight")}`,
	});
	const treeItem = itemHtml({
		key: "tree",
		role: "menuitemcheckbox",
		checked: menu.tree,
		lead: icon("sidebar"),
		label: copy.menuTree,
		desc: menu.tree ? copy.menuTreeOn : copy.menuTreeOff,
		trail: switchVisual(menu.tree),
		trailClass: "is-switch",
	});
	const settingsItem = itemHtml({
		key: "settings",
		lead: icon("gear"),
		label: copy.settings,
		trail: icon("linkExternal"),
	});
	return `${head}${topItems(menu)}<div class="fh-al-divider" role="separator"></div><div role="group" aria-labelledby="fh-menu-presets-${uid}"><p class="fh-al-heading" id="fh-menu-presets-${uid}">${copy.presets}<span class="fh-sr">, </span><span class="fh-al-heading-note">${copy.menuScope}</span></p>${presetItems}${customItem}<div class="fh-al-divider" role="separator"></div>${treeItem}</div><div class="fh-al-divider" role="separator"></div>${settingsItem}`;
}

export type NoticeKind = "file" | "comment";

export function noticeHtml(path: string, kind: NoticeKind, reasonHtml: string) {
	const detail =
		kind === "comment"
			? copy.noticeComment(reasonHtml)
			: copy.noticeFile(reasonHtml);
	return `<div class="fh-flash" role="region" aria-label="${copy.noticeLabel}" data-fh-notice="${escapeHtml(path)}" data-kind="${kind}"><span class="fh-flash-icon">${icon("info")}</span><div class="fh-flash-text"><p>${copy.notice}</p><p class="fh-flash-detail">${detail}</p></div><div class="fh-flash-actions"><button type="button" class="fh-btn is-small" data-fh-act="hide-revealed" data-path="${escapeHtml(path)}">${icon("eyeOff")}${copy.hideRevealed}</button></div></div>`;
}

export type BlankslateKind = "all" | "kept";

export function blankslateHtml(
	kind: BlankslateKind,
	allLoaded: boolean,
	keptCount: number,
) {
	const heading = kind === "kept" ? copy.emptyKept : copy.emptyAll;
	const body =
		kind === "kept"
			? copy.emptyKeptBody(keptCount)
			: copy.emptyAllBody(allLoaded);
	return `<div class="fh-blankslate" data-sig="${kind}|${allLoaded}|${keptCount}" role="region" aria-label="${heading}"><div class="fh-blankslate-visual">${icon("eyeOff")}</div><h2 class="fh-blankslate-heading">${heading}</h2><p class="fh-blankslate-desc">${body}</p><div class="fh-blankslate-actions"><button type="button" class="fh-btn is-primary" data-fh-act="show-all">${icon("eye")}${copy.showAll}</button><button type="button" class="fh-link" data-fh-act="edit-rules">${copy.editRules}</button></div></div>`;
}

export type FileLabelKind = "revealed" | "kept";

export const fileLabelHtml = (kind: FileLabelKind, tip: string) =>
	`<span class="fh-label fh-file-label${kind === "revealed" ? " is-accent" : ""}" data-kind="${kind}" data-fh-tip="${escapeHtml(tip)}" tabindex="0">${kind === "revealed" ? copy.labelRevealed : copy.labelKept}</span>`;

export type TreeHintKind = "hidden" | "revealed";

export const treeHintHtml = (kind: TreeHintKind, tip: string) =>
	`<span class="fh-tree-hint" data-kind="${kind}" role="img" aria-label="${escapeHtml(tip)}" data-fh-tip="${escapeHtml(tip)}">${icon(kind === "revealed" ? "eye" : "eyeOff")}</span>`;

export const treeEmptyHtml = () =>
	`<div class="fh-tree-empty">${icon("eyeOff")}<div><strong>${copy.treeEmptyTitle}</strong>${copy.treeEmptyBody} <button type="button" class="fh-link" data-fh-act="show-all">${copy.showAll}</button></div></div>`;
