import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("dist", { recursive: true });
await build({
	entryPoints: ["src/content.ts", "src/background.ts"],
	outdir: "dist",
	bundle: true,
	format: "iife",
	target: "chrome120",
	legalComments: "none",
});
for (const file of ["content.css", "settings.html"])
	await copyFile(`src/${file}`, `dist/${file}`);
await writeFile(
	"dist/manifest.json",
	JSON.stringify(
		{
			manifest_version: 3,
			name: "GitHub File Hider",
			description: "Hide files in GitHub's Files changed tab.",
			version: "2026.10.2.1",
			version_name: "2026.10.02.1",
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
		},
		null,
		2,
	),
);
