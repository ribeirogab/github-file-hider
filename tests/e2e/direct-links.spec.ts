import type { Page } from "@playwright/test";
import {
	expect,
	FIXTURE_URLS,
	openFixture,
	seedSettings,
	storedSettings,
	test,
} from "../support/extension";
import {
	announcement,
	diffBlock,
	diffId,
	menuButton,
	menuItem,
	visibleDiffPaths,
} from "../support/page";
import { DEMO_KEY, presetsOn } from "../support/settings";

const BUTTON_SPEC = "src/components/Button.spec.tsx";
const CHANGES = FIXTURE_URLS["pr1-changes"];

const notice = (page: Page) =>
	page.getByRole("region", { name: "Temporarily visible file" });

const label = (page: Page, path: string) =>
	diffBlock(page, path).locator(".fh-file-label");

const filtering = () => presetsOn({ activations: { [DEMO_KEY]: true } });

test("reveals a hidden file from a direct link and explains why", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, filtering());
	await openFixture(page, "pr1-changes", `${CHANGES}#${diffId(BUTTON_SPEC)}`);
	await expect(diffBlock(page, BUTTON_SPEC)).toBeVisible();
	await expect(notice(page)).toContainText(
		"This file is temporarily visible because you opened a direct link.",
	);
	await expect(notice(page)).toContainText(
		"It matches the Tests preset **/*.spec.*. Other matching files stay hidden.",
	);
	await expect(notice(page)).toBeInViewport();
	await expect(label(page, BUTTON_SPEC)).toHaveText("Temporarily visible");
	await expect(label(page, BUTTON_SPEC)).toHaveAttribute(
		"data-fh-tip",
		"Opened from a direct link. Your rules have not changed.",
	);
	await expect(diffBlock(page, BUTTON_SPEC)).toHaveClass(/fh-revealed/);
	await expect(announcement(page)).toHaveText(
		"This file is temporarily visible because you opened a direct link.",
	);
	await expect(menuButton(page)).toHaveText("10files hidden");
	expect(await visibleDiffPaths(page)).toHaveLength(15);
	expect(await storedSettings(extension)).toEqual(filtering());
	const next = await diffBlock(page, BUTTON_SPEC).evaluate(
		(block) => block.parentElement?.previousElementSibling?.className,
	);
	expect(next).toBe("fh-flash");
});

test("reveals the file of a line link and brings the line into view", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, filtering());
	await openFixture(
		page,
		"pr1-changes",
		`${CHANGES}#${diffId(BUTTON_SPEC)}R11`,
	);
	await expect(notice(page)).toBeVisible();
	const line = diffBlock(page, BUTTON_SPEC).locator("tr.fh-target-line");
	await expect(line).toHaveCount(1);
	await expect(line).toBeInViewport();
	await expect(line.locator('[data-line-number="11"]').first()).toBeVisible();
});

test("reveals the file of a review comment link and highlights the comment line", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, filtering());
	await openFixture(page, "pr1-changes", `${CHANGES}#r4168120910`);
	await expect(diffBlock(page, BUTTON_SPEC)).toBeVisible();
	await expect(notice(page)).toContainText(
		"The linked comment is highlighted. It matches the Tests preset **/*.spec.*. Other matching files stay hidden.",
	);
	await expect(
		diffBlock(page, BUTTON_SPEC).locator("tr.fh-target-line"),
	).toBeInViewport();
});

test("Hide again hides the file, clears the link, and returns focus", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, filtering());
	await openFixture(page, "pr1-changes", `${CHANGES}#${diffId(BUTTON_SPEC)}`);
	await notice(page).getByRole("button", { name: "Hide again" }).click();
	await expect(diffBlock(page, BUTTON_SPEC)).toBeHidden();
	await expect(notice(page)).toHaveCount(0);
	await expect(page).toHaveURL(CHANGES);
	await expect(menuButton(page)).toBeFocused();
	await expect(menuButton(page)).toHaveText("11files hidden");
	await expect(announcement(page)).toHaveText(
		`${BUTTON_SPEC} is hidden again.`,
	);
});

test("a reveal lasts until filtering is turned off", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, filtering());
	await openFixture(page, "pr1-changes", `${CHANGES}#${diffId(BUTTON_SPEC)}`);
	await expect(notice(page)).toBeVisible();
	await page.reload();
	await expect(notice(page)).toBeInViewport();
	await page.evaluate(() => window.scrollTo(0, 0));
	await menuButton(page).click();
	await menuItem(page, "Show all files").click();
	await expect(notice(page)).toHaveCount(0);
	await menuButton(page).click();
	await menuItem(page, "Hide files again").click();
	await expect(notice(page)).toBeVisible();
	await menuButton(page).click();
	await menuItem(page, "Hide files in this pull request").click();
	await menuItem(page, "Hide files in this pull request").click();
	await page.keyboard.press("Escape");
	await expect(menuButton(page)).toHaveText("11files hidden");
	await expect(diffBlock(page, BUTTON_SPEC)).toBeHidden();
	await expect(notice(page)).toHaveCount(0);
});

test("reveals a file when GitHub's navigation changes the URL to it", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, filtering());
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hidden");
	await page.evaluate(
		(hash) => history.replaceState(null, "", hash),
		`#${diffId(BUTTON_SPEC)}`,
	);
	await expect(diffBlock(page, BUTTON_SPEC)).toBeVisible();
	await expect(notice(page)).toBeVisible();
	await expect(menuButton(page)).toHaveText("10files hidden");
});

test("leaves links to visible files alone", async ({ page, extension }) => {
	await seedSettings(extension, filtering());
	await openFixture(
		page,
		"pr1-changes",
		`${CHANGES}#${diffId("src/payments/checkout.ts")}`,
	);
	await expect(menuButton(page)).toHaveText("11files hidden");
	await expect(notice(page)).toHaveCount(0);
	await expect(page.locator(".fh-file-label")).toHaveCount(0);
});
