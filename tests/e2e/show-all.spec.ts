import { expect, navigate, test } from "./fixtures";

test("show all lasts until reload or leaving the pull request", async ({
	page,
}) => {
	await navigate(page);
	await page
		.getByRole("button", { name: "GitHub File Hider settings", exact: true })
		.click();
	await page.getByRole("menuitemcheckbox", { name: /^Tests/ }).click();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: /^Hide files ·/ }).click();
	await page.getByRole("button", { name: /files hidden/ }).click();
	await page
		.getByRole("menuitem", { name: "Show all files", exact: true })
		.click();
	await expect(
		page.getByRole("button", { name: /^Hide files again ·/ }),
	).toBeVisible();
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeVisible();
	await expect(page.getByRole("status").last()).toHaveText(
		/Showing all files\./,
	);
	await page.getByRole("button", { name: /^Hide files again ·/ }).click();
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeHidden();
	await page.getByRole("button", { name: /files hidden/ }).click();
	await page
		.getByRole("menuitem", { name: "Show all files", exact: true })
		.click();
	await page.reload();
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeHidden();
	await page.getByRole("button", { name: /files hidden/ }).click();
	await page
		.getByRole("menuitem", { name: "Show all files", exact: true })
		.click();
	await page.evaluate(() =>
		history.pushState({}, "", "/ribeirogab/github-file-hider-demo/pull/1"),
	);
	await expect(page.locator("#fh-control")).toHaveCount(0);
	await page.evaluate(() =>
		history.pushState(
			{},
			"",
			"/ribeirogab/github-file-hider-demo/pull/1/changes",
		),
	);
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeHidden();
});
test("all-hidden diff and tree explain the state and provide a way out", async ({
	page,
}) => {
	await navigate(page, "/1/changes/abc", "pr1-commit");
	await page
		.getByRole("button", { name: "GitHub File Hider settings", exact: true })
		.click();
	await page.getByRole("menuitemcheckbox", { name: /^Tests/ }).click();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: /^Hide files ·/ }).click();
	const empty = page.locator(".fh-empty");
	await expect(
		empty.getByRole("heading", { name: "All files are hidden", exact: true }),
	).toBeVisible();
	await expect(page.locator(".fh-tree-empty")).toBeVisible();
	await expect(empty.getByRole("button", { name: "Edit rules" })).toBeVisible();
	await empty.getByRole("button", { name: "Show all files" }).click();
	await expect(empty).toBeHidden();
	await expect(page.locator(".fh-tree-empty")).toBeHidden();
	await expect(
		page.getByRole("button", { name: /^Hide files again ·/ }),
	).toBeVisible();
});
