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
	treeEntry,
	visibleDiffPaths,
	visibleTreeFiles,
} from "../support/page";
import { DEMO_KEY, presetsOn } from "../support/settings";

const BUTTON_SPEC = "src/components/Button.spec.tsx";

test("the General switch and the menu switch turn tree filtering on and off", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(page, "pr1-changes");
	await menuButton(page).click();
	const tree = menuItem(page, "Hide in sidebar tree");
	await expect(tree).toHaveAttribute("aria-checked", "true");
	await expect(tree).toContainText("Matching files leave the tree");
	await tree.click();
	await expect(tree).toHaveAttribute("aria-checked", "false");
	await expect(tree).toContainText("The tree stays complete");
	await expect
		.poll(async () => (await storedSettings(extension)).treeFiltering)
		.toBe(false);

	const settings = await extension.newPage();
	await openSettings(extension, settings);
	const toggle = settings.getByRole("button", {
		name: "Hide matching files in the sidebar tree",
	});
	await expect(toggle).toHaveAttribute("aria-pressed", "false");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	await expect(tree).toHaveAttribute("aria-checked", "true");
});

test("keeps the tree complete and mutes matching entries when tree filtering is off", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ treeFiltering: false, activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hidden");
	expect(await visibleTreeFiles(page)).toHaveLength(25);
	expect(await visibleDiffPaths(page)).toHaveLength(14);
	const entry = treeEntry(page, BUTTON_SPEC);
	await expect(entry).toHaveAttribute("data-fh-state", "diff-hidden");
	const hint = entry.locator('.fh-tree-hint[data-kind="hidden"]');
	await expect(hint).toHaveAttribute(
		"data-fh-tip",
		"Hidden in the diff by the Tests preset (**/*.spec.*). Select to show it temporarily.",
	);
	await expect(hint).toHaveAttribute("role", "img");
	await expect(page.locator('.fh-tree-hint[data-kind="hidden"]')).toHaveCount(
		11,
	);
	await expect(
		treeEntry(page, "src/components/Button.tsx"),
	).not.toHaveAttribute("data-fh-state");
	await hint.hover();
	await page.mouse.move(0, 0);
	await hint.hover();
	await expect(page.getByRole("tooltip")).toHaveText(
		"Hidden in the diff by the Tests preset (**/*.spec.*). Select to show it temporarily.",
	);
});

test("selecting a muted entry reveals the file like a direct link", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ treeFiltering: false, activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(page, "pr1-changes");
	await treeEntry(page, BUTTON_SPEC).click();
	await expect(diffBlock(page, BUTTON_SPEC)).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Temporarily visible file" }),
	).toBeVisible();
	await expect(menuButton(page)).toHaveText("10files hidden");
	await expect(treeEntry(page, BUTTON_SPEC)).toHaveAttribute(
		"data-fh-state",
		"revealed",
	);
	await expect(
		treeEntry(page, BUTTON_SPEC).locator('.fh-tree-hint[data-kind="revealed"]'),
	).toHaveAttribute(
		"data-fh-tip",
		"Temporarily visible because you opened a direct link",
	);

	const lockfile = treeEntry(page, "pnpm-lock.yaml");
	await lockfile.focus();
	await page.keyboard.press("Enter");
	await expect(diffBlock(page, "pnpm-lock.yaml")).toBeVisible();
	await expect(menuButton(page)).toHaveText("9files hidden");
});

test("the hidden count does not depend on tree filtering", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ activations: { [DEMO_KEY]: true } }),
	);
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hidden");
	expect(await visibleTreeFiles(page)).toHaveLength(14);
	await menuButton(page).click();
	await menuItem(page, "Hide in sidebar tree").click();
	await expect(menuButton(page)).toHaveText("11files hidden");
	expect(await visibleTreeFiles(page)).toHaveLength(25);
	expect(await visibleDiffPaths(page)).toHaveLength(14);
});
