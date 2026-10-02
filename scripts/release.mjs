import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, rename } from "node:fs/promises";
import { resolve } from "node:path";

execFileSync("git", ["fetch", "origin", "--tags"], { stdio: "inherit" });
await import("./build.mjs");
const { manifest } = await import("./build.mjs");
const name = `github-file-hider-${manifest.version_name}.zip`;
const directory = await mkdtemp(resolve("tmp/release-"));
const archive = resolve(directory, name);
execFileSync("zip", ["-q", "-r", archive, ...(await readdir("dist"))], {
	cwd: resolve("dist"),
});
await rename(archive, resolve(name));
process.stdout.write(`${name}\n`);
