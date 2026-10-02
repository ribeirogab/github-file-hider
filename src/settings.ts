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
let editing: { id: PresetId; index: number; draft: string } | null = null;
const drafts = new Map<PresetId, string>();
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
function ruleForm(id: PresetId, index?: number) {
	const form = element("form");
	const key = index === undefined ? `add:${id}` : `edit:${id}:${index}`;
	const input = focusKey(element("input"), key);
	input.type = "text";
	input.setAttribute(
		"aria-label",
		index === undefined
			? `Add ${presets.find((p) => p.id === id)?.name} rule`
			: "Pattern",
	);
	input.placeholder = id === "tests" ? "**/*.integration.ts" : "**/bun.lockb";
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
		const existing = presetRules(settings, id).filter((_, i) => i !== index);
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
				const rules = [...presetRules(settings, id)];
				if (index === undefined) rules.push(pattern);
				else rules[index] = pattern;
				storeRules(settings, id, rules);
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
							presetRules(settings, id).filter((_, i) => i !== index),
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
	const custom = section("custom-rules", "Custom rules", "No custom rules yet");
	const always = section("always-show", "Always show", "No Always show rules");
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
