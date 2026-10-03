import type { Page } from "@playwright/test";
import type { Rect } from "./harness.ts";

export async function settle(page: Page) {
	await page.evaluate(
		() =>
			new Promise((done) =>
				requestAnimationFrame(() => requestAnimationFrame(done)),
			),
	);
}

async function rasterAgain(page: Page) {
	const viewport = page.viewportSize();
	if (!viewport) return;
	const session = await page.context().newCDPSession(page);
	for (const deviceScaleFactor of [1, 2]) {
		await session.send("Emulation.setDeviceMetricsOverride", {
			width: viewport.width,
			height: viewport.height,
			deviceScaleFactor,
			mobile: false,
		});
		await settle(page);
	}
	await session.detach();
}

export async function capture(page: Page, clip: Rect) {
	await rasterAgain(page);
	return page.screenshot({ clip, animations: "disabled", caret: "hide" });
}

export async function monospaceAreas(page: Page, clip: Rect): Promise<Rect[]> {
	const margin = 1;
	const boxes = await page.evaluate(() => {
		const isMonospace = (element: Element | null) =>
			element !== null &&
			getComputedStyle(element).fontFamily.startsWith("ui-monospace");
		const contentBox = (element: Element) => {
			const rect = element.getBoundingClientRect();
			const style = getComputedStyle(element);
			const left =
				Number.parseFloat(style.borderLeftWidth) +
				Number.parseFloat(style.paddingLeft);
			const right =
				Number.parseFloat(style.borderRightWidth) +
				Number.parseFloat(style.paddingRight);
			return new DOMRect(
				rect.x + left,
				rect.y,
				rect.width - left - right,
				rect.height,
			);
		};
		const textBoxes = (element: Element) => {
			const range = document.createRange();
			range.selectNodeContents(element);
			return [...range.getClientRects()];
		};
		const boxesOf = (element: Element) => {
			if (element instanceof HTMLInputElement) return [contentBox(element)];
			if (getComputedStyle(element).display.startsWith("inline"))
				return [element.getBoundingClientRect()];
			return textBoxes(element);
		};
		return [...document.querySelectorAll("body *")]
			.filter(
				(element) =>
					isMonospace(element) && !isMonospace(element.parentElement),
			)
			.flatMap(boxesOf)
			.filter((box) => box.width > 0 && box.height > 0)
			.map((box) => ({
				x: box.x,
				y: box.y,
				width: box.width,
				height: box.height,
			}));
	});
	const scale = await page.evaluate(() => devicePixelRatio);
	return boxes.map((box) => ({
		x: Math.floor((box.x - margin - clip.x) * scale),
		y: Math.floor((box.y - margin - clip.y) * scale),
		width: Math.ceil((box.width + margin * 2) * scale),
		height: Math.ceil((box.height + margin * 2) * scale),
	}));
}
