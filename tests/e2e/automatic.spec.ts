import {
	expect,
	openFixture,
	openSettings,
	seedSettings,
	storedSettings,
	test,
} from "../support/extension";
import {
	control,
	mainButton,
	menu,
	menuButton,
	menuItem,
	visibleDiffPaths,
} from "../support/page";
import { DEMO_KEY, presetsOn, settingsWith } from "../support/settings";

test("the General section offers Manual and Automatic", async ({
	page,
	extension,
}) => {
	await openSettings(extension, page);
	const manual = page.getByRole("radio", { name: /Manual/ });
	const automatic = page.getByRole("radio", { name: /Automatic/ });
	await expect(manual).toBeChecked();
	await expect(page.locator(".fh-choice").first()).toContainText(
		"ManualDefaultEach pull request starts with all files visible.",
	);
	await expect(page.locator(".fh-choice").last()).toContainText(
		"Your rules apply as soon as you open Files changed in any pull request. Show all files stays one click away.",
	);
	await automatic.check();
	await expect
		.poll(async () => (await storedSettings(extension)).mode)
		.toBe("automatic");
});

test("hides matching files at once in automatic mode", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, presetsOn({ mode: "automatic" }));
	await openFixture(page, "pr2-changes");
	await expect(menuButton(page)).toHaveText("400files hiddenAutomatic");
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hiddenAutomatic");
	expect(await visibleDiffPaths(page)).toHaveLength(14);
	expect((await storedSettings(extension)).activations).toEqual({});
	await menuButton(page).click();
	await expect(menuItem(page, "Hide files in this pull request")).toHaveCount(
		0,
	);
	await expect(menu(page).locator(".fh-ov-header")).toContainText("Automatic");
	await expect(menuItem(page, "Show all files")).toContainText(
		"Temporarily. Automatic mode stays on.",
	);
});

test("Show all files pauses automatic mode for the current view only", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, presetsOn({ mode: "automatic" }));
	await openFixture(page, "pr1-changes");
	await menuButton(page).click();
	await menuItem(page, "Show all files").click();
	await expect(control(page)).toHaveAttribute("data-view", "showing");
	await expect(mainButton(page)).toHaveText("Hide files again11");
	expect(await visibleDiffPaths(page)).toHaveLength(25);
	await page.reload();
	await expect(menuButton(page)).toHaveText("11files hiddenAutomatic");
	expect((await storedSettings(extension)).mode).toBe("automatic");
});

test("switching back to manual mode uses the stored activations again", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ mode: "automatic", activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hiddenAutomatic");
	const settings = await extension.newPage();
	await openSettings(extension, settings);
	await settings.getByRole("radio", { name: /Manual/ }).check();
	await expect(menuButton(page)).toHaveText("11files hidden");
	await openFixture(page, "pr2-changes");
	await expect(control(page)).toHaveAttribute("data-view", "inactive");
	await settings.getByRole("radio", { name: /Automatic/ }).check();
	await expect(menuButton(page)).toHaveText("400files hiddenAutomatic");
});

test("the empty menu explains automatic mode", async ({ page, extension }) => {
	await seedSettings(extension, settingsWith({ mode: "automatic" }));
	await openFixture(page, "pr1-changes");
	await menuButton(page).click();
	await expect(menu(page)).toContainText(
		"Turn on a preset or add custom rules. Automatic mode hides matching files when Files changed opens.",
	);
});
