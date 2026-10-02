import { expect, test } from "vitest";
import { evaluate, matches, validatePattern } from "../../src/rules";
import {
	firstInstallSettings,
	normalizeSettings,
} from "../../src/settings-store";

test.each([
	["*.lock", "yarn.lock", true],
	["*.lock", "apps/web/yarn.lock", false],
	["**/yarn.lock", "yarn.lock", true],
	["**/yarn.lock", "apps/web/yarn.lock", true],
	["docs/**", "docs/release notes.md", true],
	["docs/", "docs/release notes.md", true],
	["docs/**", "packages/docs/a.md", false],
	["a/*", "a/b/c", false],
	["a/?.ts", "a/x.ts", true],
	["a/?.ts", "a/xy.ts", false],
	["A.ts", "a.ts", false],
	["**/__tests__/**", "__tests__/a.ts", true],
	["**/*.spec.*", "src/legacy/old-checkout.spec.ts", true],
	["literal[1].ts", "literal1.ts", false],
	["{a,b}.ts", "a.ts", false],
	["!a.ts", "a.ts", false],
])("%s matches %s: %s", (pattern, path, expected) => {
	expect(matches(pattern, path)).toBe(expected);
});
test.each([
	["", "Enter a path or pattern."],
	["/docs", "Use a repository-relative path. Remove the leading /."],
	["a\\b", "Use forward slashes (/) in paths."],
	["***", "Use * or **, not ***."],
	["docs/", null],
	["docs/release notes.md", null],
])("validates %s", (pattern, error) => {
	expect(validatePattern(pattern)).toBe(error);
});
test("rejects a duplicate in its own list", () => {
	expect(validatePattern(" docs/ ", ["docs/"])).toBe(
		"This rule is already in the list.",
	);
});
test.each([
	"src/test-utils.ts",
	"src/utils/format-helpers.ts",
	"docs/tests.md",
])("Tests keeps %s visible", (path) => {
	const settings = firstInstallSettings();
	settings.presets.tests.enabled = true;
	expect(evaluate(path, settings).matching).toBe(false);
});
test("preset order and Always show priority", () => {
	const settings = firstInstallSettings();
	settings.presets.tests.enabled = true;
	settings.customRules = [{ id: "generated", enabled: true, pattern: "**" }];
	expect(evaluate("a.spec.ts", settings).reason).toEqual({
		kind: "preset",
		presetId: "tests",
		pattern: "**/*.spec.*",
	});
	settings.alwaysShow = [{ id: "checkout", pattern: "a.spec.ts" }];
	expect(evaluate("a.spec.ts", settings)).toEqual({
		matching: false,
		kept: true,
		reason: { kind: "always", ruleId: "checkout", pattern: "a.spec.ts" },
	});
});
test("unmodified presets follow installed defaults; edits and empty lists remain", () => {
	const settings = firstInstallSettings();
	settings.presets.tests.enabled = true;
	settings.presets.tests.rules = ["custom.ts"];
	expect(evaluate("a.spec.ts", settings).matching).toBe(false);
	expect(evaluate("custom.ts", settings).matching).toBe(true);
	settings.presets.tests.rules = [];
	expect(evaluate("custom.ts", settings).matching).toBe(false);
	expect(
		normalizeSettings({
			presets: {
				tests: { rules: ["**/*.spec.*", "**/*.test.*", "**/__tests__/**"] },
			},
		}).presets.tests.rules,
	).toBeUndefined();
});
