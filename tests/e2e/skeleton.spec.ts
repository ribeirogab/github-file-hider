import { expect, fixture, navigate, test } from "./fixtures";

for (const [path, name] of [
	["/1/changes", "pr1-changes"],
	["/1/changes/abc", "pr1-commit"],
	["/1/changes/abc..def", "pr1-range"],
]) {
	test(`control on ${path}`, async ({ page }) => {
		await navigate(page, path, name);
		await expect(
			page.getByRole("button", { name: "Hide files", exact: true }),
		).toBeVisible();
		await page.evaluate(() =>
			document.documentElement.style.setProperty(
				"--fgColor-muted",
				"rgb(100, 120, 140)",
			),
		);
		await expect(
			page.getByRole("button", { name: "Hide files", exact: true }),
		).toHaveCSS("color", "rgb(100, 120, 140)");
	});
}
test("classic and conversation pages stay unchanged", async ({ page }) => {
	for (const [path, name] of [
		["/1/files", "pr1-classic"],
		["/1", "pr1-conversation"],
	]) {
		await navigate(page, path, name);
		await expect(page.locator("#fh-control")).toHaveCount(0);
	}
});
test("navigation without a full page load", async ({ page }) => {
	await navigate(page, "/1", "pr1-conversation");
	const html = await fixture("pr1-changes");
	await page.evaluate((html) => {
		history.pushState(
			{},
			"",
			"/ribeirogab/github-file-hider-demo/pull/1/changes",
		);
		document.body.innerHTML = new DOMParser().parseFromString(
			html,
			"text/html",
		).body.innerHTML;
	}, html);
	await expect(
		page.getByRole("button", { name: "Hide files", exact: true }),
	).toBeVisible();
	await page.evaluate(() =>
		history.pushState({}, "", "/ribeirogab/github-file-hider-demo/pull/1"),
	);
	await expect(page.locator("#fh-control")).toHaveCount(0);
});
