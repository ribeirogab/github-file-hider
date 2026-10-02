import {
	isPresetModified,
	PRESETS,
	type Preset,
	type PresetId,
	presetById,
	presetRules,
	validatePattern,
} from "./rules";
import {
	type ActivationMode,
	addAlwaysShow,
	addCustomRule,
	addPresetRule,
	firstInstallSettings,
	removeAlwaysShow,
	removeCustomRule,
	removePresetRule,
	restorePreset,
	type Settings,
	setMode,
	setPresetEnabled,
	setTreeFiltering,
	updateAlwaysShow,
	updateCustomRule,
	updatePresetRule,
} from "./settings";
import { readSettings, watchSettings, writeSettings } from "./settings-store";
import { copy, plural } from "./ui/copy";
import { escapeHtml, type IconName, icon, logo, logoTile } from "./ui/icons";
import { createAnnouncer, createTooltip } from "./ui/in-page";
import { codeify, counterHtml, labelHtml } from "./ui/markup";

const S = copy.settingsPage;
const SOURCE_URL = "https://github.com/ribeirogab/github-file-hider";

type PageId = "general" | "presets" | "custom" | "always";

const PAGES: { id: PageId; label: string; icon: IconName; group: boolean }[] = [
	{ id: "general", label: S.general, icon: "gear", group: false },
	{ id: "presets", label: copy.presets, icon: "stack", group: true },
	{ id: "custom", label: copy.customRules, icon: "filter", group: true },
	{ id: "always", label: copy.alwaysShow, icon: "eye", group: true },
];

const PRESET_META: Record<
	PresetId,
	{ icon: IconName; placeholder: string; examples: string[] }
> = {
	tests: {
		icon: "beaker",
		placeholder: "**/*.integration.ts",
		examples: [
			"button.spec.ts",
			"src/components/Button.spec.tsx",
			"src/utils/format.test.js",
			"src/__tests__/checkout.ts",
		],
	},
	lockfiles: {
		icon: "lock",
		placeholder: "**/bun.lockb",
		examples: [
			"package-lock.json",
			"apps/web/yarn.lock",
			"packages/service/pnpm-lock.yaml",
		],
	},
};

const SYNTAX_ROWS = [
	["src/config.ts", "One exact file path", "src/config.ts"],
	[
		"**/*.test.*",
		"Test filenames at any directory level",
		"src/utils/format.test.js",
	],
	[
		"**/generated/**",
		"Files inside generated directories",
		"src/generated/client.ts",
	],
	["docs/**", "Files inside the root docs directory", "docs/setup.md"],
	["docs/", "Same as docs/**", "docs/setup.md"],
];

type Rule = { key: string; pattern: string; enabled: boolean };

type Ui = {
	page: PageId;
	edit: { list: string; key: string } | null;
	drafts: Record<string, string | undefined>;
	errors: Record<string, string | null | undefined>;
	focus: string | null;
};

const isPage = (value: string): value is PageId =>
	PAGES.some((page) => page.id === value);

const root = document.getElementById("fh-app") as HTMLElement;
const announcer = createAnnouncer();
createTooltip();

let settings: Settings = firstInstallSettings();
const ui: Ui = {
	page: "general",
	edit: null,
	drafts: {},
	errors: {},
	focus: null,
};
let savedTimer = 0;

function listName(list: string) {
	if (list.startsWith("p:"))
		return S.presetList(presetById(list.slice(2) as PresetId).name);
	return list === "c" ? S.customRulesList : S.alwaysShowList;
}

function listRules(list: string): Rule[] {
	if (list.startsWith("p:"))
		return presetRules(settings, list.slice(2) as PresetId).map(
			(pattern, index) => ({ key: String(index), pattern, enabled: true }),
		);
	if (list === "c")
		return settings.customRules.map((rule) => ({
			key: rule.id,
			pattern: rule.pattern,
			enabled: rule.enabled,
		}));
	return settings.alwaysShow.map((rule) => ({
		key: rule.id,
		pattern: rule.pattern,
		enabled: true,
	}));
}

