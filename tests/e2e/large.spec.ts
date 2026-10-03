import type { Page } from "@playwright/test";
import {
	expect,
	FIXTURE_URLS,
	fixtureHtml,
	openFixture,
	replaceDocument,
	seedSettings,
	test,
} from "../support/extension";
import {
	diffBlock,
	diffId,
	menuButton,
	treeEntry,
	visibleDiffPaths,
} from "../support/page";
import { presetsOn, settingsWith } from "../support/settings";

const tests = () => presetsOn({ mode: "automatic" });

const sql = () =>
	settingsWith({
		mode: "automatic",
		customRules: [{ id: "sql", pattern: "**/*.sql", enabled: true }],
	});

async function renderMoreDiffs(page: Page) {
	const html = await fixtureHtml("pr2-changes-scrolled");
	await page.evaluate((source) => {
		const next = new DOMParser().parseFromString(source, "text/html");
		const list = document.querySelector(
			'[data-testid="progressive-diffs-list"]',
		);
		const loaded = next.querySelector('[data-testid="progressive-diffs-list"]');
		if (!list || !loaded) throw new Error("No diff list");
		list.replaceChildren(
			...[...loaded.children].map((child) => document.adoptNode(child)),
		);
	}, html);
}

async function quietMutations(page: Page) {
	return page.evaluate(
		() =>
			new Promise<number>((done) => {
				let count = 0;
				const observer = new MutationObserver((records) => {
					count += records.length;
				});
				observer.observe(document.documentElement, {
					subtree: true,
					childList: true,
					attributes: true,
					characterData: true,
				});
				setTimeout(() => {
					observer.disconnect();
					done(count);
				}, 1000);
			}),
	);
}

test("filters 800 progressively rendered files from the complete tree", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, tests());
	await openFixture(page, "pr2-changes");
	await expect(menuButton(page)).toHaveText("400files hiddenAutomatic");
	const visible = await visibleDiffPaths(page);
	expect(visible.every((path) => path.endsWith("index.ts"))).toBe(true);
	await expect(
		treeEntry(page, "packages/pkg-001/src/index.test.ts"),
	).toBeHidden();
	await expect(treeEntry(page, "packages/pkg-001/src/index.ts")).toBeVisible();
});

test("filters diffs that GitHub renders later without a reload", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, tests());
	await openFixture(page, "pr2-changes");
	await expect(menuButton(page)).toHaveText("400files hiddenAutomatic");
	await renderMoreDiffs(page);
	await expect
		.poll(async () =>
			(await visibleDiffPaths(page)).some((path) => path.endsWith(".test.ts")),
		)
		.toBe(false);
	await expect(
		diffBlock(page, "packages/pkg-400/src/index.test.ts"),
	).toBeHidden();
	await expect(diffBlock(page, "packages/pkg-400/src/index.ts")).toBeVisible();
	await expect(menuButton(page)).toHaveText("400files hiddenAutomatic");
});

test("counts files that GitHub lists after the first render", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, presetsOn({ mode: "automatic" }));
	await openFixture(page, "pr1-changes");
	await expect(menuButton(page)).toHaveText("11files hiddenAutomatic");
	const id = diffId("pnpm-lock.yaml");
	await page.evaluate((anchor) => {
		const item = document.getElementById("pnpm-lock.yaml");
		const entry = document.getElementById(anchor)?.parentElement;
		const keep = window as unknown as { kept: HTMLElement[] };
		keep.kept = [item, entry].filter((node): node is HTMLElement => !!node);
		for (const node of keep.kept) node.remove();
	}, id);
	await expect(menuButton(page)).toHaveText("10files hiddenAutomatic");
	await page.evaluate(() => {
		const [item, entry] = (window as unknown as { kept: HTMLElement[] }).kept;
		const tree = document.querySelector('#pr-file-tree [role="tree"]');
		const list = document.querySelector(
			'[data-testid="progressive-diffs-list"]',
		);
		if (!item || !entry || !tree || !list) throw new Error("Missing nodes");
		const freshItem = item.cloneNode(true) as HTMLElement;
		const freshEntry = entry.cloneNode(true) as HTMLElement;
		for (const node of [freshItem, freshEntry])
			node.classList.remove("fh-hidden");
		tree.append(freshItem);
		list.append(freshEntry);
	});
	await expect(menuButton(page)).toHaveText("11files hiddenAutomatic");
	await expect(diffBlock(page, "pnpm-lock.yaml")).toBeHidden();
	await expect(treeEntry(page, "pnpm-lock.yaml")).toBeHidden();
});

