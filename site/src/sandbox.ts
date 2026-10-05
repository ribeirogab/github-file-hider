import { reasonPhrase, validatePattern } from "../../src/rules.ts";
import { copy, plural } from "../../src/ui/copy.ts";
import {
	DEMO_FILES,
	type DemoFile,
	EXPANDED_FILE,
	PAYMENTS_DIFF,
	PAYMENTS_HUNK,
} from "./demo.ts";
import {
	alwaysKey,
	customKey,
	derive,
	initialState,
	type Model,
	type SandboxState,
} from "./model.ts";

type TreeRow = {
	kind: "dir" | "file";
	name: string;
	path: string;
	depth: number;
	ancestors: string[];
	files: string[];
	file: DemoFile | null;
};

type TreeNode = {
	name: string;
	dirs: Map<string, TreeNode>;
	files: DemoFile[];
};

type RuleList = "custom" | "always";

const escapeHtml = (value: string) =>
	value.replace(
		/[&<>"]/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ??
			character,
	);

const icon = (name: string, className = "") =>
	`<svg class="i ${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

function byId<T extends Element>(id: string, type: { new (): T }): T {
	const found = document.getElementById(id);
	if (!(found instanceof type)) throw new Error(`Missing #${id}`);
	return found;
}

function inside<T extends Element>(
	root: ParentNode,
	selector: string,
	type: { new (): T },
): T {
	const found = root.querySelector(selector);
	if (!(found instanceof type)) throw new Error(`Missing ${selector}`);
	return found;
}

const targetOf = (event: Event) =>
	event.target instanceof Element ? event.target : null;

const compareNames = (a: string, b: string) =>
	a.localeCompare(b, "en", { sensitivity: "base" });

const baseName = (path: string) => path.split("/").pop() ?? path;

function treeOf(files: readonly DemoFile[]) {
	const root: TreeNode = { name: "", dirs: new Map(), files: [] };
	for (const file of files) {
		let node = root;
		for (const part of file.path.split("/").slice(0, -1)) {
			let child = node.dirs.get(part);
			if (!child) {
				child = { name: part, dirs: new Map(), files: [] };
				node.dirs.set(part, child);
			}
			node = child;
		}
		node.files.push(file);
	}
	return root;
}

function collapseSingleChild(dir: TreeNode, path: string) {
	let node = dir;
	let name = dir.name;
	let fullPath = path;
	while (node.files.length === 0 && node.dirs.size === 1) {
		const [only] = node.dirs.values();
		if (!only) break;
		name += `/${only.name}`;
		fullPath += `/${only.name}`;
		node = only;
	}
	return { node, name, path: fullPath };
}

function buildRows(files: readonly DemoFile[]) {
	const rows: TreeRow[] = [];
	const walk = (
		node: TreeNode,
		depth: number,
		prefix: string,
		ancestors: string[],
	) => {
		const dirs = [...node.dirs.values()].sort((a, b) =>
			compareNames(a.name, b.name),
		);
		for (const dir of dirs) {
			const merged = collapseSingleChild(dir, prefix + dir.name);
			rows.push({
				kind: "dir",
				name: merged.name,
				path: merged.path,
				depth,
				ancestors,
				files: files
					.filter((file) => file.path.startsWith(`${merged.path}/`))
					.map((file) => file.path),
				file: null,
			});
			walk(merged.node, depth + 1, `${merged.path}/`, [
				...ancestors,
				merged.path,
			]);
		}
		const sorted = [...node.files].sort((a, b) =>
			compareNames(baseName(a.path), baseName(b.path)),
		);
		for (const file of sorted)
			rows.push({
				kind: "file",
				name: baseName(file.path),
				path: file.path,
				depth,
				ancestors,
				files: [],
				file,
			});
	};
	walk(treeOf(files), 0, "", []);
	return rows;
}

function fileIconName(file: DemoFile) {
	if (file.status === "added") return "file-add";
	if (file.status === "renamed") return "file-ren";
	return "file-diff";
}

