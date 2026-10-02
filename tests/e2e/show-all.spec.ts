import {
	expect,
	openFixture,
	replaceDocument,
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
	visibleDiffPaths,
} from "../support/page";
import { DEMO_KEY, presetsOn, settingsWith } from "../support/settings";

const activePresets = () => presetsOn({ activations: { [DEMO_KEY]: true } });

test("shows all files for now and hides them again", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, activePresets());
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hidden");
	await menuButton(page).click();
	await expect(menuItem(page, "Show all files")).toContainText(
		"Temporarily. Your rules stay on.",
	);
	await menuItem(page, "Show all files").click();
	await expect(menu(page)).toHaveCount(0);
	await expect(control(page)).toHaveAttribute("data-view", "showing");
	await expect(mainButton(page)).toHaveText("Hide files again11");
	await expect(mainButton(page)).toHaveAttribute(
		"data-fh-tip",
		"All files are showing for now. Hide the matching files again.",
	);
	await expect(menuButton(page)).toBeFocused();
	expect(await visibleDiffPaths(page)).toHaveLength(25);
	await expect(announcement(page)).toHaveText(
		"Showing all files. 11 files match your rules.",
	);
	expect(await storedSettings(extension)).toEqual(activePresets());

	await menuButton(page).click();
	await expect(menuItem(page, "Hide files again")).toContainText(
		"Showing all files for now",
	);
	await page.keyboard.press("Escape");
	await mainButton(page).click();
	await expect(menuButton(page)).toHaveText("11files hidden");
	expect(await visibleDiffPaths(page)).toHaveLength(14);
	await expect(announcement(page)).toHaveText("11 files hidden.");
});

test("ends Show all files on reload and when the user leaves the pull request", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, activePresets());
	await openFixture(page, "pr1-changes");
	await menuButton(page).click();
	await menuItem(page, "Show all files").click();
	await expect(control(page)).toHaveAttribute("data-view", "showing");
	await page.reload();
	await expect(menuButton(page)).toHaveText("11files hidden");

	await menuButton(page).click();
	await menuItem(page, "Show all files").click();
	await expect(control(page)).toHaveAttribute("data-view", "showing");
	await replaceDocument(page, "pr1-conversation");
	await expect(page.locator(".fh-ctl")).toHaveCount(0);
	await replaceDocument(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hidden");
	expect(await storedSettings(extension)).toEqual(activePresets());
});

test("explains an empty diff and tree when every file is hidden", async ({
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
	await expect(menuButton(page)).toHaveText("25files hidden");
	const blankslate = page.getByRole("region", { name: "All files are hidden" });
	await expect(blankslate).toBeVisible();
	await expect(blankslate).toContainText(
		"Every file in this pull request matches your rules. Hidden files are still part of the pull request and may need review.",
	);
	const note = page.locator(".fh-tree-empty");
	await expect(note).toBeVisible();
	await expect(note).toContainText(
		"All files are hiddenYour rules hide every file in this tree.",
	);
	await expect(control(page)).toBeVisible();
	await blankslate.getByRole("button", { name: "Show all files" }).click();
	await expect(control(page)).toHaveAttribute("data-view", "showing");
	await expect(menuButton(page)).toBeFocused();
	await expect(blankslate).toHaveCount(0);
	await expect(note).toHaveCount(0);
	expect(await visibleDiffPaths(page)).toHaveLength(25);
});

test("explains files kept by an Always show rule", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		settingsWith({
			customRules: [{ id: "all", pattern: "**", enabled: true }],
			alwaysShow: [{ id: "keep", pattern: "src/payments/checkout.spec.ts" }],
			activations: { [DEMO_KEY]: true },
		}),
	);
	await openFixture(page, "pr1-changes");
	const blankslate = page.getByRole("region", {
		name: "All other files are hidden",
	});
	await expect(blankslate).toContainText(
		"Only the file kept by an Always show rule is visible.",
	);
	await expect(page.locator(".fh-tree-empty")).toHaveCount(0);
	expect(await visibleDiffPaths(page)).toEqual([
		"src/payments/checkout.spec.ts",
	]);
});
