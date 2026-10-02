import {
	DEMO,
	expect,
	openFixture,
	seedSettings,
	storedSettings,
	test,
} from "../support/extension";
import {
	announcement,
	control,
	mainButton,
	menu,
	menuButton,
	menuItem,
	treeEntry,
	visibleDiffPaths,
	visibleTreeFiles,
} from "../support/page";
import { DEMO_KEY, presetsOn, settingsWith } from "../support/settings";

const TESTS = [
	"e2e/checkout.spec.ts",
	"src/__tests__/checkout.ts",
	"src/components/Button.spec.tsx",
	"src/components/CheckoutForm.test.tsx",
	"src/legacy/old-checkout.spec.ts",
	"src/payments/__tests__/gateway.ts",
	"src/payments/checkout.spec.ts",
	"src/payments/retry-policy.spec.ts",
	"src/utils/format.test.ts",
];

const LOCKFILES = ["examples/node/package-lock.json", "pnpm-lock.yaml"];

test("shows the empty menu on first install", async ({ page }) => {
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("Hide files");
	await menuButton(page).click();
	await expect(menu(page)).toBeVisible();
	await expect(menu(page)).toContainText("Choose what to hide");
	await expect(menu(page)).toContainText(
		"Turn on a preset or add custom rules. Nothing is hidden until you select Hide files.",
	);
	await expect(menu(page).locator(".fh-al-heading")).toHaveText(
		"Presets, All repositories",
	);
	await expect(menuItem(page, "Tests")).toHaveAttribute(
		"aria-checked",
		"false",
	);
	await expect(menuItem(page, "Tests")).toContainText("9");
	await expect(menuItem(page, "Lockfiles")).toContainText("2");
});

test("turns a preset on from the menu for every repository", async ({
	page,
	extension,
}) => {
	await openFixture(page, "pr1-changes");
	await menuButton(page).click();
	await menuItem(page, "Tests").click();
	await expect(menuItem(page, "Tests")).toHaveAttribute("aria-checked", "true");
	await expect(menu(page)).toBeVisible();
	await expect
		.poll(async () => (await storedSettings(extension)).presets.tests.enabled)
		.toBe(true);
	await expect(mainButton(page)).toHaveText("Hide files9");
});

test("hides matching files and their tree entries after Hide files", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, presetsOn());
	await openFixture(page, "pr1-changes");
	const before = await visibleDiffPaths(page);
	const treeItems = await page.locator('[role="treeitem"]').count();
	const blocks = await page.locator('[id^="diff-"][role="region"]').count();
	await expect(mainButton(page)).toHaveText("Hide files11");
	await expect(mainButton(page)).toHaveAttribute(
		"data-fh-tip",
		"Hide 11 files that match your rules",
	);
	await mainButton(page).click();
	await expect(menuButton(page)).toHaveText("11files hidden");
	await expect(menuButton(page)).toBeFocused();
	const hidden = [...TESTS, ...LOCKFILES];
	expect(await visibleDiffPaths(page)).toEqual(
		before.filter((path) => !hidden.includes(path)),
	);
	expect((await visibleTreeFiles(page)).sort()).toEqual(
		before.filter((path) => !hidden.includes(path)).sort(),
	);
	await expect(treeEntry(page, "e2e")).toBeHidden();
	await expect(treeEntry(page, "src/legacy")).toBeHidden();
	await expect(treeEntry(page, "src")).toBeVisible();
	expect(await page.locator('[role="treeitem"]').count()).toBe(treeItems);
	expect(await page.locator('[id^="diff-"][role="region"]').count()).toBe(
		blocks,
	);
	await expect(page.getByText("0 of 25 files viewed")).toHaveCount(1);
	await expect(
		page
			.locator('[data-component="CounterLabel"]', { hasText: /^25$/ })
			.first(),
	).toBeAttached();
	await expect(announcement(page)).toHaveText("11 files hidden.");
	await expect
		.poll(async () => (await storedSettings(extension)).activations)
		.toEqual({ [DEMO_KEY]: true });
});

test("turns filtering off and forgets the activation from the menu", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hidden");
	await menuButton(page).click();
	const toggle = menuItem(page, "Hide files in this pull request");
	await expect(toggle).toHaveAttribute("aria-checked", "true");
	await expect(toggle).toContainText("Remembered for #1");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-checked", "false");
	await expect(mainButton(page)).toHaveText("Hide files11");
	expect(await visibleDiffPaths(page)).toHaveLength(25);
	await expect
		.poll(async () => (await storedSettings(extension)).activations)
		.toEqual({});
	await expect(announcement(page)).toHaveText("All files are visible.");
});

test("keeps the activation after a reload and per pull request", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, presetsOn());
	await openFixture(page, "pr1-changes");
	await mainButton(page).click();
	await expect(menuButton(page)).toHaveText("11files hidden");
	await page.reload();
	await expect(menuButton(page)).toHaveText("11files hidden");
	await openFixture(page, "pr1-commit");
	await expect(menuButton(page)).toContainText("files hidden");
	await openFixture(page, "pr1-range");
	await expect(menuButton(page)).toContainText("files hidden");
	await openFixture(page, "pr2-changes");
	await expect(mainButton(page)).toHaveText("Hide files400");
	await expect(control(page)).toHaveAttribute("data-view", "inactive");
});

test("ignores letter case in the pull request key", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(
		page,
		"pr1-changes",
		`${DEMO.replace("ribeirogab/github-file-hider-demo", "RibeiroGab/GitHub-File-Hider-Demo")}/pull/1/changes`,
	);
	await expect(menuButton(page)).toHaveText("11files hidden");
});

test("follows the ActionMenu keyboard contract", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, presetsOn());
	await openFixture(page, "pr1-changes");
	await menuButton(page).focus();
	await page.keyboard.press("ArrowDown");
	await expect(menu(page)).toBeVisible();
	await expect(menuItem(page, "Hide files in this pull request")).toBeFocused();
	await page.keyboard.press("ArrowDown");
	await expect(menuItem(page, "Tests")).toBeFocused();
	await page.keyboard.press("Space");
	await expect(menuItem(page, "Tests")).toHaveAttribute(
		"aria-checked",
		"false",
	);
	await expect(menuItem(page, "Tests")).toBeFocused();
	await page.keyboard.press("End");
	await expect(menuItem(page, "Settings")).toBeFocused();
	await page.keyboard.press("Home");
	await expect(menuItem(page, "Hide files in this pull request")).toBeFocused();
	await page.keyboard.press("l");
	await expect(menuItem(page, "Lockfiles")).toBeFocused();
	await page.keyboard.press("ArrowUp");
	await expect(menuItem(page, "Tests")).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(menu(page)).toHaveCount(0);
	await expect(menuButton(page)).toBeFocused();
	await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
	await page.keyboard.press("ArrowUp");
	await expect(menuItem(page, "Settings")).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(menu(page)).toHaveCount(0);
	await expect(menuButton(page)).toBeFocused();
});

test("announces a change of the hidden count once", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hidden");
	await menuButton(page).click();
	await menuItem(page, "Lockfiles").click();
	await expect(menuButton(page)).toHaveText("9files hidden");
	await expect(announcement(page)).toHaveText("9 files hidden.");
	await page.waitForTimeout(400);
	await expect(announcement(page)).toHaveText("9 files hidden.");
});

test("starts with settings as stored", async ({ page, extension }) => {
	await seedSettings(extension, settingsWith());
	await openFixture(page, "pr1-changes");
	await expect(control(page)).toHaveAttribute("data-view", "empty");
});
