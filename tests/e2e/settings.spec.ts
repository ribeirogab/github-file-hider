import { expect, navigate, test } from "./fixtures";

test("menu opens Settings, edits presets, validates, restores, and updates an open tab", async ({
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
	await expect(
		settings.getByRole("heading", { name: "General", exact: true }),
	).toBeVisible();
	await expect(
		settings.getByText("GitHub File Hider is not affiliated with GitHub.", {
			exact: true,
		}),
	).toBeVisible();
	await expect(
		settings.getByText(
			"Settings apply to every repository and are stored only in this browser.",
			{ exact: true },
		),
	).toBeVisible();
	const tests = settings.getByRole("region", { name: "Tests", exact: true });
	await tests.getByRole("button", { name: "Tests", exact: true }).click();
	await expect(
		page.getByRole("menuitemcheckbox", { name: /^Tests/ }),
	).toHaveAttribute("aria-checked", "true");
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: /^Hide files ·/ }).click();
	const input = tests.getByRole("textbox", { name: "Add Tests rule" });
	for (const [pattern, error] of [
		["", "Enter a path or pattern."],
		["/bad", "Remove the leading"],
		["a\\b", "Use forward slashes"],
		["***", "Use * or **"],
		["**/*.spec.*", "already in the list"],
	] as const) {
		await input.fill(pattern);
		await input.press("Enter");
		await expect(tests.getByText(error, { exact: false })).toBeVisible();
		await expect(input).toHaveAttribute("aria-invalid", "true");
	}
	await input.fill("docs/");
	await input.press("Enter");
	await expect(tests.getByText("Modified", { exact: true })).toBeVisible();
	await expect(input).toBeFocused();
	await expect(page.locator('[id="docs/payments.md"]')).toBeHidden();
	await tests
		.getByRole("button", { name: "Edit rule docs/", exact: true })
		.click();
	const edit = tests.getByRole("textbox", { name: "Pattern", exact: true });
	await edit.fill("README.md");
	await edit.press("Escape");
	await expect(
		tests.getByRole("button", { name: "Edit rule docs/", exact: true }),
	).toBeFocused();
	await tests
		.getByRole("button", { name: "Edit rule docs/", exact: true })
		.click();
	await edit.fill("README.md");
	await edit.press("Enter");
	await expect(page.locator('[id="docs/payments.md"]')).toBeVisible();
	await tests
		.getByRole("button", { name: "Remove rule README.md", exact: true })
		.click();
	await expect(tests.getByText("Modified", { exact: true })).toHaveCount(0);
	await input.fill("docs/");
	await input.press("Enter");
	await tests.getByRole("button", { name: "Restore defaults" }).click();
	await expect(tests.getByText("Modified", { exact: true })).toHaveCount(0);
	await expect(
		tests.getByRole("button", { name: "Restore defaults" }),
	).toBeDisabled();
});
test("extension action opens Settings without a popup or installation page", async ({
	page,
	extension,
}) => {
	await navigate(page);
	expect(
		extension.pages().filter((p) => p.url().startsWith("chrome-extension://")),
	).toHaveLength(0);
	const worker =
		extension.serviceWorkers()[0] ??
		(await extension.waitForEvent("serviceworker"));
	const id = new URL(worker.url()).host;
	const browser = extension.browser();
	if (!browser)
		throw new Error("A browser is required for the extension action test.");
	const cdp = await browser.newBrowserCDPSession();
	const { targetInfos } = await cdp.send("Target.getTargets", {
		filter: [{ type: "tab", exclude: false }],
	});
	const target = targetInfos.find((target) => target.url === page.url());
	if (!target) throw new Error("The test tab target was not found.");
	const opened = extension.waitForEvent("page");
	await cdp.send("Extensions.triggerAction", { id, targetId: target.targetId });
	const settings = await opened;
	await expect(
		settings.getByRole("heading", { name: "General", exact: true }),
	).toBeVisible();
});
