import {
	type AlwaysShowRule,
	type CustomRule,
	defaultRules,
	PRESETS,
	type PresetId,
	type PresetState,
	presetRules,
	type RuleSettings,
} from "./rules";

export type ActivationMode = "manual" | "automatic";

export type PullRequestKey = string;

export type Settings = RuleSettings & {
	schemaVersion: 1;
	mode: ActivationMode;
	treeFiltering: boolean;
	activations: Record<PullRequestKey, true>;
};

export function firstInstallSettings(): Settings {
	return {
		schemaVersion: 1,
		mode: "manual",
		treeFiltering: true,
		presets: { tests: { enabled: false }, lockfiles: { enabled: false } },
		customRules: [],
		alwaysShow: [],
		activations: {},
	};
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const sameRules = (a: readonly string[], b: readonly string[]) =>
	a.length === b.length && a.every((rule, index) => rule === b[index]);

const stringList = (value: unknown) =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: null;

function presetState(id: PresetId, value: unknown): PresetState {
	if (!isRecord(value)) return { enabled: false };
	const rules = stringList(value.rules);
	const state: PresetState = { enabled: value.enabled === true };
	if (rules && !sameRules(rules, defaultRules(id))) state.rules = rules;
	return state;
}

function customRules(value: unknown): CustomRule[] {
	if (!Array.isArray(value)) return [];
	return value.filter(isRecord).flatMap((rule) =>
		typeof rule.id === "string" && typeof rule.pattern === "string"
			? [
					{
						id: rule.id,
						pattern: rule.pattern,
						enabled: rule.enabled !== false,
					},
				]
			: [],
	);
}

function alwaysShowRules(value: unknown): AlwaysShowRule[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter(isRecord)
		.flatMap((rule) =>
			typeof rule.id === "string" && typeof rule.pattern === "string"
				? [{ id: rule.id, pattern: rule.pattern }]
				: [],
		);
}

function activations(value: unknown): Record<PullRequestKey, true> {
	if (!isRecord(value)) return {};
	return Object.fromEntries(
		Object.keys(value)
			.filter((key) => value[key] === true)
			.map((key) => [key.toLowerCase(), true as const]),
	);
}

export function normalizeSettings(value: unknown): Settings {
	if (!isRecord(value)) return firstInstallSettings();
	const presets = isRecord(value.presets) ? value.presets : {};
	return {
		schemaVersion: 1,
		mode: value.mode === "automatic" ? "automatic" : "manual",
		treeFiltering: value.treeFiltering !== false,
		presets: {
			tests: presetState("tests", presets.tests),
			lockfiles: presetState("lockfiles", presets.lockfiles),
		},
		customRules: customRules(value.customRules),
		alwaysShow: alwaysShowRules(value.alwaysShow),
		activations: activations(value.activations),
	};
}

export function pullRequestKey(owner: string, repo: string, number: string) {
	return `${owner}/${repo}#${number}`.toLowerCase();
}

export function isActive(settings: Settings, key: PullRequestKey) {
	return settings.mode === "automatic" || settings.activations[key] === true;
}

export const setMode = (
	settings: Settings,
	mode: ActivationMode,
): Settings => ({
	...settings,
	mode,
});

export const setTreeFiltering = (
	settings: Settings,
	treeFiltering: boolean,
): Settings => ({ ...settings, treeFiltering });

export const activate = (
	settings: Settings,
	key: PullRequestKey,
): Settings => ({
	...settings,
	activations: { ...settings.activations, [key]: true },
});

export function deactivate(settings: Settings, key: PullRequestKey): Settings {
	const { [key]: _removed, ...rest } = settings.activations;
	return { ...settings, activations: rest };
}

function withPreset(
	settings: Settings,
	id: PresetId,
	state: PresetState,
): Settings {
	return { ...settings, presets: { ...settings.presets, [id]: state } };
}

export const setPresetEnabled = (
	settings: Settings,
	id: PresetId,
	enabled: boolean,
): Settings => withPreset(settings, id, { ...settings.presets[id], enabled });

export function setPresetRules(
	settings: Settings,
	id: PresetId,
	rules: readonly string[],
): Settings {
	const { enabled } = settings.presets[id];
	const cleaned = rules.map((rule) => rule.trim()).filter(Boolean);
	return sameRules(cleaned, defaultRules(id))
		? withPreset(settings, id, { enabled })
		: withPreset(settings, id, { enabled, rules: cleaned });
}

export const addPresetRule = (
	settings: Settings,
	id: PresetId,
	pattern: string,
) => setPresetRules(settings, id, [...presetRules(settings, id), pattern]);

export const updatePresetRule = (
	settings: Settings,
	id: PresetId,
	index: number,
	pattern: string,
) =>
	setPresetRules(
		settings,
		id,
		presetRules(settings, id).map((rule, position) =>
			position === index ? pattern : rule,
		),
	);

export const removePresetRule = (
	settings: Settings,
	id: PresetId,
	index: number,
) =>
	setPresetRules(
		settings,
		id,
		presetRules(settings, id).filter((_, position) => position !== index),
	);

export const restorePreset = (settings: Settings, id: PresetId): Settings =>
	withPreset(settings, id, { enabled: settings.presets[id].enabled });

export const addCustomRule = (
	settings: Settings,
	id: string,
	pattern: string,
): Settings => ({
	...settings,
	customRules: [
		...settings.customRules,
		{ id, pattern: pattern.trim(), enabled: true },
	],
});

export const updateCustomRule = (
	settings: Settings,
	id: string,
	patch: Partial<Omit<CustomRule, "id">>,
): Settings => ({
	...settings,
	customRules: settings.customRules.map((rule) =>
		rule.id === id
			? {
					...rule,
					...patch,
					pattern: (patch.pattern ?? rule.pattern).trim(),
				}
			: rule,
	),
});

export const removeCustomRule = (settings: Settings, id: string): Settings => ({
	...settings,
	customRules: settings.customRules.filter((rule) => rule.id !== id),
});

export const addAlwaysShow = (
	settings: Settings,
	id: string,
	pattern: string,
): Settings => ({
	...settings,
	alwaysShow: [...settings.alwaysShow, { id, pattern: pattern.trim() }],
});

export const updateAlwaysShow = (
	settings: Settings,
	id: string,
	pattern: string,
): Settings => ({
	...settings,
	alwaysShow: settings.alwaysShow.map((rule) =>
		rule.id === id ? { ...rule, pattern: pattern.trim() } : rule,
	),
});

export const removeAlwaysShow = (settings: Settings, id: string): Settings => ({
	...settings,
	alwaysShow: settings.alwaysShow.filter((rule) => rule.id !== id),
});

export const presetIds = PRESETS.map((preset) => preset.id);
