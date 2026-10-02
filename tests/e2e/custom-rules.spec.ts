import { expect, navigate, test } from "./fixtures";

test("demo configuration hides eleven of twenty-five files and Always show keeps checkout visible", async ({
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
	await settings
		.getByRole("region", { name: "Tests", exact: true })
		.getByRole("button", { name: "Tests", exact: true })
		.click();
	await settings
		.getByRole("region", { name: "Lockfiles", exact: true })
		.getByRole("button", { name: "Lockfiles", exact: true })
		.click();
	const custom = settings.getByRole("region", {
		name: "Hide rules",
		exact: true,
	});
	const always = settings.getByRole("region", {
		name: "Always show rules",
		exact: true,
	});
	await custom
		.getByRole("textbox", { name: "Add custom rule" })
		.fill("**/generated/**");
	await custom.getByRole("textbox").press("Enter");
	await always
		.getByRole("textbox", { name: "Add Always show rule" })
		.fill("src/payments/checkout.spec.ts");
	await always.getByRole("textbox").press("Enter");
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: /^Hide files ·/ }).click();
	await expect(
		page.getByRole("button", { name: "11 files hidden", exact: true }),
	).toBeVisible();
	await expect(
		page.locator('[id="src/payments/checkout.spec.ts"]'),
	).toBeVisible();
	await expect(page.getByText("Always shown", { exact: true })).toBeVisible();
	await expect(
		page.locator('[id="src/legacy/old-checkout.spec.ts"]'),
	).toBeHidden();
	await expect(
		page.locator('[id="src/utils/format-helpers.ts"]'),
	).toBeVisible();
	await page
		.getByRole("button", { name: "11 files hidden", exact: true })
		.click();
	await expect(
		page.getByRole("menuitem", { name: /Custom rules · 1 on · 1 files/ }),
	).toBeVisible();
	await custom
		.getByRole("button", {
			name: "Turn rule on or off **/generated/**",
			exact: true,
		})
		.click();
	await expect(
		page.getByRole("menuitem", { name: /Custom rules · 1 rule, all off/ }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "10 files hidden", exact: true }),
	).toBeVisible();
	await expect(always.locator("[aria-pressed]")).toHaveCount(0);
	await always
		.getByRole("button", {
			name: "Edit rule src/payments/checkout.spec.ts",
			exact: true,
		})
		.click();
	await always
		.getByRole("textbox", { name: "Pattern", exact: true })
		.fill("src/components/Button.spec.tsx");
	await always
		.getByRole("textbox", { name: "Pattern", exact: true })
		.press("Enter");
	await expect(
		page.locator('[id="src/components/Button.spec.tsx"]'),
	).toBeVisible();
	await always
		.getByRole("button", {
			name: "Remove rule src/components/Button.spec.tsx",
			exact: true,
		})
		.click();
	await expect(page.getByText("Always shown", { exact: true })).toBeHidden();
	await expect(
		page.getByRole("button", { name: "11 files hidden", exact: true }),
	).toBeVisible();
	await custom
		.getByRole("button", { name: "Edit rule **/generated/**", exact: true })
		.click();
	await custom
		.getByRole("textbox", { name: "Pattern", exact: true })
		.fill("docs/");
	await custom
		.getByRole("textbox", { name: "Pattern", exact: true })
		.press("Enter");
	await custom
		.getByRole("button", { name: "Remove rule docs/", exact: true })
		.click();
	await expect(
		custom.getByRole("heading", { name: "No custom rules yet", exact: true }),
	).toBeVisible();
	const help = settings
		.locator("#custom-rules")
		.getByText("Pattern syntax", { exact: true });
	await help.click();
	await expect(
		settings
			.locator("#custom-rules")
			.getByText("The same as docs/**", { exact: true }),
	).toBeVisible();
});
