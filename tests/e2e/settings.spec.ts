import type { Page } from "@playwright/test";
import {
	clickExtensionIcon,
	expect,
	openFixture,
	openSettings,
	seedSettings,
	storedSettings,
	test,
} from "../support/extension";
import { mainButton, menuButton, menuItem } from "../support/page";
import { DEMO_KEY, presetsOn, settingsWith } from "../support/settings";

const nav = (page: Page, name: string | RegExp) =>
	page.getByRole("navigation", { name: "Settings" }).getByRole("button", {
		name,
	});

const presetBox = (page: Page, name: string) =>
	page.getByRole("region", { name });

test("installation opens no page", async ({ extension }) => {
	await expect
		.poll(() => extension.pages().map((page) => page.url()))
		.not.toContainEqual(expect.stringContaining("chrome-extension://"));
});

test("the extension icon opens the Settings page in a tab", async ({
	page,
	extension,
}) => {
	await openFixture(page, "pr1-changes");
	const opened = extension.waitForEvent("page");
	await clickExtensionIcon(extension);
	const settings = await opened;
	await expect(settings).toHaveURL(/\/settings\.html$/);
	await expect(
		settings.getByRole("heading", { name: "GitHub File Hider", level: 1 }),
	).toBeVisible();
});

test("Settings in the menu opens the same page", async ({
	page,
	extension,
}) => {
	await openFixture(page, "pr1-changes");
	await menuButton(page).click();
	const opened = extension.waitForEvent("page");
	await menuItem(page, "Settings").click();
	const settings = await opened;
	await expect(settings).toHaveURL(/\/settings\.html#general$/);
	await expect(
		settings.getByRole("heading", { name: "General" }),
	).toBeVisible();
});

test("Edit rules opens the section with the most hiding rules", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		settingsWith({
			customRules: [{ id: "all", pattern: "**", enabled: true }],
			activations: { [DEMO_KEY]: true },
		}),
	);
	await openFixture(page, "pr1-changes");
	const opened = extension.waitForEvent("page");
	await page.getByRole("button", { name: "Edit rules" }).click();
	const settings = await opened;
	await expect(settings).toHaveURL(/\/settings\.html#custom$/);
	await expect(
		settings.getByRole("heading", { name: "Custom rules", level: 2 }),
	).toBeVisible();
});

test("states the scope, the storage, and that it is not affiliated with GitHub", async ({
	page,
	extension,
}) => {
	await openSettings(extension, page);
	await expect(page).toHaveTitle("GitHub File Hider settings");
	await expect(
		page.getByText("Extension settings · Version 2026.10.02.1"),
	).toBeVisible();
	await expect(
		page.getByText(
			"Settings apply to every repository and are stored only in this browser.",
		),
	).toBeVisible();
	await expect(
		page.getByText("GitHub File Hider is not affiliated with GitHub."),
	).toBeVisible();
	await expect(
		page.getByText("Every repository", { exact: true }),
	).toBeVisible();
	await expect(
		page.getByText("Only in this browser", { exact: true }),
	).toBeVisible();
	await expect(page.getByText("Display only", { exact: true })).toBeVisible();
});

test("turns presets on and off", async ({ page, extension }) => {
	await openSettings(extension, page, "presets");
	const tests = presetBox(page, "Tests");
	const toggle = tests.getByRole("button", { name: "Tests", exact: true });
	await expect(toggle).toHaveAttribute("aria-pressed", "false");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	await expect(page.locator(".fh-saved")).toHaveClass(/is-on/);
	await expect
		.poll(async () => (await storedSettings(extension)).presets.tests.enabled)
		.toBe(true);
	await expect(nav(page, /Presets/)).toContainText("1");
});

