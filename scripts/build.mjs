import { execFileSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { releaseVersion } from "../src/release-version.ts";

const tags = execFileSync("git", ["tag", "-l", "v*"], { encoding: "utf8" })
	.trim()
	.split("\n");
const release = releaseVersion(new Date(), tags);
await mkdir("dist", { recursive: true });
await build({
	entryPoints: ["src/content.ts", "src/background.ts"],
	outdir: "dist",
	bundle: true,
	format: "iife",
	target: "chrome120",
	legalComments: "none",
	minify: true,
});
for (const file of ["content.css", "settings.html"])
	await copyFile(`src/${file}`, `dist/${file}`);
export const manifest = {
	manifest_version: 3,
	name: "GitHub File Hider",
	description: "Hide files in GitHub's Files changed tab.",
	version: release.version,
	version_name: release.versionName,
	permissions: ["storage"],
	host_permissions: ["https://github.com/*"],
	background: { service_worker: "background.js" },
	action: { default_title: "GitHub File Hider settings" },
	options_ui: { page: "settings.html", open_in_tab: true },
	content_scripts: [
		{
			matches: ["https://github.com/*"],
			js: ["content.js"],
			css: ["content.css"],
			run_at: "document_idle",
		},
	],
};
await writeFile("dist/manifest.json", JSON.stringify(manifest, null, 2));
