import { mkdir, writeFile } from "node:fs/promises";
import { chromium, test } from "@playwright/test";
import { RENDERING_ARGS } from "../support/extension.ts";
import { capture } from "./capture.ts";
import { SCALE, SETTINGS_VIEWPORT, THEMES, VIEWPORT } from "./prototype.ts";
import { SCENES } from "./scenes.ts";
import { startServer } from "./server.ts";

const DIRECTORY = "tests/visual/baseline";

for (const scene of SCENES)
	for (const theme of THEMES)
		test(`captures ${scene.name} in ${theme} from the prototype`, async () => {
			const { origin, server } = await startServer();
			const browser = await chromium.launch({
				channel: "chromium",
				args: RENDERING_ARGS,
			});
			const page = await browser.newPage({
				viewport: scene.surface === "settings" ? SETTINGS_VIEWPORT : VIEWPORT,
				deviceScaleFactor: SCALE,
				colorScheme: theme,
			});
			try {
				const recorded = await scene.prototype(page, { origin, theme });
				const image = await capture(page, recorded.clip);
				await mkdir(DIRECTORY, { recursive: true });
				await writeFile(`${DIRECTORY}/${scene.name}-${theme}.png`, image);
				await writeFile(
					`${DIRECTORY}/${scene.name}-${theme}.json`,
					`${JSON.stringify(recorded, null, "\t")}\n`,
				);
			} finally {
				await browser.close();
				server.close();
			}
		});