function validate(
	list: string,
	value: string,
	exceptKey: string | null = null,
) {
	const others = listRules(list)
		.filter((rule) => rule.key !== exceptKey)
		.map((rule) => rule.pattern);
	return validatePattern(value, others, copy.validation);
}

const errorHtml = (message: string | null | undefined) =>
	message ? `${icon("alert")}<span>${escapeHtml(message)}</span>` : "";

function switchControl(options: {
	on: boolean;
	act: string;
	data?: string;
	labelledby: string;
	describedby?: string;
	focusKey: string;
}) {
	return `<span class="fh-switch"><span class="fh-switch-status" aria-hidden="true">${options.on ? S.on : S.off}</span><button type="button" class="fh-switch-track" aria-pressed="${options.on}" aria-labelledby="${options.labelledby}"${options.describedby ? ` aria-describedby="${options.describedby}"` : ""} data-act="${options.act}" ${options.data ?? ""} data-focus="${options.focusKey}"><span class="fh-switch-knob"></span></button></span>`;
}

function ruleRowHtml(options: {
	list: string;
	rule: Rule;
	toggle: boolean;
	editing: boolean;
	draft: string;
	error: string | null | undefined;
}) {
	const { list, rule, toggle, editing } = options;
	const focusKey = `${list}:${rule.key}`;
	if (editing) {
		const id = `fh-edit-${focusKey.replace(/[^\w-]/g, "_")}`;
		return `<li class="fh-rule is-editing" data-list="${list}" data-key="${escapeHtml(rule.key)}"><form class="fh-rule-form" data-form="edit" data-list="${list}" data-key="${escapeHtml(rule.key)}"><label class="fh-sr" for="${id}">${S.editRuleNamed(escapeHtml(rule.pattern))}</label><input id="${id}" class="fh-input is-mono" data-input="edit" data-focus="input:edit" value="${escapeHtml(options.draft)}" aria-invalid="${!!options.error}" aria-describedby="${id}-err" spellcheck="false" autocomplete="off"><button type="submit" class="fh-btn is-primary">${S.save}</button><button type="button" class="fh-btn" data-act="cancel">${S.cancel}</button></form><div class="fh-validation" id="${id}-err">${errorHtml(options.error)}</div></li>`;
	}
	const off = toggle && !rule.enabled;
	return `<li class="fh-rule${off ? " is-off" : ""}" data-list="${list}" data-key="${escapeHtml(rule.key)}">${toggle ? `<input type="checkbox" class="fh-checkbox" data-act="toggle" data-focus="toggle:${escapeHtml(focusKey)}" aria-label="${escapeHtml(rule.pattern)}: ${rule.enabled ? S.on : S.off}"${rule.enabled ? " checked" : ""}>` : ""}<code class="fh-rule-pattern" title="${escapeHtml(rule.pattern)}">${escapeHtml(rule.pattern)}</code>${off ? labelHtml(S.off) : ""}<span class="fh-rule-actions"><button type="button" class="fh-iconbtn" data-act="edit" data-focus="edit:${escapeHtml(focusKey)}" aria-label="${S.edit} ${escapeHtml(rule.pattern)}" data-fh-tip="${S.edit}">${icon("pencil")}</button><button type="button" class="fh-iconbtn is-danger" data-act="remove" data-focus="remove:${escapeHtml(focusKey)}" aria-label="${S.remove} ${escapeHtml(rule.pattern)}" data-fh-tip="${S.remove}">${icon("trash")}</button></span></li>`;
}

function addFormHtml(list: string, placeholder: string) {
	const key = `add:${list}`;
	const id = `fh-add-${list.replace(/[^\w-]/g, "_")}`;
	const error = ui.errors[key];
	return `<form class="fh-add" data-form="add" data-list="${list}"><label class="fh-sr" for="${id}">${S.addRuleTo(escapeHtml(listName(list)))}</label><input id="${id}" class="fh-input is-mono" data-input="${key}" data-focus="input:${key}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(ui.drafts[key] ?? "")}" aria-invalid="${!!error}" aria-describedby="${id}-err" spellcheck="false" autocomplete="off"><button type="submit" class="fh-btn">${icon("plus")}${S.addRule}</button></form><div class="fh-validation" id="${id}-err">${errorHtml(error)}</div>`;
}

