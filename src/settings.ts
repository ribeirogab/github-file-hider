import { presetRules, presets, validatePattern } from "./rules";
import {
	firstInstallSettings,
	readSettings,
	updateSettings,
	watchSettings,
} from "./settings-store";
import type { PresetId, Settings } from "./types";
import { button, element } from "./ui";

const root = document.getElementById("settings");
let settings = firstInstallSettings();
type ListId = PresetId | "custom" | "always";
let editing: { id: ListId; index: number; draft: string } | null = null;
const drafts = new Map<ListId, string>();
const errors = new Map<string, string>();
const focusNodes = new Map<string, HTMLElement>();
function focusKey<T extends HTMLElement>(node: T, key: string): T {
	node.dataset.focus = key;
	focusNodes.set(key, node);
	return node;
}
function announce(message: string) {
	const status = document.getElementById("saved");
	if (status) status.textContent = message;
}
async function save(change: (settings: Settings) => void, message = "Saved") {
	try {
		await updateSettings(change);
		announce(message);
	} catch {
		announce("Settings could not be saved. Try again.");
	}
}
function storeRules(settings: Settings, id: PresetId, rules: string[]) {
	settings.presets[id].rules = rules;
}
function listRules(settings: Settings, id: ListId): string[] {
	return id === "custom"
		? settings.customRules.map((r) => r.pattern)
		: id === "always"
			? settings.alwaysShow.map((r) => r.pattern)
			: presetRules(settings, id);
}
function writeRule(
	settings: Settings,
	id: ListId,
	pattern: string,
	index?: number,
) {
	if (id === "custom" || id === "always") {
		const list = id === "custom" ? settings.customRules : settings.alwaysShow;
		const existing = index === undefined ? undefined : list[index];
		if (existing) existing.pattern = pattern;
		else if (id === "custom")
			settings.customRules.push({
				id: crypto.randomUUID(),
				pattern,
				enabled: true,
			});
		else settings.alwaysShow.push({ id: crypto.randomUUID(), pattern });
	} else {
		const rules = [...presetRules(settings, id)];
		if (index === undefined) rules.push(pattern);
		else rules[index] = pattern;
		storeRules(settings, id, rules);
	}
}
function ruleForm(id: ListId, index?: number) {
	const form = element("form");
	const key = index === undefined ? `add:${id}` : `edit:${id}:${index}`;
	const input = focusKey(element("input"), key);
	input.type = "text";
	input.setAttribute(
		"aria-label",
		index === undefined
			? `Add ${presets.find((p) => p.id === id)?.name ?? (id === "custom" ? "custom" : "Always show")} rule`
			: "Pattern",
	);
	input.placeholder =
		id === "tests"
			? "**/*.integration.ts"
			: id === "lockfiles"
				? "**/bun.lockb"
				: id === "custom"
					? "docs/** or **/generated/**"
					: "src/payments/**";
	input.value =
		index === undefined ? (drafts.get(id) ?? "") : (editing?.draft ?? "");
	input.oninput = () => {
		if (index === undefined) drafts.set(id, input.value);
		else if (editing) editing.draft = input.value;
	};
	const error = element("p", errors.get(key) ?? "", "error");
	error.id = `error-${key}`;
	input.setAttribute("aria-invalid", String(!!errors.get(key)));
	input.setAttribute("aria-describedby", error.id);
	const submit = button(index === undefined ? "Add rule" : "Save", () => {});
	submit.type = "submit";
	form.append(input, submit, error);
	if (index !== undefined) {
		const cancel = () => {
			editing = null;
			errors.delete(key);
			render(`row-edit:${id}:${index}`);
		};
		form.append(button("Cancel", cancel));
		input.onkeydown = (e) => {
			if (e.key === "Escape") {
				e.preventDefault();
				cancel();
			}
		};
	}
	form.onsubmit = async (e) => {
		e.preventDefault();
		const existing = listRules(settings, id).filter((_, i) => i !== index);
		const errorMessage = validatePattern(input.value, existing);
		if (errorMessage) {
			errors.set(key, errorMessage);
			render(key);
			return;
		}
		const pattern = input.value.trim();
		errors.delete(key);
		if (index === undefined) drafts.delete(id);
		else editing = null;
		await save(
			(settings) => {
				writeRule(settings, id, pattern, index);
			},
			index === undefined ? "Rule added." : "Rule saved.",
		);
		render(index === undefined ? key : `row-edit:${id}:${index}`);
	};
	return form;
}
function presetSection(id: PresetId) {
	const preset = presets.find((p) => p.id === id);
	if (!preset) return element("div");
	const section = element("section", "", "box");
	section.setAttribute("aria-label", preset.name);
	const heading = element("div", "", "box-heading");
	heading.append(element("h3", preset.name), element("p", preset.description));
	if (settings.presets[id].rules)
		heading.append(element("span", "Modified", "badge"));
	const toggle = focusKey(
		button(settings.presets[id].enabled ? "On" : "Off", () => {
			void save((settings) => {
				settings.presets[id].enabled = !settings.presets[id].enabled;
			});
		}),
		`toggle:${id}`,
	);
	toggle.setAttribute("aria-label", preset.name);
	toggle.setAttribute("aria-pressed", String(settings.presets[id].enabled));
	heading.append(toggle);
	section.append(heading);
	const rules = presetRules(settings, id);
	if (!rules.length)
		section.append(
			element(
				"p",
				"This preset has no rules. Add one below or restore the defaults.",
			),
		);
	rules.forEach((pattern, index) => {
		const row = element("div", "", "rule-row");
		if (editing?.id === id && editing.index === index)
			row.append(ruleForm(id, index));
		else {
			row.append(element("code", pattern));
			const edit = focusKey(
				button("Edit rule", () => {
					editing = { id, index, draft: pattern };
					render(`edit:${id}:${index}`);
				}),
				`row-edit:${id}:${index}`,
			);
			edit.setAttribute("aria-label", `Edit rule ${pattern}`);
			const remove = button("Remove rule", () => {
				void save(
					(settings) =>
						storeRules(
							settings,
							id,
							listRules(settings, id).filter((_, i) => i !== index),
						),
					"Rule removed.",
				);
			});
			remove.setAttribute("aria-label", `Remove rule ${pattern}`);
			row.append(edit, remove);
		}
		section.append(row);
	});
	section.append(ruleForm(id));
	const restore = focusKey(
		button("Restore defaults", () => {
			editing = null;
			void save((settings) => {
				delete settings.presets[id].rules;
			}, `${preset.name} preset restored to its default rules.`);
		}),
		`restore:${id}`,
	);
	restore.disabled = !settings.presets[id].rules;
	section.append(restore);
	return section;
}
function syntaxHelp() {
	const help = element("details");
	help.append(element("summary", "Pattern syntax"));
	help.append(
		element(
			"p",
			"Every pattern starts at the repository root. Matching is case-sensitive. Spaces are allowed. * and ? stay inside one path segment. **/ matches zero or more folders. No brace expansion, negation, or character classes.",
		),
	);
	const table = element("table");
	const heading = element("tr");
	heading.append(element("th", "Pattern"), element("th", "Matches"));
	table.append(heading);
	for (const [pattern, example] of [
		["*.lock", "yarn.lock at the root"],
		["**/yarn.lock", "yarn.lock and apps/web/yarn.lock"],
		["docs/", "The same as docs/**"],
		["docs/**", "Everything inside the root docs folder"],
		["src/?.ts", "src/a.ts"],
		["**/generated/**", "Files inside generated folders"],
	]) {
		const row = element("tr");
		row.append(element("td", pattern), element("td", example));
		table.append(row);
	}
	help.append(table);
	return help;
}
function ruleList(id: "custom" | "always") {
	const node = element("div", "", "box");
	node.setAttribute("role", "region");
	node.setAttribute(
		"aria-label",
		id === "custom" ? "Hide rules" : "Always show rules",
	);
	const list = id === "custom" ? settings.customRules : settings.alwaysShow;
	if (!list.length)
		node.append(
			element(
				"h3",
				id === "custom" ? "No custom rules yet" : "No Always show rules",
			),
			element(
				"p",
				id === "custom"
					? "Add a pattern such as docs/** or **/generated/** to hide files that presets don't cover."
					: "Add a path to keep one file visible while similar files are hidden, for example src/payments/checkout.spec.ts.",
			),
		);
	list.forEach((rule, index) => {
		const row = element("div", "", "rule-row");
		if (editing?.id === id && editing.index === index)
			row.append(ruleForm(id, index));
		else {
			row.append(element("code", rule.pattern));
			if (id === "custom") {
				const enabled = settings.customRules[index]?.enabled ?? false;
				const toggle = focusKey(
					button(enabled ? "On" : "Off", () => {
						void save((settings) => {
							const rule = settings.customRules[index];
							if (rule) rule.enabled = !rule.enabled;
						});
					}),
					`toggle:${id}:${index}`,
				);
				toggle.setAttribute("aria-pressed", String(enabled));
				toggle.setAttribute(
					"aria-label",
					`Turn rule on or off ${rule.pattern}`,
				);
				row.append(toggle);
			}
			const edit = focusKey(
				button("Edit rule", () => {
					editing = { id, index, draft: rule.pattern };
					render(`edit:${id}:${index}`);
				}),
				`row-edit:${id}:${index}`,
			);
			edit.setAttribute("aria-label", `Edit rule ${rule.pattern}`);
			const remove = button("Remove rule", () => {
				void save((settings) => {
					if (id === "custom") settings.customRules.splice(index, 1);
					else settings.alwaysShow.splice(index, 1);
				}, "Rule removed.");
			});
			remove.setAttribute("aria-label", `Remove rule ${rule.pattern}`);
			row.append(edit, remove);
		}
		node.append(row);
	});
	node.append(ruleForm(id));
	return node;
}
function section(id: string, title: string, description: string) {
	const node = element("section");
	node.id = id;
	node.append(element("h2", title), element("p", description));
	return node;
}
function render(preferredFocus?: string) {
	if (!root) return;
	const previousFocus =
		preferredFocus ?? (document.activeElement as HTMLElement)?.dataset.focus;
	focusNodes.clear();
	const general = section(
		"general",
		"General",
		"These settings apply to every repository on github.com.",
	);
	general.append(
		element("h3", "Scope and storage"),
		element("h4", "Every repository"),
		element(
			"p",
			"One configuration applies to pull requests in all repositories on github.com. There are no per-repository settings.",
		),
		element("h4", "Only in this browser"),
		element(
			"p",
			"Settings are stored locally in this Chrome profile. They are not synced between devices, and no account or server is involved.",
		),
		element("h4", "Display only"),
		element(
			"p",
			"File Hider changes only what you see. It never changes files, comments, reviews, or the files you marked as viewed.",
		),
	);
	const preset = section(
		"presets",
		"Presets",
		"Ready-made rule sets. A preset hides its files only while filtering is on in a pull request.",
	);
	for (const p of presets) preset.append(presetSection(p.id));
	const custom = section(
		"custom-rules",
		"Custom rules",
		"Hide files that presets don't cover. Rules match file paths relative to the repository root, not file contents.",
	);
	custom.append(ruleList("custom"), syntaxHelp());
	const always = section(
		"always-show",
		"Always show",
		"Files that match these rules stay visible, even when a preset or a custom rule would hide them.",
	);
	always.append(
		ruleList("always"),
		element(
			"p",
			"Hide: **/*.spec.*. Always show: src/payments/checkout.spec.ts. Other .spec.ts files are hidden. src/payments/checkout.spec.ts stays visible.",
		),
		syntaxHelp(),
	);
	root.replaceChildren(general, preset, custom, always);
	if (previousFocus) focusNodes.get(previousFocus)?.focus();
}
const version = document.getElementById("version");
if (version)
	version.textContent = `Extension settings · Version ${chrome.runtime.getManifest().version_name}`;
watchSettings((next) => {
	settings = next;
	render();
});
void readSettings().then((next) => {
	settings = next;
	render();
});
