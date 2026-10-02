import { expect, navigate, test } from "./fixtures";

test("automatic mode filters every pull request and preserves manual activations", async ({
	page,
	extension,
}) => {
	await navigate(page);
	await page
		.getByRole("button", { name: "GitHub File Hider settings", exact: true })
		.click();
	await page.getByRole("menuitemcheckbox", { name: /^Tests/ }).click();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: /^Hide files ·/ }).click();
	await page.getByRole("button", { name: /files hidden/ }).click();
	const opened = extension.waitForEvent("page");
	await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
	const settings = await opened;
	await expect(
		settings.getByRole("radio", { name: "Manual", exact: true }),
	).toBeChecked();
	await navigate(page, "/2/changes", "pr1-changes");
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeVisible();
	await settings.getByRole("radio", { name: "Automatic", exact: true }).check();
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeHidden();
	await expect(
		page.locator("#fh-control").getByText("Automatic", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: /files hidden/ }).click();
	await expect(
		page.getByRole("menuitemcheckbox", {
			name: "Hide files in this pull request",
			exact: true,
		}),
	).toHaveCount(0);
	await page
		.getByRole("menuitem", { name: "Show all files", exact: true })
		.click();
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeVisible();
	await page.reload();
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeHidden();
	await settings.getByRole("radio", { name: "Manual", exact: true }).check();
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeVisible();
	await navigate(page);
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeHidden();
});
test("automatic empty state explains activation without enabled rules", async ({
	page,
	extension,
}) => {
	await navigate(page);
	await page
		.getByRole("button", { name: "GitHub File Hider settings", exact: true })
		.click();
	const opened = extension.waitForEvent("page");
	await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
	const settings = await opened;
	await settings.getByRole("radio", { name: "Automatic", exact: true }).check();
	await expect(
		page.getByText(
			"Automatic mode hides matching files when Files changed opens.",
			{ exact: false },
		),
	).toBeVisible();
	await expect(
		page.getByRole("menuitemcheckbox", {
			name: "Hide files in this pull request",
			exact: true,
		}),
	).toHaveCount(0);
});
