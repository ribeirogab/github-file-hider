import { createHash } from "node:crypto";
import type { Locator, Page } from "@playwright/test";

export const control = (page: Page) =>
	page.locator("section[data-file-tree-expanded] .fh-ctl");

export const mainButton = (page: Page) => control(page).locator(".fh-ctl-main");

export const menuButton = (page: Page) => control(page).locator(".fh-ctl-menu");

export const menu = (page: Page) =>
	page.getByRole("menu", { name: "GitHub File Hider" });

export const menuItem = (page: Page, name: string | RegExp) =>
	menu(page).locator('[role^="menuitem"]').filter({ hasText: name });

export const diffId = (path: string) =>
	`diff-${createHash("sha256").update(path).digest("hex")}`;

export const diffBlock = (page: Page, path: string) =>
	page.locator(`[id="${diffId(path)}"]`);

export const treeEntry = (page: Page, path: string) =>
	page.locator(`[role="treeitem"][id="${path}"]`);

export async function visibleDiffPaths(page: Page) {
	const paths = await page.evaluate(() =>
		[
			...document.querySelectorAll<HTMLElement>(
				'#pr-file-tree [role="treeitem"]:not([aria-expanded])',
			),
		].map((item) => item.id),
	);
	const visible = await page.evaluate(
		(ids) =>
			ids.map((id) => document.getElementById(id)?.checkVisibility() ?? false),
		paths.map(diffId),
	);
	return paths.filter((_, index) => visible[index]);
}

export async function visibleTreeFiles(page: Page) {
	return page.evaluate(() =>
		[
			...document.querySelectorAll<HTMLElement>(
				'#pr-file-tree [role="treeitem"]:not([aria-expanded])',
			),
		]
			.filter((item) => item.checkVisibility())
			.map((item) => item.id),
	);
}

export const announcement = (page: Page): Locator =>
	page.locator('.fh-sr[role="status"]');