function rulesListHtml(list: string, toggle: boolean, empty: string) {
	const rules = listRules(list);
	if (!rules.length) return empty;
	return `<ul class="fh-rules" aria-label="${escapeHtml(listName(list))}">${rules
		.map((rule) => {
			const editing = ui.edit?.list === list && ui.edit.key === rule.key;
			return ruleRowHtml({
				list,
				rule,
				toggle,
				editing,
				draft: ui.drafts.edit ?? rule.pattern,
				error: editing ? ui.errors.edit : null,
			});
		})
		.join("")}</ul>`;
}

const compactBlankslate = (name: IconName, title: string, body: string) =>
	`<div class="fh-blankslate is-compact"><div class="fh-blankslate-visual">${icon(name)}</div><h3 class="fh-blankslate-heading">${title}</h3><p class="fh-blankslate-desc">${codeify(body)}</p></div>`;

function syntaxHtml(open: boolean) {
	const [rule, meaning, example] = S.syntaxColumns;
	return `<details class="fh-details"${open ? " open" : ""}><summary>${icon("chevronRight", "chev")}${S.syntaxTitle}</summary><div class="fh-details-body"><table class="fh-table"><thead><tr><th scope="col">${rule}</th><th scope="col">${meaning}</th><th scope="col">${example}</th></tr></thead><tbody>${SYNTAX_ROWS.map(([pattern, text, match]) => `<tr><td><code>${escapeHtml(pattern)}</code></td><td>${text}</td><td><code>${escapeHtml(match)}</code></td></tr>`).join("")}</tbody></table><p class="fh-caption">${S.syntaxBody}</p></div></details>`;
}

function pageGeneral() {
	const radio = (
		value: ActivationMode,
		title: string,
		body: string,
		extra = "",
	) =>
		`<label class="fh-choice"><input type="radio" class="fh-radio" name="fh-mode" value="${value}" data-act="mode" data-focus="radio:${value}"${settings.mode === value ? " checked" : ""}><span class="fh-choice-text"><span class="fh-choice-label">${title}${extra}</span><span class="fh-caption">${body}</span></span></label>`;
	return `<div class="fh-subhead"><h2 id="fh-page-title" tabindex="-1">${S.general}</h2></div><p class="fh-lede">${S.generalLede}</p><fieldset class="fh-fieldset"><legend class="fh-legend">${S.modeLegend}</legend><p class="fh-caption">${S.modeCaption}</p><div class="fh-choices">${radio("manual", S.manualTitle, S.manualBody, labelHtml(S.defaultLabel))}${radio("automatic", S.autoTitle, S.autoBody)}</div></fieldset><div class="fh-rule-divider"></div><div class="fh-setting"><div class="fh-setting-text"><h3 class="fh-setting-title" id="fh-tree-title">${S.treeTitle}</h3><p class="fh-caption" id="fh-tree-desc">${S.treeBody}</p></div>${switchControl({ on: settings.treeFiltering, act: "tree", labelledby: "fh-tree-title", describedby: "fh-tree-desc", focusKey: "switch:tree" })}</div><div class="fh-subhead is-spacious"><h2>${S.scopeTitle}</h2></div><div class="fh-box"><div class="fh-box-row fh-fact">${icon("repo")}<div><b>${S.factRepoTitle}</b><p class="fh-caption">${S.factRepoBody}</p></div></div><div class="fh-box-row fh-fact">${icon("device")}<div><b>${S.factLocalTitle}</b><p class="fh-caption">${S.factLocalBody}</p></div></div><div class="fh-box-row fh-fact">${icon("eye")}<div><b>${S.factDisplayTitle}</b><p class="fh-caption">${S.factDisplayBody}</p></div></div></div>`;
}

