import type { Settings } from "../../src/settings";

export const DEMO_KEY = "ribeirogab/github-file-hider-demo#1";

export function settingsWith(patch: Partial<Settings> = {}): Settings {
	return {
		schemaVersion: 1,
		mode: "manual",
		treeFiltering: true,
		presets: { tests: { enabled: false }, lockfiles: { enabled: false } },
		customRules: [],
		alwaysShow: [],
		activations: {},
		...patch,
	};
}

export const presetsOn = (patch: Partial<Settings> = {}) =>
	settingsWith({
		presets: { tests: { enabled: true }, lockfiles: { enabled: true } },
		...patch,
	});

export const demoSettings = (patch: Partial<Settings> = {}) =>
	presetsOn({
		customRules: [
			{ id: "generated", pattern: "**/generated/**", enabled: true },
			{ id: "docs", pattern: "docs/**", enabled: false },
		],
		alwaysShow: [{ id: "checkout", pattern: "src/payments/checkout.spec.ts" }],
		...patch,
	});