test("adds, edits, and removes preset rules with validation", async ({
	page,
	extension,
}) => {
	await openSettings(extension, page, "presets");
	const tests = presetBox(page, "Tests");
	const add = tests.getByRole("textbox", {
		name: "Add a rule to Tests preset",
	});
	const error = tests.locator(".fh-validation").last();
	for (const [value, message] of [
		["   ", "Enter a path or pattern."],
		["/src/**", "Use a repository-relative path. Remove the leading /."],
		["src\\**", "Use forward slashes (/) in paths."],
		["src/***", "Use * or **, not ***."],
		["**/*.spec.*", "This rule is already in the list."],
	]) {
		await add.fill(value as string);
		await add.press("Enter");
		await expect(error).toHaveText(message as string);
		await expect(add).toHaveAttribute("aria-invalid", "true");
	}
	await add.fill("**/*.e2e.ts");
	await expect(error).toHaveText("");
	await add.press("Enter");
	await expect(tests.locator(".fh-rule-pattern")).toHaveText([
		"**/*.spec.*",
		"**/*.test.*",
		"**/__tests__/**",
		"**/*.e2e.ts",
	]);
	await expect(add).toBeFocused();
	await expect(add).toHaveValue("");
	await expect(tests.locator(".fh-label")).toHaveText("Modified");

	await tests.getByRole("button", { name: "Edit rule **/*.e2e.ts" }).click();
	const edit = tests.getByRole("textbox", { name: "Edit rule **/*.e2e.ts" });
	await expect(edit).toBeFocused();
	await edit.fill("**/*.test.*");
	await edit.press("Enter");
	await expect(tests.locator(".fh-validation").first()).toHaveText(
		"This rule is already in the list.",
	);
	await edit.fill("**/*.cy.ts");
	await edit.press("Enter");
	await expect(tests.locator(".fh-rule-pattern").last()).toHaveText(
		"**/*.cy.ts",
	);
	await expect(
		tests.getByRole("button", { name: "Edit rule **/*.cy.ts" }),
	).toBeFocused();

	await tests.getByRole("button", { name: "Remove rule **/*.cy.ts" }).click();
	await expect(tests.locator(".fh-rule-pattern")).toHaveCount(3);
	await expect(tests.locator(".fh-label")).toHaveCount(0);
	await expect
		.poll(async () => (await storedSettings(extension)).presets.tests)
		.toEqual({ enabled: false });
});

test("restores a modified preset to its default rules", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		settingsWith({
			presets: {
				tests: { enabled: true },
				lockfiles: { enabled: true, rules: ["**/bun.lockb"] },
			},
		}),
	);
	await openSettings(extension, page, "presets");
	const lockfiles = presetBox(page, "Lockfiles");
	await expect(lockfiles.locator(".fh-label")).toHaveText("Modified");
	await expect(
		presetBox(page, "Tests").getByRole("button", { name: "Restore defaults" }),
	).toHaveAttribute("aria-disabled", "true");
	await lockfiles.getByRole("button", { name: "Restore defaults" }).click();
	await expect(lockfiles.locator(".fh-rule-pattern")).toHaveText([
		"**/package-lock.json",
		"**/yarn.lock",
		"**/pnpm-lock.yaml",
	]);
	await expect(lockfiles.locator(".fh-label")).toHaveCount(0);
	await expect(page.locator('.fh-sr[role="status"]')).toHaveText(
		"Lockfiles preset restored to its default rules.",
	);
	await expect
		.poll(async () => (await storedSettings(extension)).presets.lockfiles)
		.toEqual({ enabled: true });
});

test("changes reach an open pull request without a reload", async ({
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
	await openSettings(extension, settings, "presets");
	await presetBox(settings, "Lockfiles")
		.getByRole("button", { name: "Lockfiles", exact: true })
		.click();
	await expect(menuButton(page)).toHaveText("9files hidden");
	await presetBox(settings, "Tests")
		.getByRole("button", { name: "Tests", exact: true })
		.click();
	await expect(page.locator(".fh-ctl")).toHaveAttribute("data-view", "empty");
	await presetBox(settings, "Tests")
		.getByRole("button", { name: "Tests", exact: true })
		.click();
	await expect(menuButton(page)).toHaveText("9files hidden");
	await expect(mainButton(page)).toBeHidden();
});

test("is usable with the keyboard", async ({ page, extension }) => {
	await openSettings(extension, page);
	await nav(page, /Presets/).focus();
	await page.keyboard.press("Enter");
	await expect(
		page.getByRole("heading", { name: "Presets", level: 2 }),
	).toBeVisible();
	await expect(nav(page, /Presets/)).toBeFocused();
	await expect(nav(page, /Presets/)).toHaveAttribute("aria-current", "page");
	const tests = presetBox(page, "Tests");
	await tests.getByRole("button", { name: "Tests", exact: true }).focus();
	await page.keyboard.press("Space");
	await expect(
		tests.getByRole("button", { name: "Tests", exact: true }),
	).toHaveAttribute("aria-pressed", "true");
	const editButton = tests.getByRole("button", {
		name: "Edit rule **/*.test.*",
	});
	await editButton.focus();
	await page.keyboard.press("Enter");
	await expect(
		tests.getByRole("textbox", { name: "Edit rule **/*.test.*" }),
	).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(editButton).toBeFocused();
	await tests.getByRole("button", { name: "Remove rule **/*.test.*" }).focus();
	await page.keyboard.press("Enter");
	await expect(
		tests.getByRole("button", { name: "Remove rule **/__tests__/**" }),
	).toBeFocused();
});