test("keeps the state of diff blocks that GitHub removes and adds again", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, tests());
	await openFixture(page, "pr2-changes");
	await expect(menuButton(page)).toHaveText("400files hiddenAutomatic");
	await page.evaluate((anchor) => {
		const entry = document.getElementById(anchor)?.parentElement;
		const list = entry?.parentElement;
		if (!entry || !list) throw new Error("No entry");
		const next = entry.nextSibling;
		const fresh = entry.cloneNode(true) as HTMLElement;
		fresh.classList.remove("fh-hidden");
		entry.remove();
		list.insertBefore(fresh, next);
	}, diffId("packages/pkg-001/src/index.test.ts"));
	await expect(
		diffBlock(page, "packages/pkg-001/src/index.test.ts"),
	).toBeHidden();
	await expect(diffBlock(page, "packages/pkg-001/src/index.ts")).toBeVisible();
});

test("filters the view optimized for very large pull requests", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, tests());
	await openFixture(page, "pr3-optimized");
	await expect(menuButton(page)).toHaveText("30files hiddenAutomatic");
	await expect(treeEntry(page, "migrations/010/up.test.ts")).toBeHidden();
	await expect(diffBlock(page, "migrations/001/up.sql")).toBeVisible();
});

test("keeps the open file visible in single file mode", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, sql());
	await openFixture(page, "pr3-single-file");
	await expect(diffBlock(page, "migrations/001/up.sql")).toBeVisible();
	await expect(
		diffBlock(page, "migrations/001/up.sql").locator(".fh-file-label"),
	).toHaveText("Temporarily visible");
	await expect(menuButton(page)).toHaveText("299files hiddenAutomatic");
	await expect(treeEntry(page, "migrations/001/up.sql")).toBeVisible();
	await expect(treeEntry(page, "migrations/002/up.sql")).toBeHidden();
	await expect(treeEntry(page, "migrations/010/up.test.ts")).toBeVisible();

	await replaceDocument(
		page,
		"pr3-single-file-next",
		`${FIXTURE_URLS["pr3-single-file-next"]}#${diffId("migrations/002/up.sql")}`,
	);
	await expect(diffBlock(page, "migrations/002/up.sql")).toBeVisible();
	await expect(
		diffBlock(page, "migrations/002/up.sql").locator(".fh-file-label"),
	).toHaveText("Temporarily visible");
	await expect(treeEntry(page, "migrations/002/up.sql")).toBeVisible();
});

test("shows the open file of single file mode even without a link", async ({
	page,
	extension,
}) => {
	await seedSettings(extension, sql());
	await openFixture(page, "pr3-single-file");
	await page.evaluate(() =>
		history.replaceState(null, "", location.pathname + location.search),
	);
	await replaceDocument(
		page,
		"pr3-single-file",
		FIXTURE_URLS["pr3-single-file"],
	);
	await expect(diffBlock(page, "migrations/001/up.sql")).toBeVisible();
	await expect(
		diffBlock(page, "migrations/001/up.sql").locator(".fh-file-label"),
	).toHaveText("Temporarily visible");
});

test("the extension's own nodes do not cause extra filtering passes", async ({
	page,
	extension,
}) => {
	await seedSettings(
		extension,
		presetsOn({ mode: "automatic", treeFiltering: false }),
	);
	await openFixture(
		page,
		"pr1-changes",
		`${FIXTURE_URLS["pr1-changes"]}#${diffId("src/components/Button.spec.tsx")}`,
	);
	await expect(
		page.getByRole("region", { name: "Temporarily visible file" }),
	).toBeVisible();
	await page.waitForTimeout(500);
	expect(await quietMutations(page)).toBe(0);
	await openFixture(page, "pr2-changes");
	await expect(menuButton(page)).toHaveText("400files hiddenAutomatic");
	await page.waitForTimeout(500);
	expect(await quietMutations(page)).toBe(0);
});
