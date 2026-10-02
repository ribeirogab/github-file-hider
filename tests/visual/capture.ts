import type { Page } from "@playwright/test";
import type { Rect } from "./harness.ts";

async function settle(page: Page) {
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
