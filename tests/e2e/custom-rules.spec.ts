import type { Page } from "@playwright/test";
import {
	expect,
	openFixture,
	openSettings,
	seedSettings,
	storedSettings,
	test,
} from "../support/extension";
import {
	diffBlock,
	menuButton,
	menuItem,
	visibleDiffPaths,
} from "../support/page";
import { DEMO_KEY, demoSettings, presetsOn } from "../support/settings";

const box = (page: Page, name: string) => page.getByRole("region", { name });

test("edits custom rules with their own on and off switches", async ({
	page,
	extension,
}) => {
	await openSettings(extension, page, "custom");
	const rules = box(page, "Hide rules");
	await expect(
		rules.getByRole("heading", { name: "No custom rules yet" }),
	).toBeVisible();
	await expect(rules).toContainText(
		"Add a pattern such as docs/** or **/generated/** to hide files that presets don't cover.",
	);
	const add = rules.getByRole("textbox", {
		name: "Add a rule to custom rules",
	});
	await add.fill("/docs/**");
	await add.press("Enter");
	await expect(rules.locator(".fh-validation")).toHaveText(
		"Use a repository-relative path. Remove the leading /.",
	);
	await add.fill("docs/**");
	await add.press("Enter");
	await add.fill("**/generated/**");
	await add.press("Enter");
	await expect(rules.locator(".fh-rule-pattern")).toHaveText([
		"docs/**",
		"**/generated/**",
	]);
	await expect(rules.locator(".fh-box-header")).toContainText("2 of 2 on");
	await rules.getByRole("checkbox", { name: "docs/**: On" }).click();
	await expect(
		rules.getByRole("checkbox", { name: "docs/**: Off" }),
	).not.toBeChecked();
	await expect(rules.locator(".fh-rule.is-off .fh-label")).toHaveText("Off");
	await expect(rules.locator(".fh-box-header")).toContainText("1 of 2 on");
	await rules.getByRole("button", { name: "Edit rule docs/**" }).click();
	const edit = rules.getByRole("textbox", { name: "Edit rule docs/**" });
	await edit.fill("**/generated/**");
	await edit.press("Enter");
	await expect(rules.locator(".fh-validation").first()).toHaveText(
		"This rule is already in the list.",
	);
	await edit.fill("docs/");
	await edit.press("Enter");
	await expect(rules.locator(".fh-rule-pattern").first()).toHaveText("docs/");
	await expect
		.poll(async () =>
			(await storedSettings(extension)).customRules.map((rule) => [
				rule.pattern,
				rule.enabled,
			]),
		)
		.toEqual([
			["docs/", false],
			["**/generated/**", true],
		]);
	await rules.getByRole("button", { name: "Remove rule docs/" }).click();
	await expect(rules.locator(".fh-rule-pattern")).toHaveText([
		"**/generated/**",
	]);
	await expect(page.locator(".fh-details[open]")).toContainText(
		"Same as docs/**",
	);
});

test("edits Always show rules without switches and shows the example", async ({
	page,
	extension,
}) => {
	await openSettings(extension, page, "always");
	await expect(page.getByLabel("Example")).toContainText(
		"Other .spec.ts files are hidden. src/payments/checkout.spec.ts stays visible.",
	);
	const rules = box(page, "Always show rules");
	await expect(
		rules.getByRole("heading", { name: "No Always show rules" }),
	).toBeVisible();
	const add = rules.getByRole("textbox", {
		name: "Add a rule to Always show rules",
	});
	await add.fill("src/payments/checkout.spec.ts");
	await add.press("Enter");
	await add.fill("src/payments/checkout.spec.ts");
	await add.press("Enter");
	await expect(rules.locator(".fh-validation")).toHaveText(
		"This rule is already in the list.",
	);
	await expect(rules.locator(".fh-rule-pattern")).toHaveText([
		"src/payments/checkout.spec.ts",
	]);
	await expect(rules.getByRole("checkbox")).toHaveCount(0);
	await page.locator(".fh-details > summary").click();
	await expect(page.locator(".fh-details")).toContainText("Same as docs/**");
	await expect
		.poll(async () => (await storedSettings(extension)).alwaysShow.length)
		.toBe(1);
});

test("the menu summarizes the custom rules and their matches", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, presetsOn());
	await openFixture(page, "pr1-changes");
	await menuButton(page).click();
	await expect(menuItem(page, "Custom rules")).toContainText(
		"No custom rules yet",
	);
	await page.keyboard.press("Escape");

	await seedSettings(
		extension,
		demoSettings({
			customRules: [
				{ id: "a", pattern: "docs/**", enabled: false },
				{ id: "b", pattern: "**/generated/**", enabled: false },
			],
		}),
	);
	await menuButton(page).click();
	await expect(menuItem(page, "Custom rules")).toContainText(
		"2 rules, all off",
	);
	await page.keyboard.press("Escape");

	await seedSettings(extension, demoSettings());
	await menuButton(page).click();
	await expect(menuItem(page, "Custom rules")).toContainText("**/generated/**");
	await expect(
		menuItem(page, "Custom rules").locator(".fh-al-count"),
	).toHaveText("1");
});

test("the demo configuration hides 11 of 25 files and keeps checkout.spec.ts", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		demoSettings({ activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hidden");
	expect((await visibleDiffPaths(page)).sort()).toEqual(
		[
			"README.md",
			"docs/payments.md",
			"docs/release notes.md",
			"package.json",
			"src/components/Button.tsx",
			"src/components/CheckoutForm.tsx",
			"src/config.ts",
			"src/payments/checkout.spec.ts",
			"src/payments/checkout.ts",
			"src/payments/gateway.ts",
			"src/payments/retry-policy.ts",
			"src/test-utils.ts",
			"src/utils/format-helpers.ts",
			"src/utils/format.ts",
		].sort(),
	);
	const kept = diffBlock(page, "src/payments/checkout.spec.ts").locator(
		".fh-file-label",
	);
	await expect(kept).toHaveText("Always shown");
	await expect(kept).toHaveAttribute(
		"data-fh-tip",
		"Kept visible by the Always show rule src/payments/checkout.spec.ts. Otherwise the Tests preset (**/*.spec.*) would hide it.",
	);
	await expect(diffBlock(page, "src/legacy/old-checkout.spec.ts")).toBeHidden();
	await expect(diffBlock(page, "src/generated/client.ts")).toBeHidden();
	await menuButton(page).click();
	await expect(menuItem(page, "Tests").locator(".fh-al-count")).toHaveText("8");
	await expect(menuItem(page, "Lockfiles").locator(".fh-al-count")).toHaveText(
		"2",
	);
	await expect(
		menuItem(page, "Custom rules").locator(".fh-al-count"),
	).toHaveText("1");
	await menuItem(page, "Show all files").click();
	await expect(kept).toHaveCount(0);
});

test("Always show rules apply at once in an open pull request", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hidden");
	const settings = await extension.newPage();
	await openSettings(extension, settings, "always");
	const add = settings.getByRole("textbox", {
		name: "Add a rule to Always show rules",
	});
	await add.fill("src/payments/**");
	await add.press("Enter");
	await expect(menuButton(page)).toHaveText("8files hidden");
	await expect(
		diffBlock(page, "src/payments/retry-policy.spec.ts").locator(
			".fh-file-label",
		),
	).toHaveText("Always shown");
});
