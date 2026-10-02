import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const OUTLINE =
	"M13.75 2.75H6.5A1.75 1.75 0 0 0 4.75 4.5v15a1.75 1.75 0 0 0 1.75 1.75h11a1.75 1.75 0 0 0 1.75-1.75V8.25Z";

const svg = (size) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><mask id="a"><rect width="24" height="10" fill="#fff"/></mask><mask id="b"><rect y="15.5" width="24" height="8.5" fill="#fff"/></mask><g fill="none" stroke="#1f2328" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><g mask="url(#a)"><path d="${OUTLINE}"/><path d="M13.75 2.75v5.5h5.5"/></g><path mask="url(#b)" stroke-dasharray="2 2.25" d="${OUTLINE}"/></g><rect x="3" y="11" width="18" height="3.5" rx="1.25" fill="#0969da"/></svg>`;

await mkdir("src/icons", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [16, 32, 48, 128]) {
	await page.setViewportSize({ width: size, height: size });
	await page.setContent(
		`<style>html,body{margin:0;background:transparent}</style>${svg(size)}`,
	);
	await page.locator("svg").screenshot({
		path: `src/icons/${size}.png`,
		omitBackground: true,
	});
}
await browser.close();
