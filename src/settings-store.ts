import { presets, validatePattern } from "./rules";
import type { Settings } from "./types";
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
function record(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
function patterns(value: unknown): string[] {
	const result: string[] = [];
	if (Array.isArray(value))
		for (const item of value)
			if (typeof item === "string" && !validatePattern(item, result))
				result.push(item.trim());
	return result;
}
export function normalizeSettings(value: unknown): Settings {
	const raw = record(value);
	const settings = firstInstallSettings();
	settings.mode = raw.mode === "automatic" ? "automatic" : "manual";
	settings.treeFiltering = raw.treeFiltering !== false;
	for (const preset of presets) {
		const stored = record(record(raw.presets)[preset.id]);
		settings.presets[preset.id].enabled = stored.enabled === true;
		if (Array.isArray(stored.rules)) {
			const rules = patterns(stored.rules);
			if (JSON.stringify(rules) !== JSON.stringify(preset.rules))
				settings.presets[preset.id].rules = rules;
		}
	}
	for (const list of ["customRules", "alwaysShow"] as const) {
		const entries = raw[list];
		if (!Array.isArray(entries)) continue;
		for (const item of entries) {
			const r = record(item);
			if (
				typeof r.id !== "string" ||
				typeof r.pattern !== "string" ||
				validatePattern(
					r.pattern,
					settings[list].map((r) => r.pattern),
				)
			)
				continue;
			if (list === "customRules")
				settings.customRules.push({
					id: r.id,
					pattern: r.pattern.trim(),
					enabled: r.enabled === true,
				});
			else settings.alwaysShow.push({ id: r.id, pattern: r.pattern.trim() });
		}
	}
	for (const [key, active] of Object.entries(record(raw.activations)))
		if (active === true) settings.activations[key.toLowerCase()] = true;
	return settings;
}
export async function readSettings(): Promise<Settings> {
	return normalizeSettings(
		(await chrome.storage.local.get("settings")).settings,
	);
}
export async function updateSettings(
	change: (settings: Settings) => void,
): Promise<void> {
	const settings = await readSettings();
	change(settings);
	await chrome.storage.local.set({ settings: normalizeSettings(settings) });
}
export function watchSettings(listener: (settings: Settings) => void) {
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === "local" && changes.settings)
			listener(normalizeSettings(changes.settings.newValue));
	});
}