function presetBoxHtml(preset: Preset) {
	const state = settings.presets[preset.id];
	const meta = PRESET_META[preset.id];
	const modified = isPresetModified(settings, preset.id);
	const list = `p:${preset.id}`;
	return `<section class="fh-box fh-preset" aria-labelledby="fh-preset-${preset.id}-name"><div class="fh-box-header"><span class="fh-preset-icon">${icon(meta.icon)}</span><div class="fh-preset-text"><div class="fh-preset-title"><h3 id="fh-preset-${preset.id}-name">${preset.name}</h3>${modified ? labelHtml(S.modified, "attention") : ""}</div><p class="fh-caption" id="fh-preset-${preset.id}-desc">${escapeHtml(preset.description)}</p></div>${switchControl({ on: state.enabled, act: "preset-enable", data: `data-preset="${preset.id}"`, labelledby: `fh-preset-${preset.id}-name`, describedby: `fh-preset-${preset.id}-desc`, focusKey: `switch:preset:${preset.id}` })}</div>${rulesListHtml(list, false, `<div class="fh-rules-empty">${S.presetEmpty}</div>`)}<div class="fh-box-footer">${addFormHtml(list, meta.placeholder)}<div class="fh-preset-foot"><p class="fh-caption">${S.matchesLike} ${meta.examples.map((example) => `<code>${escapeHtml(example)}</code>`).join(", ")}</p><button type="button" class="fh-btn is-small is-invisible" data-act="restore" data-preset="${preset.id}" data-focus="restore:${preset.id}"${modified ? "" : ` aria-disabled="true" data-fh-tip="${S.restoreDisabled}"`}>${icon("undo")}${S.restore}</button></div></div></section>`;
}

const pagePresets = () =>
	`<div class="fh-subhead"><h2 id="fh-page-title" tabindex="-1">${copy.presets}</h2></div><p class="fh-lede">${S.presetsLede}</p>${PRESETS.map(presetBoxHtml).join("")}`;

function pageCustom() {
	const on = settings.customRules.filter((rule) => rule.enabled).length;
	const total = settings.customRules.length;
	return `<div class="fh-subhead"><h2 id="fh-page-title" tabindex="-1">${copy.customRules}</h2></div><p class="fh-lede">${S.customLede}</p><section class="fh-box" aria-labelledby="fh-custom-title"><div class="fh-box-header"><h3 class="fh-box-title" id="fh-custom-title">${S.customBox}</h3>${counterHtml(total)}${total ? `<span class="fh-caption">${S.rulesOn(on, total)}</span>` : ""}</div>${rulesListHtml("c", true, compactBlankslate("filter", S.customEmptyTitle, S.customEmptyBody))}<div class="fh-box-footer">${addFormHtml("c", S.placeholderCustom)}</div></section>${syntaxHtml(true)}`;
}

function pageAlways() {
	const total = settings.alwaysShow.length;
	return `<div class="fh-subhead"><h2 id="fh-page-title" tabindex="-1">${copy.alwaysShow}</h2></div><p class="fh-lede">${S.alwaysLede}</p><div class="fh-example" aria-label="${S.exampleLabel}"><span class="fh-example-k">${S.exampleHide}</span><code>**/*.spec.ts</code><span class="fh-example-k">${S.exampleAlways}</span><code>src/payments/checkout.spec.ts</code><p>${codeify(S.exampleResult)}</p></div><section class="fh-box" aria-labelledby="fh-always-title"><div class="fh-box-header"><h3 class="fh-box-title" id="fh-always-title">${S.alwaysBox}</h3>${counterHtml(total)}</div>${rulesListHtml("a", false, compactBlankslate("eye", S.alwaysEmptyTitle, S.alwaysEmptyBody))}<div class="fh-box-footer">${addFormHtml("a", S.placeholderAlways)}</div></section>${syntaxHtml(false)}`;
}

function navCount(id: PageId) {
	if (id === "custom") return settings.customRules.length;
	if (id === "always") return settings.alwaysShow.length;
	if (id === "presets")
		return PRESETS.filter((preset) => settings.presets[preset.id].enabled)
			.length;
	return null;
}

