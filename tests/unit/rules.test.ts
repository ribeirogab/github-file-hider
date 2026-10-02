import { describe, expect, it } from "vitest";
import {
	evaluate,
	matchesPattern,
	presetRules,
	reasonLabel,
	validatePattern,
} from "../../src/rules";
import {
	addAlwaysShow,
	addCustomRule,
	firstInstallSettings,
	type Settings,
	setPresetEnabled,
} from "../../src/settings";

describe("pattern semantics", () => {
	it.each([
		["docs/**", "docs/setup.md", true],
		["docs/**", "docs/guides/setup.md", true],
		["docs/**", "packages/web/docs/setup.md", false],
		["docs/", "docs/setup.md", true],
		["docs/", "docs/guides/setup.md", true],
		["docs/", "packages/web/docs/setup.md", false],
		["*.lock", "yarn.lock", true],
		["*.lock", "apps/web/yarn.lock", false],
		["**/*.lock", "yarn.lock", true],
		["**/*.lock", "apps/web/yarn.lock", true],
		["**/yarn.lock", "yarn.lock", true],
		["**/yarn.lock", "apps/web/yarn.lock", true],
		["src/config.ts", "src/config.ts", true],
		["src/config.ts", "lib/src/config.ts", false],
		["src/*.ts", "src/config.ts", true],
		["src/*.ts", "src/utils/format.ts", false],
		["src/?.ts", "src/a.ts", true],
		["src/?.ts", "src/ab.ts", false],
		["src/?/x.ts", "src/a/x.ts", true],
		["**/*.test.*", "src/utils/format.test.js", true],
		["**/*.test.*", "format.test.ts", true],
		["**/generated/**", "src/generated/client.ts", true],
		["**/generated/**", "generated/client.ts", true],
		["**/__tests__/**", "src/__tests__/checkout.ts", true],
		["**/__tests__/**", "src/payments/__tests__/gateway.ts", true],
		["docs/release notes.md", "docs/release notes.md", true],
		["docs/* notes.md", "docs/release notes.md", true],
		["Docs/**", "docs/setup.md", false],
		["**/*.TS", "src/config.ts", false],
		["src/**/index.ts", "src/index.ts", true],
		["src/**/index.ts", "src/a/b/index.ts", true],
		["src/a.ts", "src/aXts", false],
	])("%s matches %s: %s", (pattern, path, expected) => {
		expect(matchesPattern(pattern, path)).toBe(expected);
	});
});

describe("Tests preset", () => {
	const settings = setPresetEnabled(firstInstallSettings(), "tests", true);
	it.each([
		["button.spec.ts", true],
		["src/components/Button.spec.tsx", true],
		["src/utils/format.test.js", true],
		["src/__tests__/checkout.ts", true],
		["e2e/checkout.spec.ts", true],
		["src/test-utils.ts", false],
		["src/testing/helpers.ts", false],
		["src/contest.ts", false],
	])("%s is matching: %s", (path, matching) => {
		expect(evaluate(path, settings).matching).toBe(matching);
	});
});

describe("Lockfiles preset", () => {
	const settings = setPresetEnabled(firstInstallSettings(), "lockfiles", true);
	it.each([
		["package-lock.json", true],
		["apps/web/yarn.lock", true],
		["packages/service/pnpm-lock.yaml", true],
		["examples/node/package-lock.json", true],
		["package.json", false],
		["bun.lockb", false],
	])("%s is matching: %s", (path, matching) => {
		expect(evaluate(path, settings).matching).toBe(matching);
	});
});

describe("evaluate", () => {
	it("hides nothing on first install", () => {
		expect(evaluate("src/a.spec.ts", firstInstallSettings())).toEqual({
			matching: false,
			kept: false,
			reason: null,
			overridden: null,
		});
	});

	it("names the first matching preset rule in catalog order", () => {
		const settings = setPresetEnabled(
			setPresetEnabled(firstInstallSettings(), "tests", true),
			"lockfiles",
			true,
		);
		const evaluation = evaluate("src/__tests__/a.spec.ts", settings);
		expect(evaluation.reason).toEqual({
			kind: "preset",
			presetId: "tests",
			pattern: "**/*.spec.*",
		});
		expect(reasonLabel(evaluation.reason)).toBe("Tests preset");
	});

	it("uses a custom rule only when it is on", () => {
		const settings: Settings = {
			...firstInstallSettings(),
			customRules: [
				{ id: "a", pattern: "docs/**", enabled: false },
				{ id: "b", pattern: "**/generated/**", enabled: true },
			],
		};
		expect(evaluate("docs/setup.md", settings).matching).toBe(false);
		expect(evaluate("src/generated/client.ts", settings).reason).toEqual({
			kind: "custom",
			ruleId: "b",
			pattern: "**/generated/**",
		});
	});
});

describe("validatePattern", () => {
	it.each([
		["", "Enter a path or pattern."],
		["   ", "Enter a path or pattern."],
		["/src/**", "Use a repository-relative path. Remove the leading /."],
		["src\\**", "Use forward slashes (/) in paths."],
		["src/***", "Use * or **, not ***."],
		["**/*.spec.*", "This rule is already in the list."],
		[" **/*.spec.* ", "This rule is already in the list."],
		["docs/**", null],
		["docs/release notes.md", null],
	])("%j gives %j", (pattern, message) => {
		expect(validatePattern(pattern, ["**/*.spec.*"])).toBe(message);
	});
});

describe("preset rules", () => {
	it("follows the default rules until the preset is modified", () => {
		expect(presetRules(firstInstallSettings(), "tests")).toEqual([
			"**/*.spec.*",
			"**/*.test.*",
			"**/__tests__/**",
		]);
	});
});

describe("Always show rules", () => {
	it("keep a file that a hide rule matches", () => {
		const settings = addAlwaysShow(
			setPresetEnabled(firstInstallSettings(), "tests", true),
			"keep",
			"src/payments/checkout.spec.ts",
		);
		expect(evaluate("src/payments/checkout.spec.ts", settings)).toEqual({
			matching: false,
			kept: true,
			reason: {
				kind: "always",
				ruleId: "keep",
				pattern: "src/payments/checkout.spec.ts",
			},
			overridden: {
				kind: "preset",
				presetId: "tests",
				pattern: "**/*.spec.*",
			},
		});
		expect(evaluate("src/payments/retry.spec.ts", settings).matching).toBe(
			true,
		);
	});

	it("win over custom rules too", () => {
		const settings = addAlwaysShow(
			addCustomRule(firstInstallSettings(), "c", "docs/**"),
			"k",
			"docs/setup.md",
		);
		expect(evaluate("docs/setup.md", settings)).toMatchObject({
			matching: false,
			kept: true,
		});
		expect(evaluate("docs/other.md", settings).matching).toBe(true);
	});

	it("do not mark a file kept when no hide rule matches it", () => {
		const settings = addAlwaysShow(firstInstallSettings(), "k", "README.md");
		expect(evaluate("README.md", settings)).toMatchObject({
			matching: false,
			kept: false,
		});
	});
});
