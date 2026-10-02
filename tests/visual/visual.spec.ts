import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { launchExtension } from "../support/extension.ts";
import { capture } from "./capture.ts";
import { comparePng, sideBySide, writeResult } from "./compare.ts";
import { SCALE, SETTINGS_VIEWPORT, THEMES, VIEWPORT } from "./prototype.ts";
import { type Recorded, SCENES } from "./scenes.ts";
import { startServer } from "./server.ts";

const DIRECTORY = "tests/visual/baseline";

for (const scene of SCENES)
	for (const theme of THEMES)
		test(`${scene.name} in ${theme} matches the prototype pixel for pixel`, async () => {
			const recorded = JSON.parse(
				await readFile(`${DIRECTORY}/${scene.name}-${theme}.json`, "utf8"),
			) as Recorded;
			const expected = await readFile(
				`${DIRECTORY}/${scene.name}-${theme}.png`,
			);
			const { origin, server } = await startServer();
			const { context, close } = await launchExtension({
				colorScheme: theme,
				viewport: scene.surface === "settings" ? SETTINGS_VIEWPORT : VIEWPORT,
				deviceScaleFactor: SCALE,
				allow: (url) => url.startsWith(origin),
			});
			try {
				const page = context.pages()[0] ?? (await context.newPage());
				const clip =
					(await scene.extension(page, {
						origin,
						theme,
						recorded,
						browser: context,
					})) ?? recorded.clip;
				const actual = await capture(page, clip);
				const { result, diff } = comparePng(actual, expected);
				if (result.different > 0)
					await writeResult(`${scene.name}-${theme}`, {
						"expected.png": expected,
						"actual.png": actual,
						"diff.png": diff,
						"side-by-side.png": sideBySide(expected, actual),
					});
				expect(result.sizeMatches).toBe(true);
				expect(result.different).toBe(0);
			} finally {
				await close();
				server.close();
			}
		});
