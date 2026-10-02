import { describe, expect, it } from "vitest";
import { presetRules } from "../../src/rules";
import {
	activate,
	addPresetRule,
	deactivate,
	firstInstallSettings,
	isActive,
	normalizeSettings,
	pullRequestKey,
	removePresetRule,
	restorePreset,
	setPresetRules,
	updatePresetRule,
} from "../../src/settings";

describe("first install", () => {
	it("starts in manual mode with tree filtering on and both presets off", () => {
		expect(firstInstallSettings()).toEqual({
			schemaVersion: 1,
			mode: "manual",
			treeFiltering: true,
			presets: { tests: { enabled: false }, lockfiles: { enabled: false } },
			customRules: [],
			alwaysShow: [],
			activations: {},
		});
		expect(normalizeSettings(undefined)).toEqual(firstInstallSettings());
	});
});

describe("pull request key", () => {
	it("ignores letter case", () => {
		expect(pullRequestKey("Acme", "StoreFront", "482")).toBe(
			"acme/storefront#482",
		);
	});

	it("remembers activation per key and forgets it when turned off", () => {
		const key = pullRequestKey("acme", "storefront", "482");
		const settings = activate(firstInstallSettings(), key);
		expect(isActive(settings, key)).toBe(true);
		expect(isActive(settings, "acme/storefront#483")).toBe(false);
		expect(isActive(deactivate(settings, key), key)).toBe(false);
	});

	it("lowercases stored activations on load", () => {
		expect(
			normalizeSettings({ activations: { "Acme/StoreFront#482": true } })
				.activations,
		).toEqual({ "acme/storefront#482": true });
	});
});

describe("preset edits (ADR 0003)", () => {
	it("stores rules only while they differ from the defaults", () => {
		const added = addPresetRule(firstInstallSettings(), "tests", "**/*.e2e.ts");
		expect(added.presets.tests.rules).toEqual([
			"**/*.spec.*",
			"**/*.test.*",
			"**/__tests__/**",
			"**/*.e2e.ts",
		]);
		const back = removePresetRule(added, "tests", 3);
		expect(back.presets.tests).toEqual({ enabled: false });
	});

	it("restores the defaults by removing the stored list", () => {
		const edited = updatePresetRule(
			firstInstallSettings(),
			"lockfiles",
			1,
			"**/bun.lockb",
		);
		expect(edited.presets.lockfiles.rules).toBeDefined();
		expect(restorePreset(edited, "lockfiles").presets.lockfiles).toEqual({
			enabled: false,
		});
	});

	it("follows the installed defaults for an unmodified preset", () => {
		const stored = normalizeSettings({
			presets: {
				tests: {
					enabled: true,
					rules: presetRules(firstInstallSettings(), "tests"),
				},
			},
		});
		expect(stored.presets.tests).toEqual({ enabled: true });
		expect(
			setPresetRules(firstInstallSettings(), "tests", ["**/*.spec.*"]).presets
				.tests.rules,
		).toEqual(["**/*.spec.*"]);
	});
});