function navHtml() {
	const item = (page: (typeof PAGES)[number]) => {
		const count = navCount(page.id);
		const counter =
			count === null
				? ""
				: `<span class="fh-counter" aria-hidden="true">${count}</span>`;
		const sr =
			count === null
				? ""
				: `<span class="fh-sr">, ${count} ${page.id === "presets" ? "on" : plural(count, "rule", "rules")}</span>`;
		return `<li><button type="button" class="fh-navlist-item" data-page="${page.id}" data-focus="nav:${page.id}"${ui.page === page.id ? ' aria-current="page"' : ""}>${icon(page.icon)}<span>${page.label}${sr}</span>${counter}</button></li>`;
	};
	return `<ul class="fh-navlist">${PAGES.filter((page) => !page.group)
		.map(item)
		.join(
			"",
		)}</ul><div class="fh-navlist-divider"></div><h2 class="fh-navlist-heading" id="fh-nav-rules">${S.rulesGroup}</h2><ul class="fh-navlist" aria-labelledby="fh-nav-rules">${PAGES.filter(
		(page) => page.group,
	)
		.map(item)
		.join(
			"",
		)}</ul><div class="fh-nav-note">${icon("device")}<span>${S.navNote}</span></div><div class="fh-nav-note">${icon("info")}<span>${S.disclaimer}</span></div>`;
}

function frame() {
	const version = chrome.runtime.getManifest().version_name ?? "";
	root.innerHTML = `<header class="fh-appheader">${logo(32)}<nav class="fh-crumbs" aria-label="${S.breadcrumb}"><b>${copy.product}</b><span class="sep">/</span><span>${S.crumb}</span></nav><div class="fh-appheader-end"><span class="fh-saved" aria-hidden="true">${icon("checkCircle")}${S.saved}</span><button type="button" class="fh-btn is-small" data-act="source">${icon("code")}${S.viewSource}${icon("linkExternal")}</button></div></header><div class="fh-page"><div class="fh-context">${logoTile(48, 28)}<div><h1>${copy.product}</h1><p>${S.contextSub(version)}</p></div><div class="fh-context-end">${labelHtml("MIT")}</div></div><div class="fh-grid"><nav class="fh-nav" aria-label="${S.navigation}"></nav><main class="fh-main" id="fh-main"></main></div></div>`;
}

const PAGE_HTML: Record<PageId, () => string> = {
	general: pageGeneral,
	presets: pagePresets,
	custom: pageCustom,
	always: pageAlways,
};

function render() {
	const active = document.activeElement;
	const previous =
		active instanceof HTMLElement && root.contains(active)
			? (active.closest<HTMLElement>("[data-focus]")?.dataset.focus ?? null)
			: null;
	const selection =
		active instanceof HTMLInputElement && active.matches("input.fh-input")
			? { start: active.selectionStart, end: active.selectionEnd }
			: null;
	const nav = root.querySelector(".fh-nav");
	const main = root.querySelector("#fh-main");
	if (nav) nav.innerHTML = navHtml();
	if (main) main.innerHTML = PAGE_HTML[ui.page]();
	const key = ui.focus ?? previous;
	ui.focus = null;
	if (!key) return;
	const element = root.querySelector<HTMLElement>(
		`[data-focus="${CSS.escape(key)}"]`,
	);
	if (!element) return;
	element.focus({ preventScroll: true });
	if (
		selection &&
		element instanceof HTMLInputElement &&
		key === previous &&
		selection.start !== null &&
		selection.end !== null
	)
		element.setSelectionRange(selection.start, selection.end);
}

function flashSaved() {
	const element = root.querySelector(".fh-saved");
	element?.classList.add("is-on");
	clearTimeout(savedTimer);
	savedTimer = window.setTimeout(
		() => element?.classList.remove("is-on"),
		1600,
	);
}

function commit(
	change: (current: Settings) => Settings,
	{ focus = null as string | null, message = "" } = {},
) {
	ui.focus = focus;
	settings = change(settings);
	render();
	void writeSettings(settings);
	flashSaved();
	if (message) announcer.announce(message);
}

