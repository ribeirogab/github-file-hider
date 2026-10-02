import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { buildExtension } from "./build.mjs";

function fetchTags() {
	try {
		execFileSync("git", ["fetch", "--quiet", "--tags", "origin"], {
			stdio: "ignore",
		});
	} catch {
		process.stderr.write(
			"Could not fetch tags from origin. Using the local tags.\n",
		);
	}
}

if (!process.argv.includes("--no-fetch")) fetchTags();
const manifest = await buildExtension();
const archive = resolve(`github-file-hider-${manifest.version_name}.zip`);
await rm(archive, { force: true });
execFileSync("zip", ["-q", "-r", "-X", archive, "."], { cwd: resolve("dist") });
process.stdout.write(`${archive}\n`);
