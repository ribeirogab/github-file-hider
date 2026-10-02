import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const OUT = "dist";

const STYLES = {
	"content.css": [
		"fonts-github",
		"theme-github",
		"in-page-context",
		"components",
		"in-page",
	],
};

function tags() {
	try {
		return execFileSync("git", ["tag", "-l", "v*"], { encoding: "utf8" })
			.split("\n")
			.filter(Boolean);
	} catch {
		return [];
	}
}

async function version() {
	const pinned = process.env.FH_VERSION_NAME;
	if (pinned)
		return {
			versionName: pinned,
			version: pinned.split(".").map(Number).join("."),
		};
	const { releaseVersion } = await import("../src/release-version.ts");
	return releaseVersion(new Date(), tags());
}

export async function manifestFor({ version, versionName }) {
	return {
		manifest_version: 3,
		name: "GitHub File Hider",
		description: "Hide files in GitHub's Files changed tab.",
		version,
		version_name: versionName,
		icons: {
			16: "icons/16.png",
			32: "icons/32.png",
			48: "icons/48.png",
			128: "icons/128.png",
		},
		permissions: ["storage"],
		host_permissions: ["https://github.com/*"],
		background: { service_worker: "background.js" },
		action: {
			default_title: "GitHub File Hider settings",
			default_icon: { 16: "icons/16.png", 32: "icons/32.png" },
		},
		content_scripts: [
			{
				matches: ["https://github.com/*"],
				js: ["content.js"],
				css: ["content.css"],
				run_at: "document_idle",
			},
		],
		web_accessible_resources: [
			{ resources: ["fonts/*.woff2"], matches: ["https://github.com/*"] },
		],
	};
}

async function styles() {
	for (const [file, parts] of Object.entries(STYLES)) {
		const sources = await Promise.all(
			parts.map((part) => readFile(`src/styles/${part}.css`, "utf8")),
		);
		await writeFile(`${OUT}/${file}`, sources.join("\n"));
	}
}

export async function buildExtension() {
	await rm(OUT, { recursive: true, force: true });
	await mkdir(OUT, { recursive: true });
	await build({
		entryPoints: ["src/content.ts", "src/background.ts"],
		outdir: OUT,
		bundle: true,
		format: "iife",
		target: "chrome120",
		legalComments: "none",
		logLevel: "warning",
	});
	await styles();
	await cp("src/fonts", `${OUT}/fonts`, { recursive: true });
	await cp("src/icons", `${OUT}/icons`, { recursive: true });
	const manifest = await manifestFor(await version());
	await writeFile(
		`${OUT}/manifest.json`,
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
	return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) await buildExtension();
