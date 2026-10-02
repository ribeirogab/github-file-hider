import { expect, test } from "vitest";
import {
	firstInstallSettings,
	normalizeSettings,
} from "../../src/settings-store";

test("first install uses manual mode, tree filtering, and no rules or activations", () => {
	expect(firstInstallSettings()).toEqual({
		schemaVersion: 1,
		mode: "manual",
		treeFiltering: true,
		presets: { tests: { enabled: false }, lockfiles: { enabled: false } },
		customRules: [],
		alwaysShow: [],
		activations: {},
	});
});
test("normalization preserves preset edits and removes defaults", () => {
	const settings = firstInstallSettings();
	settings.presets.tests.rules = [
		"**/*.spec.*",
		"**/*.test.*",
		"**/__tests__/**",
	];
	settings.presets.lockfiles.rules = [];
	expect(normalizeSettings(settings).presets).toEqual({
		tests: { enabled: false },
		lockfiles: { enabled: false, rules: [] },
	});
});
test("malformed storage cannot produce invalid rules or activation keys with mixed case", () => {
	expect(
		normalizeSettings({
			presets: { tests: { enabled: true, rules: ["/bad", "docs/", "docs/"] } },
			activations: { "OWNER/REPO#1": true, "owner/repo#2": false },
		}),
	).toMatchObject({
		presets: { tests: { enabled: true, rules: ["docs/"] } },
		activations: { "owner/repo#1": true },
	});
});