function showPage(page: PageId, focus: string | null) {
	ui.page = page;
	ui.edit = null;
	ui.errors = {};
	ui.focus = focus;
	history.replaceState(null, "", `#${page}`);
	render();
}

function showFieldError(
	input: HTMLInputElement,
	key: string,
	message: string | null,
) {
	ui.errors[key] = message;
	input.setAttribute("aria-invalid", String(!!message));
	const box = document.getElementById(
		input.getAttribute("aria-describedby") ?? "",
	);
	if (box) box.innerHTML = errorHtml(message);
}

function focusAfterRemove(row: HTMLElement) {
	const next = (row.nextElementSibling ??
		row.previousElementSibling) as HTMLElement | null;
	if (next) return `remove:${next.dataset.list}:${next.dataset.key}`;
	return `input:add:${row.dataset.list}`;
}

function focusAfterPresetRemove(row: HTMLElement) {
	const list = row.dataset.list ?? "";
	const index = Number(row.dataset.key);
	const count = presetRules(settings, list.slice(2) as PresetId).length;
	if (count <= 1) return `input:add:${list}`;
	return `remove:${list}:${Math.min(index, count - 2)}`;
}

const newId = () => crypto.randomUUID();

function onClick(event: MouseEvent) {
	const target = event.target instanceof Element ? event.target : null;
	const nav = target?.closest<HTMLElement>("[data-page]");
	if (nav) {
		const page = nav.dataset.page ?? "";
		if (isPage(page)) showPage(page, `nav:${page}`);
		return;
	}
	const button = target?.closest<HTMLButtonElement>("button[data-act]");
	if (!button || button.getAttribute("aria-disabled") === "true") return;
	const act = button.dataset.act;
	const row = button.closest<HTMLElement>(".fh-rule");
	if (act === "source") window.open(SOURCE_URL, "_blank", "noopener");
	if (act === "tree")
		commit((current) => setTreeFiltering(current, !current.treeFiltering), {
			focus: "switch:tree",
		});
	if (act === "preset-enable") {
		const id = button.dataset.preset as PresetId;
		commit(
			(current) => setPresetEnabled(current, id, !current.presets[id].enabled),
			{ focus: `switch:preset:${id}` },
		);
	}
	if (act === "restore") {
		const id = button.dataset.preset as PresetId;
		ui.edit = null;
		commit((current) => restorePreset(current, id), {
			focus: `input:add:p:${id}`,
			message: copy.live.restored(presetById(id).name),
		});
	}
	if (act === "edit" && row) {
		const list = row.dataset.list ?? "";
		const key = row.dataset.key ?? "";
		const rule = listRules(list).find((candidate) => candidate.key === key);
		ui.edit = { list, key };
		ui.drafts.edit = rule?.pattern;
		ui.errors.edit = null;
		ui.focus = "input:edit";
		render();
		root.querySelector<HTMLInputElement>('[data-input="edit"]')?.select();
	}
	if (act === "cancel" && row) {
		ui.edit = null;
		ui.drafts.edit = undefined;
		ui.errors.edit = null;
		ui.focus = `edit:${row.dataset.list}:${row.dataset.key}`;
		render();
	}
	if (act === "remove" && row) {
		const list = row.dataset.list ?? "";
		const key = row.dataset.key ?? "";
		if (ui.edit?.list === list) ui.edit = null;
		const message = copy.live.ruleRemoved;
		if (list.startsWith("p:"))
			commit(
				(current) =>
					removePresetRule(current, list.slice(2) as PresetId, Number(key)),
				{ focus: focusAfterPresetRemove(row), message },
			);
		else if (list === "c")
			commit((current) => removeCustomRule(current, key), {
				focus: focusAfterRemove(row),
				message,
			});
		else
			commit((current) => removeAlwaysShow(current, key), {
				focus: focusAfterRemove(row),
				message,
			});
	}
}

function onChange(event: Event) {
	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;
	if (target.dataset.act === "mode")
		commit((current) => setMode(current, target.value as ActivationMode), {
			focus: `radio:${target.value}`,
		});
	if (target.dataset.act === "toggle") {
		const key = target.closest<HTMLElement>(".fh-rule")?.dataset.key ?? "";
		commit(
			(current) => updateCustomRule(current, key, { enabled: target.checked }),
			{ focus: `toggle:c:${key}` },
		);
	}
}

