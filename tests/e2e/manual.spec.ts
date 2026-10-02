import { createHash } from "node:crypto";
import { expect, navigate, test } from "./fixtures";

async function enableTests(page: import("@playwright/test").Page) {
	await page
		.getByRole("button", { name: "GitHub File Hider settings", exact: true })
		.click();
	await expect(
		page.getByText("Choose what to hide", { exact: true }),
	).toBeVisible();
	await page.getByRole("menuitemcheckbox", { name: /^Tests/ }).click();
	await page.keyboard.press("Escape");
}
test("manual activation, reload, another pull request, and turn off", async ({
	page,
}) => {
	await navigate(page);
	await enableTests(page);
	const target = page.locator(
		`[id="diff-${createHash("sha256").update("src/components/Button.spec.tsx").digest("hex")}"]`,
	);
	await expect(target).toBeVisible();
	await page.getByRole("button", { name: /^Hide files ·/ }).click();
	await expect(target).toBeHidden();
	await expect(
		page.getByRole("treeitem", {
			name: "Button.spec.tsx has 1 comment",
			exact: true,
		}),
	).toBeHidden();
	await expect(
		page.locator('[role="treeitem"][id="src/payments/__tests__"]'),
	).toBeHidden();
	await expect(
		page.getByRole("button", { name: /files hidden/ }),
	).toBeVisible();
	await expect(page.getByRole("status").last()).toHaveText(/files hidden\./);
	await page.reload();
	await expect(target).toBeHidden();
	await navigate(page, "/1/changes/abc", "pr1-commit");
	await expect(
		page.getByRole("button", { name: /files hidden/ }),
	).toBeVisible();
	await navigate(page, "/1/changes/abc..def", "pr1-range");
	await expect(
		page.getByRole("button", { name: /files hidden/ }),
	).toBeVisible();
	await navigate(page, "/2/changes", "pr1-changes");
	await expect(target).toBeVisible();
	await navigate(page);
	await page.getByRole("button", { name: /files hidden/ }).click();
	await page
		.getByRole("menuitemcheckbox", {
			name: "Hide files in this pull request",
			exact: true,
		})
		.click();
	await page.keyboard.press("Escape");
	await expect(target).toBeVisible();
	await page.reload();
	await expect(target).toBeVisible();
});
test("presets are global and hiding preserves GitHub review data", async ({
	page,
	extension,
}) => {
	await navigate(page);
	const before = await page.locator('[role="region"][id^="diff-"]').count();
	const viewed = await page
		.locator('input[type="checkbox"]')
		.evaluateAll((inputs) =>
			inputs.map((input) => (input as HTMLInputElement).checked),
		);
	await enableTests(page);
	await page.getByRole("button", { name: /^Hide files ·/ }).click();
	await expect(
		page.locator(
			`[id="diff-${createHash("sha256").update("src/legacy/old-checkout.spec.ts").digest("hex")}"]`,
		),
	).toBeHidden();
	await expect(
		page.locator(
			`[id="diff-${createHash("sha256").update("src/utils/format-helpers.ts").digest("hex")}"]`,
		),
	).toBeVisible();
	await expect(page.locator('[role="region"][id^="diff-"]')).toHaveCount(
		before,
	);
	expect(
		await page
			.locator('input[type="checkbox"]')
			.evaluateAll((inputs) =>
				inputs.map((input) => (input as HTMLInputElement).checked),
			),
	).toEqual(viewed);
	await expect(
		page.getByText("0 of 25 files viewed", { exact: true }),
	).toHaveCount(1);
	const second = await extension.newPage();
	await navigate(second, "/2/changes", "pr1-changes");
	await second
		.getByRole("button", { name: "GitHub File Hider settings", exact: true })
		.click();
	await expect(
		second.getByRole("menuitemcheckbox", { name: /^Tests/ }),
	).toHaveAttribute("aria-checked", "true");
});
test("ActionMenu keyboard navigation and retained checkbox focus", async ({
	page,
}) => {
	await navigate(page);
	const caret = page.getByRole("button", {
		name: "GitHub File Hider settings",
		exact: true,
	});
	await caret.focus();
	await page.keyboard.press("ArrowDown");
	await expect(
		page.getByRole("menuitemcheckbox", {
			name: "Hide files in this pull request",
			exact: true,
		}),
	).toBeFocused();
	await page.keyboard.press("End");
	await expect(
		page.getByRole("menuitem", { name: "Settings", exact: true }),
	).toBeFocused();
	await page.keyboard.press("ArrowDown");
	await expect(
		page.getByRole("menuitemcheckbox", {
			name: "Hide files in this pull request",
			exact: true,
		}),
	).toBeFocused();
	await page.keyboard.press("t");
	await page.keyboard.press("Space");
	await expect(
		page.getByRole("menuitemcheckbox", { name: /^Tests/ }),
	).toBeFocused();
	await expect(
		page.getByRole("menuitemcheckbox", { name: /^Tests/ }),
	).toHaveAttribute("aria-checked", "true");
	await page.keyboard.press("Tab");
	await expect(caret).toBeFocused();
	await expect(page.getByRole("menu")).toBeHidden();
	await page.keyboard.press("ArrowUp");
	await expect(
		page.getByRole("menuitem", { name: "Settings", exact: true }),
	).toBeFocused();
});
