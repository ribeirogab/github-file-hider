import {
	expect,
	openFixture,
	replaceDocument,
	test,
} from "../support/extension";

const control = (page: import("@playwright/test").Page) =>
	page.locator("section[data-file-tree-expanded] .fh-ctl");

test("shows the Hide files control in the toolbar of the Files changed page", async ({
	page,
}) => {
	await openFixture(page, "pr1-changes");
	await expect(control(page)).toHaveCount(1);
	await expect(control(page).getByRole("button")).toContainText("Hide files");
});

test("shows the control on the single-commit and commit-range views", async ({
	page,
}) => {
	await openFixture(page, "pr1-commit");
	await expect(control(page)).toContainText("Hide files");
	await openFixture(page, "pr1-range");
	await expect(control(page)).toContainText("Hide files");
});

test("follows GitHub's theme through its CSS custom properties", async ({
	page,
}) => {
	await openFixture(page, "pr1-changes");
	const button = control(page).locator(".fh-ctl-menu");
	await expect(button).toHaveCSS("color", "rgb(145, 152, 161)");
	await page.evaluate(() =>
		document.documentElement.setAttribute("data-color-mode", "light"),
	);
	await expect(button).toHaveCSS("color", "rgb(89, 99, 110)");
	await page.evaluate(() =>
		document.documentElement.style.setProperty("--fgColor-muted", "#123456"),
	);
	await expect(button).toHaveCSS("color", "rgb(18, 52, 86)");
});

test("loads its font from the extension under GitHub's content security policy", async ({
	page,
}) => {
	await openFixture(page, "pr1-changes");
	await expect(control(page)).toHaveCount(1);
	const loaded = await page.evaluate(async () => {
		await document.fonts.load('500 12px "FH Mona Sans"');
		return [...document.fonts].some(
			(face) =>
				face.family.replaceAll('"', "") === "FH Mona Sans" &&
				face.status === "loaded",
		);
	});
	expect(loaded).toBe(true);
});

test("appears and goes away when GitHub navigates without a full page load", async ({
	page,
}) => {
	await openFixture(page, "pr1-conversation");
	await expect(page.locator(".fh-ctl")).toHaveCount(0);
	await replaceDocument(page, "pr1-changes");
	await expect(control(page)).toHaveCount(1);
	await replaceDocument(page, "pr1-conversation");
	await expect(page.locator(".fh-ctl")).toHaveCount(0);
});

test("injects nothing on the classic Files changed page or other pages", async ({
	page,
}) => {
	for (const name of ["pr1-classic", "pr1-conversation"] as const) {
		await openFixture(page, name);
		await page.waitForTimeout(300);
		await expect(page.locator('[class^="fh-"], [class*=" fh-"]')).toHaveCount(
			0,
		);
	}
});