function onInput(event: Event) {
	const input =
		event.target instanceof HTMLInputElement &&
		event.target.closest("[data-input]")
			? event.target
			: null;
	if (!input) return;
	const key = input.dataset.input ?? "";
	ui.drafts[key] = input.value;
	const form = input.closest<HTMLElement>("form");
	const list = form?.dataset.list ?? "";
	const except = key === "edit" ? (form?.dataset.key ?? null) : null;
	if (input.value.trim() || ui.errors[key])
		showFieldError(
			input,
			key,
			input.value.trim() ? validate(list, input.value, except) : null,
		);
}

function onKeyDown(event: KeyboardEvent) {
	const target = event.target;
	if (
		event.key === "Escape" &&
		target instanceof HTMLElement &&
		target.matches('[data-input="edit"]')
	) {
		event.preventDefault();
		target
			.closest(".fh-rule")
			?.querySelector<HTMLButtonElement>('[data-act="cancel"]')
			?.click();
	}
}

function rejectField(input: HTMLInputElement, key: string, error: string) {
	showFieldError(input, key, error);
	announcer.announce(error);
	input.focus();
}

function submitAdd(list: string, input: HTMLInputElement) {
	const key = input.dataset.input ?? "";
	const error = validate(list, input.value);
	if (error) return rejectField(input, key, error);
	ui.drafts[key] = "";
	ui.errors[key] = null;
	const value = input.value.trim();
	const options = { focus: `input:${key}`, message: copy.live.ruleAdded };
	if (list.startsWith("p:"))
		commit(
			(current) => addPresetRule(current, list.slice(2) as PresetId, value),
			options,
		);
	else if (list === "c")
		commit((current) => addCustomRule(current, newId(), value), options);
	else commit((current) => addAlwaysShow(current, newId(), value), options);
}

function submitEdit(list: string, ruleKey: string, input: HTMLInputElement) {
	const error = validate(list, input.value, ruleKey);
	if (error) return rejectField(input, "edit", error);
	const value = input.value.trim();
	ui.edit = null;
	ui.drafts.edit = undefined;
	ui.errors.edit = null;
	const options = {
		focus: `edit:${list}:${ruleKey}`,
		message: copy.live.ruleSaved,
	};
	if (list.startsWith("p:"))
		commit(
			(current) =>
				updatePresetRule(
					current,
					list.slice(2) as PresetId,
					Number(ruleKey),
					value,
				),
			options,
		);
	else if (list === "c")
		commit(
			(current) => updateCustomRule(current, ruleKey, { pattern: value }),
			options,
		);
	else commit((current) => updateAlwaysShow(current, ruleKey, value), options);
}

function onSubmit(event: SubmitEvent) {
	event.preventDefault();
	const form = event.target instanceof HTMLFormElement ? event.target : null;
	const input = form?.querySelector<HTMLInputElement>("[data-input]");
	if (!form || !input) return;
	const list = form.dataset.list ?? "";
	if (form.dataset.form === "add") submitAdd(list, input);
	else submitEdit(list, form.dataset.key ?? "", input);
}

function pageFromHash(): PageId {
	const hash = location.hash.slice(1);
	return isPage(hash) ? hash : "general";
}

root.addEventListener("click", onClick);
root.addEventListener("change", onChange);
root.addEventListener("input", onInput);
root.addEventListener("keydown", onKeyDown);
root.addEventListener("submit", onSubmit);
addEventListener("hashchange", () => {
	const page = pageFromHash();
	if (page !== ui.page) showPage(page, null);
});

watchSettings((next) => {
	settings = next;
	if (
		ui.edit &&
		!listRules(ui.edit.list).some((rule) => rule.key === ui.edit?.key)
	)
		ui.edit = null;
	render();
});

frame();
ui.page = pageFromHash();
void readSettings().then((stored) => {
	settings = stored;
	render();
	document.documentElement.dataset.ready = "true";
});