function treeRowHtml(row: TreeRow) {
	const key = escapeHtml(`${row.kind}:${row.path}`);
	if (row.kind === "dir")
		return `<li class="tr" data-key="${key}"><div class="row-in"><button type="button" class="tr-btn" data-depth="${row.depth}" aria-expanded="true" data-dir="${escapeHtml(row.path)}">${icon("chev-d", "tr-chev")}${icon("folder", "tr-folder")}<span class="tr-name">${escapeHtml(row.name)}</span></button></div></li>`;
	const file = row.file;
	const added = file?.status === "added" ? " is-added" : "";
	const fileIcon = file ? fileIconName(file) : "file-diff";
	return `<li class="tr" data-key="${key}"><div class="row-in"><button type="button" class="tr-btn" data-depth="${row.depth}" data-file="${escapeHtml(row.path)}"><span class="tr-pad"></span>${icon(fileIcon, `tr-file${added}`)}<span class="tr-name">${escapeHtml(row.name)}</span><span class="tr-hint" aria-hidden="true">${icon("eye-off")}</span><span class="sr tr-tip"></span></button></div></li>`;
}

function diffBodyHtml() {
	const lines = PAYMENTS_DIFF.map((line) => {
		const sign = line.kind === "add" ? "+" : line.kind === "del" ? "-" : " ";
		const tone = line.kind === "context" ? "" : line.kind;
		return `<span class="n ${tone}">${line.oldNumber ?? ""}</span><span class="n ${tone}">${line.newNumber ?? ""}</span><span class="s ${tone}">${sign}</span><span class="${tone}">${escapeHtml(line.text)}</span>`;
	}).join("");
	return `<div class="dl"><span class="hunk">${PAYMENTS_HUNK}</span>${lines}</div>`;
}

function diffSectionHtml(file: DemoFile) {
	const expanded = file.path === EXPANDED_FILE;
	const path = file.from
		? `<span class="from">${escapeHtml(file.from)} &rarr; </span>${escapeHtml(file.path)}`
		: escapeHtml(file.path);
	const stat = expanded
		? `<span class="df-stat"><span class="add">+9</span><span class="del">&minus;1</span><span class="gh-squares"><span></span><span></span><span></span><span></span><span class="is-del"></span></span></span>`
		: "";
	return `<section class="df" data-path="${escapeHtml(file.path)}" aria-label="${escapeHtml(file.path)}"><div class="row-in"><div class="fh-flash" role="region" aria-label="${copy.noticeLabel}" hidden>${icon("info")}<div><p>${copy.notice}</p><p class="fh-flash-detail"></p></div><button type="button" class="fh-btn" data-hide-again="${escapeHtml(file.path)}">${icon("eye-off")}${copy.hideRevealed}</button></div><div class="df-file${expanded ? " has-body" : ""}"><div class="df-head">${icon(expanded ? "chev-d" : "chev-r")}<span class="df-path">${path}</span><span class="df-labels"></span><span class="df-spacer"></span>${stat}<span class="df-viewed" aria-hidden="true"><span class="df-box"></span>Viewed</span></div>${expanded ? diffBodyHtml() : ""}</div></div></section>`;
}

function customRuleHtml(rule: SandboxState["custom"][number]) {
	const pattern = escapeHtml(rule.pattern);
	return `<li class="fh-rule${rule.enabled ? "" : " is-off"}" data-id="${rule.id}"><label class="fh-rule-main"><input type="checkbox" class="fh-cb" data-custom-toggle="${rule.id}"${rule.enabled ? " checked" : ""}><span class="fh-check" aria-hidden="true">${icon("check")}</span><code>${pattern}</code><span class="sr" data-count-sr="${customKey(rule.id)}"></span></label><span class="fh-al-count" data-count="${customKey(rule.id)}" aria-hidden="true"></span><button type="button" class="fh-rule-x" data-remove="custom" data-id="${rule.id}" aria-label="${copy.settingsPage.remove} ${pattern}">${icon("x")}</button></li>`;
}

