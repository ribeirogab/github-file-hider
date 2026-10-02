import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, test } from "@playwright/test";
import { openFixture, RENDERING_ARGS } from "../support/extension";
import { control } from "../support/page";

test("the release ZIP loads as an unpacked extension", async () => {
	const output = execFileSync("node", ["scripts/release.mjs", "--no-fetch"], {
		encoding: "utf8",
		env: { ...process.env, FH_VERSION_NAME: "2026.10.02.1" },
	}).trim();
	expect(output).toMatch(/github-file-hider-2026\.10\.02\.1\.zip$/);
	const directory = await mkdtemp(join(tmpdir(), "github-file-hider-zip-"));
	const profile = await mkdtemp(join(tmpdir(), "github-file-hider-profile-"));
	try {
		execFileSync("unzip", ["-q", output, "-d", directory]);
		const manifest = JSON.parse(
			await readFile(join(directory, "manifest.json"), "utf8"),
		);
		expect(manifest).toMatchObject({
			manifest_version: 3,
			version: "2026.10.2.1",
			version_name: "2026.10.02.1",
			permissions: ["storage"],
			host_permissions: ["https://github.com/*"],
		});
		const context = await chromium.launchPersistentContext(profile, {
			channel: "chromium",
			headless: true,
			args: [
				...RENDERING_ARGS,
				`--disable-extensions-except=${directory}`,
				`--load-extension=${directory}`,
			],
		});
		await context.route("**/*", (route) =>
			route.request().url().startsWith("chrome-extension://")
				? route.continue()
				: route.abort(),
		);
		const page = context.pages()[0] ?? (await context.newPage());
		await openFixture(page, "pr1-changes");
		await expect(control(page)).toContainText("Hide files");
		await context.close();
	} finally {
		await rm(output, { force: true });
		await rm(directory, { recursive: true, force: true });
		await rm(profile, { recursive: true, force: true });
	}
});
