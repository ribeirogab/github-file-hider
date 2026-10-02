import { createHash } from "node:crypto";
import { expect, navigate, test } from "./fixtures";

const path = "src/components/Button.spec.tsx";
const digest = createHash("sha256").update(path).digest("hex");
for (const suffix of ["", "R11", "L3"]) {
	test(`file direct link ${suffix || "file"} reveals only one matching file`, async ({
		page,
	}) => {
		await navigate(page);
		await page
			.getByRole("button", { name: "GitHub File Hider settings", exact: true })
			.click();
		await page.getByRole("menuitemcheckbox", { name: /^Tests/ }).click();
		await page.keyboard.press("Escape");
		await page.getByRole("button", { name: /^Hide files ·/ }).click();
		await navigate(page, `/1/changes#diff-${digest}${suffix}`);
		await expect(page.locator(`[id="diff-${digest}"]`)).toBeVisible();
		await expect(
			page.getByText("Temporarily visible", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "8 files hidden", exact: true }),
		).toBeVisible();
		const notice = page.getByRole("region", {
			name: `Temporarily visible: ${path}`,
			exact: true,
		});
		await expect(notice).toContainText("Tests preset (**/*.spec.*)");
		await expect(
			page.locator('[id="src/payments/checkout.spec.ts"]'),
		).toBeHidden();
		await page.reload();
		await expect(notice).toBeVisible();
		await page.evaluate(() => {
			location.hash = "";
		});
		await expect(notice).toBeVisible();
		await notice.getByRole("button", { name: "Hide again" }).click();
		await expect(page.locator(`[id="diff-${digest}"]`)).toBeHidden();
		await expect(
			page.getByRole("button", { name: "9 files hidden", exact: true }),
		).toBeFocused();
		await expect(page.getByRole("status").last()).toHaveText(
			`${path} is hidden again.`,
		);
		expect(new URL(page.url()).hash).toBe("");
	});
}
test("review comment JSON identifies its hidden file and line", async ({
	page,
}) => {
	await navigate(page);
	await page
		.getByRole("button", { name: "GitHub File Hider settings", exact: true })
		.click();
	await page.getByRole("menuitemcheckbox", { name: /^Tests/ }).click();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: /^Hide files ·/ }).click();
	await page.evaluate(() => {
		history.pushState({}, "", "#r4168120910");
	});
	await expect(
		page.getByRole("region", {
			name: `Temporarily visible: ${path}`,
			exact: true,
		}),
	).toBeVisible();
	await expect(page.locator(`[id="diff-${digest}"]`)).toBeVisible();
	await expect(
		page.getByRole("button", { name: "8 files hidden", exact: true }),
	).toBeVisible();
});
test("reveals last through navigation to another file and end when filtering turns off", async ({
	page,
}) => {
	await navigate(page);
	await page
		.getByRole("button", { name: "GitHub File Hider settings", exact: true })
		.click();
	await page.getByRole("menuitemcheckbox", { name: /^Tests/ }).click();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: /^Hide files ·/ }).click();
	await page.evaluate((hash) => {
		location.hash = hash;
	}, `diff-${digest}`);
	await expect(
		page.getByText("Temporarily visible", { exact: true }),
	).toBeVisible();
	const secondDigest = createHash("sha256")
		.update("src/payments/checkout.spec.ts")
		.digest("hex");
	await page.evaluate((hash) => {
		history.pushState({}, "", `#${hash}`);
	}, `diff-${secondDigest}`);
	await expect(page.locator(".fh-file-label:visible")).toHaveCount(2);
	await expect(
		page.getByRole("button", { name: "7 files hidden", exact: true }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "7 files hidden", exact: true })
		.click();
	await page
		.getByRole("menuitemcheckbox", {
			name: "Hide files in this pull request",
			exact: true,
		})
		.click();
	await expect(page.locator(".fh-notice")).toHaveCount(0);
	await expect(page.locator(".fh-file-label")).toHaveCount(0);
});
for (const targetPath of [
	"src/utils/format-helpers.ts",
	"src/legacy/old-checkout.spec.ts",
	"docs/release notes.md",
]) {
	test(`direct link uses the current path for ${targetPath}`, async ({
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
		const input = settings.getByRole("textbox", {
			name: "Add custom rule",
			exact: true,
		});
		await input.fill("**");
		await input.press("Enter");
		await expect(
			page.getByRole("menuitem", { name: /Custom rules · 1 on/ }),
		).toBeVisible();
		await page.keyboard.press("Escape");
		await page.getByRole("button", { name: /^Hide files ·/ }).click();
		const targetDigest = createHash("sha256").update(targetPath).digest("hex");
		await navigate(page, `/1/changes#diff-${targetDigest}`);
		await expect(
			page.getByRole("region", {
				name: `Temporarily visible: ${targetPath}`,
				exact: true,
			}),
		).toBeVisible();
		await expect(page.locator(`[id="diff-${targetDigest}"]`)).toBeVisible();
		await expect(
			page.getByRole("button", { name: "24 files hidden", exact: true }),
		).toBeVisible();
	});
}