function alwaysRuleHtml(rule: SandboxState["always"][number]) {
	const pattern = escapeHtml(rule.pattern);
	return `<li class="fh-rule" data-id="${rule.id}"><span class="fh-rule-main is-static">${icon("eye", "lead")}<code>${pattern}</code><span class="sr" data-count-sr="${alwaysKey(rule.id)}"></span></span><span class="fh-al-count" data-count="${alwaysKey(rule.id)}" aria-hidden="true"></span><button type="button" class="fh-rule-x" data-remove="always" data-id="${rule.id}" aria-label="${copy.settingsPage.remove} ${pattern}">${icon("x")}</button></li>`;
}

const reasonWithPattern = (
	reason: Parameters<typeof reasonPhrase>[0],
	pattern = reason?.pattern ?? "",
) => `${reasonPhrase(reason)} (${pattern})`;

export function startSandbox() {
	const narrow = matchMedia("(max-width: 719.98px)");
	const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
	let state = initialState(!narrow.matches);
	let lastView: Model["view"] | null = null;
	let ruleSequence = 0;

	const gh = byId("gh", HTMLDivElement);
	const toolbar = byId("gh-toolbar", HTMLDivElement);
	const control = byId("fh-ctl", HTMLDivElement);
	const mainButton = byId("fh-main", HTMLButtonElement);
	const mainLabel = byId("fh-main-label", HTMLSpanElement);
	const mainCount = byId("fh-main-count", HTMLSpanElement);
	const separator = byId("fh-sep", HTMLSpanElement);
	const menuButton = byId("fh-menu-btn", HTMLButtonElement);
	const status = byId("fh-status", HTMLSpanElement);
	const statusCounter = byId("fh-status-counter", HTMLSpanElement);
	const statusCount = byId("fh-status-count", HTMLSpanElement);
	const noun = byId("fh-noun", HTMLSpanElement);
	const menu = byId("fh-menu", HTMLDivElement);
	const emptyBox = byId("fh-empty", HTMLDivElement);
	const pullRequestSwitch = byId("fh-pr", HTMLButtonElement);
	const showButton = byId("fh-show", HTMLButtonElement);
	const showIcon = byId("fh-show-use", SVGUseElement);
	const showLabel = byId("fh-show-label", HTMLSpanElement);
	const showDescription = byId("fh-show-desc", HTMLSpanElement);
	const showTrail = byId("fh-show-trail", HTMLSpanElement);
	const showCount = byId("fh-show-count", HTMLSpanElement);
	const treeSwitch = byId("fh-tree", HTMLButtonElement);
	const treeDescription = byId("fh-tree-desc", HTMLSpanElement);
	const customList = byId("fh-custom-list", HTMLUListElement);
	const customNote = byId("fh-custom-note", HTMLSpanElement);
	const alwaysList = byId("fh-always-list", HTMLUListElement);
	const alwaysToggle = byId("fh-always-toggle", HTMLButtonElement);
	const treeList = byId("tree-list", HTMLUListElement);
	const treeEmpty = byId("tree-empty", HTMLDivElement);
	const treePanel = inside(document, ".gh-tree", HTMLElement);
	const filterInput = byId("gh-filter", HTMLInputElement);
	const diffPane = byId("gh-diff", HTMLElement);
	const diffList = byId("diff-list", HTMLDivElement);
	const blank = byId("fh-blank", HTMLDivElement);
	const blankTitle = byId("fh-blank-title", HTMLHeadingElement);
	const blankBody = byId("fh-blank-body", HTMLParagraphElement);
	const shownReadout = byId("ro-shown", HTMLElement);
	const live = byId("live", HTMLParagraphElement);
	const reset = byId("reset", HTMLButtonElement);
	const forms = {
		custom: {
			form: byId("fh-custom-form", HTMLFormElement),
			input: byId("fh-custom-input", HTMLInputElement),
			error: byId("fh-custom-error", HTMLParagraphElement),
		},
		always: {
			form: byId("fh-always-form", HTMLFormElement),
			input: byId("fh-always-input", HTMLInputElement),
			error: byId("fh-always-error", HTMLParagraphElement),
		},
	};

	const rows = buildRows(DEMO_FILES);
	const fileOrder = rows.flatMap((row) => (row.file ? [row.file] : []));
	const treeRows = new Map<string, HTMLLIElement>();
	const diffSections = new Map<string, HTMLElement>();

	function renderTree() {
		treeList.innerHTML = rows.map(treeRowHtml).join("");
		for (const item of treeList.querySelectorAll<HTMLLIElement>("li.tr")) {
			treeRows.set(item.dataset.key ?? "", item);
			const button = inside(item, ".tr-btn", HTMLButtonElement);
			button.style.setProperty("--d", button.dataset.depth ?? "0");
		}
	}

	function renderDiff() {
		diffList.innerHTML = fileOrder.map(diffSectionHtml).join("");
		for (const section of diffList.querySelectorAll<HTMLElement>("section.df"))
			diffSections.set(section.dataset.path ?? "", section);
	}

	function renderLists() {
		customList.innerHTML = state.custom.length
			? state.custom.map(customRuleHtml).join("")
			: `<li class="fh-rules-empty">${copy.menuCustomNone}</li>`;
		alwaysList.innerHTML = state.always.length
			? state.always.map(alwaysRuleHtml).join("")
			: `<li class="fh-rules-empty">${copy.settingsPage.alwaysEmptyTitle}</li>`;
	}

	function setCount(element: HTMLElement, value: number, animate: boolean) {
		const next = String(value);
		if (element.dataset.value === next) return;
		const previous = element.dataset.value;
		element.dataset.value = next;
		const still =
			!animate ||
			previous === undefined ||
			reduceMotion.matches ||
			gh.classList.contains("is-still");
		if (still) {
			element.innerHTML = `<span>${next}</span>`;
			return;
		}
		element.style.setProperty(
			"--dir",
			Number(next) > Number(previous) ? "1" : "-1",
		);
		for (const child of [...element.children].slice(0, -1)) child.remove();
		const outgoing = element.lastElementChild;
		if (outgoing) {
			outgoing.className = "roll-out";
			outgoing.addEventListener("animationend", () => outgoing.remove(), {
				once: true,
			});
		}
		const incoming = document.createElement("span");
		incoming.className = "roll-in";
		incoming.textContent = next;
		element.append(incoming);
	}

	function syncControl(model: Model) {
		const split = model.view === "inactive" || model.view === "showing";
		control.dataset.view = model.view;
		control.toggleAttribute("data-split", split);
		const mainHadFocus = document.activeElement === mainButton;
		mainButton.hidden = !split;
		separator.hidden = !split;
		status.hidden = split;
		mainLabel.textContent =
			model.view === "showing" ? copy.hideAgain : copy.hideFiles;
		setCount(mainCount, model.match, true);
		mainButton.title =
			model.view === "showing" ? copy.tipHideAgain : copy.tipHide(model.match);
		if (model.view === "filtering") {
			statusCounter.hidden = false;
			setCount(statusCount, model.hidden, true);
			noun.textContent = copy.filesHidden(model.hidden);
		} else {
			statusCounter.hidden = true;
			noun.textContent = copy.hideFiles;
		}
		if (split) menuButton.setAttribute("aria-label", `${copy.product} menu`);
		else menuButton.removeAttribute("aria-label");
		menuButton.title = model.view === "empty" ? copy.tipEmpty : "";
		if (
			lastView !== null &&
			lastView !== model.view &&
			model.view === "filtering"
		) {
			status.classList.remove("is-pop");
			void status.offsetWidth;
			status.classList.add("is-pop");
		}
		if (mainHadFocus && mainButton.hidden) menuButton.focus();
	}

	function syncCounts(model: Model) {
		for (const element of menu.querySelectorAll<HTMLElement>("[data-count]")) {
			const key = element.dataset.count ?? "";
			element.textContent = String(model.counts.get(key) ?? 0);
			element.classList.toggle("is-live", model.live.get(key) === true);
		}
		for (const element of menu.querySelectorAll<HTMLElement>(
			"[data-count-sr]",
		)) {
			const key = element.dataset.countSr ?? "";
			const count = model.counts.get(key) ?? 0;
			const verb = key.startsWith("always")
				? "kept visible"
				: model.live.get(key)
					? "hidden"
					: plural(count, "matches", "match");
			element.textContent = `, ${count} ${plural(count, "file", "files")} ${verb}`;
		}
	}

	function syncShowAll(model: Model) {
		showButton.hidden = !(
			model.view === "filtering" || model.view === "showing"
		);
		if (model.view === "showing") {
			showIcon.setAttribute("href", "#i-eye-off");
			showLabel.innerHTML = `${copy.hideAgain}<span class="sr">, ${model.match} ${plural(model.match, "file", "files")}</span>`;
			showDescription.textContent = copy.menuHideAgainDesc;
			showTrail.hidden = false;
			setCount(showCount, model.match, true);
			return;
		}
		showIcon.setAttribute("href", "#i-eye");
		showLabel.textContent = copy.showAll;
		showDescription.textContent = copy.menuShowAllDesc;
		showTrail.hidden = true;
	}

	function syncMenu(model: Model) {
		menu.hidden = !state.menuOpen;
		menuButton.setAttribute("aria-expanded", String(state.menuOpen));
		const empty = model.view === "empty";
		emptyBox.hidden = !empty;
		pullRequestSwitch.hidden = empty;
		pullRequestSwitch.setAttribute("aria-checked", String(state.active));
		syncShowAll(model);
		for (const input of menu.querySelectorAll<HTMLInputElement>(
			"[data-preset]",
		)) {
			const preset = input.dataset.preset;
			if (preset === "tests" || preset === "lockfiles")
				input.checked = state.presets[preset];
		}
		syncCounts(model);
		for (const row of customList.querySelectorAll<HTMLElement>(".fh-rule")) {
			const rule = state.custom.find(
				(candidate) => candidate.id === row.dataset.id,
			);
			if (rule) row.classList.toggle("is-off", !rule.enabled);
		}
		const enabled = state.custom.filter((rule) => rule.enabled).length;
		customNote.textContent = state.custom.length
			? copy.settingsPage.rulesOn(enabled, state.custom.length)
			: "";
		treeSwitch.setAttribute("aria-checked", String(state.tree));
		treeDescription.textContent = state.tree
			? copy.menuTreeOn
			: copy.menuTreeOff;
	}

	function treeTip(model: Model, path: string) {
		const file = model.byPath.get(path);
		if (!file) return "";
		if (file.state === "hidden" && !state.tree)
			return copy.tipTreeHidden(reasonWithPattern(file.evaluation.reason));
		if (file.state === "revealed") return copy.tipTreeRevealed;
		return "";
	}

	function syncTree(model: Model) {
		const query = state.filter.trim().toLowerCase();
		const passesFilter = (path: string) =>
			!query || path.toLowerCase().includes(query);
		const leavesTree = (path: string) =>
			model.byPath.get(path)?.state === "hidden" && state.tree;
		for (const row of rows) {
			const item = treeRows.get(`${row.kind}:${row.path}`);
			if (!item) continue;
			const button = inside(item, ".tr-btn", HTMLButtonElement);
			const collapsed = row.ancestors.some((ancestor) =>
				state.collapsed.has(ancestor),
			);
			let gone: boolean;
			if (row.kind === "dir") {
				gone =
					collapsed ||
					!row.files.some((path) => !leavesTree(path) && passesFilter(path));
				button.setAttribute(
					"aria-expanded",
					String(!state.collapsed.has(row.path)),
				);
			} else {
				const file = model.byPath.get(row.path);
				const muted = file?.state === "hidden" && !state.tree;
				const revealed = file?.state === "revealed";
				gone = collapsed || leavesTree(row.path) || !passesFilter(row.path);
				item.classList.toggle("is-muted", muted);
				item.classList.toggle("is-revealed", revealed);
				inside(item, ".tr-hint use", SVGUseElement).setAttribute(
					"href",
					revealed ? "#i-eye" : "#i-eye-off",
				);
				const tip = treeTip(model, row.path);
				inside(item, ".tr-tip", HTMLSpanElement).textContent = tip
					? `. ${tip}`
					: "";
				button.title = tip;
				button.setAttribute("aria-current", String(state.current === row.path));
			}
			item.classList.toggle("is-gone", gone);
			item.inert = gone;
		}
		treeEmpty.hidden = !(
			model.filtering &&
			state.tree &&
			model.files.every((file) => file.state === "hidden")
		);
	}

	function syncLabels(section: HTMLElement, file: Model["files"][number]) {
		const labels = inside(section, ".df-labels", HTMLSpanElement);
		const { evaluation } = file;
		if (file.state === "kept" && evaluation.reason) {
			labels.innerHTML = `<span class="fh-label" title="${escapeHtml(copy.tipKept(evaluation.reason.pattern, reasonWithPattern(evaluation.overridden)))}">${copy.labelKept}</span>`;
		} else if (file.state === "revealed") {
			labels.innerHTML = `<span class="fh-label is-accent" title="${escapeHtml(copy.tipRevealed)}">${copy.labelRevealed}</span>`;
		} else {
			labels.innerHTML = "";
		}
		const notice = inside(section, ".fh-flash", HTMLDivElement);
		notice.hidden = file.state !== "revealed";
		if (file.state === "revealed")
			inside(section, ".fh-flash-detail", HTMLParagraphElement).innerHTML =
				copy.noticeFile(
					`${reasonPhrase(evaluation.reason)} <code>${escapeHtml(evaluation.reason?.pattern ?? "")}</code>`,
				);
	}

	function syncDiff(model: Model) {
		for (const file of model.files) {
			const section = diffSections.get(file.path);
			if (!section) continue;
			const gone = file.state === "hidden";
			section.classList.toggle("is-gone", gone);
			section.inert = gone;
			section.classList.toggle("is-revealed", file.state === "revealed");
			syncLabels(section, file);
		}
		const shown = model.files.filter((file) => file.state !== "hidden");
		const onlyKept =
			shown.length > 0 && shown.every((file) => file.state === "kept");
		blank.hidden = !(model.filtering && (shown.length === 0 || onlyKept));
		if (!blank.hidden) {
			blankTitle.textContent = onlyKept ? copy.emptyKept : copy.emptyAll;
			blankBody.textContent = onlyKept
				? copy.emptyKeptBody(shown.length)
				: copy.emptyAllBody(true);
		}
		return shown.length;
	}

	function placeMenu() {
		if (narrow.matches || menu.hidden) return;
		const frame = gh.getBoundingClientRect();
		const anchor = control.getBoundingClientRect();
		const left = Math.max(
			8,
			Math.min(anchor.left - frame.left, frame.width - menu.offsetWidth - 8),
		);
		gh.style.setProperty("--menu-left", `${Math.round(left)}px`);
		gh.style.setProperty("--menu-right", "auto");
		gh.style.setProperty(
			"--menu-top",
			`${toolbar.offsetTop + toolbar.offsetHeight + 4}px`,
		);
	}

	function viewMessage(model: Model) {
		if (model.view === "filtering") return copy.live.hidden(model.hidden);
		if (model.view === "showing") return copy.live.showing(model.match);
		return copy.live.off;
	}

	function announce(model: Model, prefix = "") {
		const message = [prefix, viewMessage(model)].filter(Boolean).join(" ");
		live.textContent = "";
		requestAnimationFrame(() => {
			live.textContent = message;
		});
	}

	function sync(options: { announce?: boolean; prefix?: string } = {}) {
		const model = derive(state);
		syncControl(model);
		syncMenu(model);
		syncTree(model);
		shownReadout.textContent = String(syncDiff(model));
		placeMenu();
		lastView = model.view;
		if (options.announce) announce(model, options.prefix);
		return model;
	}

	function setMenuOpen(open: boolean, focusInside = false) {
		state.menuOpen = open;
		sync();
		if (!open || !focusInside) return;
		menu.querySelector<HTMLElement>("button:not([hidden]), input")?.focus();
	}

	function scrollDiffTo(path: string) {
		const section = diffSections.get(path);
		if (!section || narrow.matches) return;
		diffPane.scrollTo({
			top: Math.max(0, section.offsetTop - 12),
			behavior: reduceMotion.matches ? "auto" : "smooth",
		});
		section.classList.remove("is-flash");
		void section.offsetWidth;
		section.classList.add("is-flash");
	}

	function showAllFiles() {
		state.showingAll = true;
		state.revealed.clear();
		sync({ announce: true });
		menuButton.focus();
	}

	function setAlwaysFormOpen(open: boolean) {
		forms.always.form.hidden = !open;
		alwaysToggle.setAttribute("aria-expanded", String(open));
		if (open) forms.always.input.focus();
		placeMenu();
	}

	function clearError(list: RuleList) {
		const { input, error } = forms[list];
		input.removeAttribute("aria-invalid");
		error.hidden = true;
		error.textContent = "";
	}

	function addRule(list: RuleList, value: string) {
		ruleSequence += 1;
		const id = `${list}-${ruleSequence}`;
		if (list === "custom")
			state.custom.push({ id, pattern: value, enabled: true });
		else state.always.push({ id, pattern: value });
	}

	function submitRule(list: RuleList) {
		const { input, error } = forms[list];
		const value = input.value.trim();
		const message = validatePattern(
			value,
			state[list].map((rule) => rule.pattern),
			copy.validation,
		);
		if (message) {
			input.setAttribute("aria-invalid", "true");
			error.innerHTML = `${icon("alert")}<span>${escapeHtml(message)}</span>`;
			error.hidden = false;
			input.focus();
			return;
		}
		clearError(list);
		addRule(list, value);
		input.value = "";
		renderLists();
		sync({ announce: true, prefix: copy.live.ruleAdded });
	}

	function removeRule(list: RuleList, id: string) {
		if (list === "custom")
			state.custom = state.custom.filter((rule) => rule.id !== id);
		else state.always = state.always.filter((rule) => rule.id !== id);
		renderLists();
		sync({ announce: true, prefix: copy.live.ruleRemoved });
		if (list === "always") setAlwaysFormOpen(true);
		else forms.custom.input.focus();
	}

	function selectTreeRow(button: HTMLButtonElement) {
		const directory = button.dataset.dir;
		if (directory) {
			if (state.collapsed.has(directory)) state.collapsed.delete(directory);
			else state.collapsed.add(directory);
			sync();
			return;
		}
		const path = button.dataset.file ?? "";
		state.current = path;
		if (derive(state).byPath.get(path)?.state === "hidden") {
			state.revealed.add(path);
			sync({ announce: true, prefix: `${path} is temporarily visible.` });
			requestAnimationFrame(() => scrollDiffTo(path));
			return;
		}
		sync();
		scrollDiffTo(path);
	}

	function hideRevealed(path: string) {
		state.revealed.delete(path);
		sync({ announce: true, prefix: copy.live.hiddenAgain(path) });
		const row = treeRows.get(`file:${path}`);
		const rowButton = row && !row.inert ? row.querySelector("button") : null;
		if (rowButton) rowButton.focus();
		else diffPane.focus();
	}

	function resetDemo() {
		state = initialState(!narrow.matches);
		filterInput.value = "";
		for (const list of ["custom", "always"] as const) {
			forms[list].input.value = "";
			clearError(list);
		}
		forms.always.form.hidden = true;
		alwaysToggle.setAttribute("aria-expanded", "false");
		renderLists();
		gh.classList.add("is-still");
		sync({ announce: true, prefix: "Demo reset." });
		diffPane.scrollTop = 0;
		treePanel.scrollTop = 0;
		requestAnimationFrame(() =>
			requestAnimationFrame(() => gh.classList.remove("is-still")),
		);
	}

	mainButton.addEventListener("click", () => {
		state.active = true;
		state.showingAll = false;
		state.revealed.clear();
		sync({ announce: true });
	});

	menuButton.addEventListener("click", (event) =>
		setMenuOpen(!state.menuOpen, event.detail === 0),
	);

	pullRequestSwitch.addEventListener("click", () => {
		state.active = !state.active;
		state.showingAll = false;
		state.revealed.clear();
		sync({ announce: true });
	});

	showButton.addEventListener("click", () => {
		state.showingAll = !state.showingAll;
		state.revealed.clear();
		sync({ announce: true });
	});

	treeSwitch.addEventListener("click", () => {
		state.tree = !state.tree;
		sync();
	});

	menu.addEventListener("change", (event) => {
		const target = targetOf(event);
		if (!(target instanceof HTMLInputElement)) return;
		const preset = target.dataset.preset;
		if (preset === "tests" || preset === "lockfiles") {
			state.presets[preset] = target.checked;
			sync({ announce: true });
			return;
		}
		const rule = state.custom.find(
			(candidate) => candidate.id === target.dataset.customToggle,
		);
		if (!rule) return;
		rule.enabled = target.checked;
		sync({ announce: true });
	});

	menu.addEventListener("click", (event) => {
		const remove = targetOf(event)?.closest<HTMLElement>("[data-remove]");
		const list = remove?.dataset.remove;
		if (list === "custom" || list === "always")
			removeRule(list, remove?.dataset.id ?? "");
	});

	menu.addEventListener("keydown", (event) => {
		if (event.key !== "Escape") return;
		event.preventDefault();
		setMenuOpen(false);
		menuButton.focus();
	});

	menuButton.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || !state.menuOpen) return;
		event.preventDefault();
		setMenuOpen(false);
	});

	alwaysToggle.addEventListener("click", () =>
		setAlwaysFormOpen(forms.always.form.hidden !== false),
	);

	for (const list of ["custom", "always"] as const) {
		forms[list].input.addEventListener("input", () => clearError(list));
		forms[list].form.addEventListener("submit", (event) => {
			event.preventDefault();
			submitRule(list);
		});
	}

	gh.addEventListener("pointerdown", (event) => {
		if (!state.menuOpen || narrow.matches) return;
		const target = targetOf(event);
		if (target && (menu.contains(target) || control.contains(target))) return;
		state.menuOpen = false;
		sync();
	});

	treeList.addEventListener("click", (event) => {
		const button = targetOf(event)?.closest(".tr-btn");
		if (button instanceof HTMLButtonElement) selectTreeRow(button);
	});

	diffPane.addEventListener("click", (event) => {
		const target = targetOf(event);
		const hideAgain = target?.closest<HTMLElement>("[data-hide-again]");
		if (hideAgain) {
			hideRevealed(hideAgain.dataset.hideAgain ?? "");
			return;
		}
		if (target?.closest("[data-act='show-all']")) showAllFiles();
	});

	treeEmpty.addEventListener("click", (event) => {
		if (targetOf(event)?.closest("[data-act='show-all']")) showAllFiles();
	});

	filterInput.addEventListener("input", () => {
		state.filter = filterInput.value;
		sync();
	});

	reset.addEventListener("click", resetDemo);
	diffPane.tabIndex = -1;
	addEventListener("resize", placeMenu);
	narrow.addEventListener("change", () => sync());
	document.fonts.ready.then(placeMenu);

	renderTree();
	renderDiff();
	renderLists();
	sync();
	requestAnimationFrame(() =>
		requestAnimationFrame(() => gh.classList.remove("is-still")),
	);
}
