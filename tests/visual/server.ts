import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { build } from "esbuild";

const ROOT = resolve(".");

const TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json",
	".woff2": "font/woff2",
	".png": "image/png",
	".svg": "image/svg+xml",
};

async function bundle(entry: string) {
	const result = await build({
		entryPoints: [entry],
		bundle: true,
		format: "iife",
		target: "chrome120",
		write: false,
		logLevel: "silent",
	});
	return result.outputFiles[0]?.text ?? "";
}

async function respond(pathname: string): Promise<[string, string | Buffer]> {
	if (pathname.endsWith(".bundle.js")) {
		const entry = join(ROOT, pathname.replace(/\.bundle\.js$/, ".ts"));
		return [TYPES[".js"] ?? "", await bundle(entry)];
	}
	const file = normalize(join(ROOT, decodeURIComponent(pathname)));
	if (!file.startsWith(ROOT)) throw new Error("Outside root");
	const content = await readFile(file);
	if (pathname === "/dist/content.css")
		return [
			TYPES[".css"] ?? "",
			content
				.toString()
				.replaceAll(
					"chrome-extension://__MSG_@@extension_id__/fonts/",
					"/src/fonts/",
				),
		];
	return [TYPES[extname(file)] ?? "application/octet-stream", content];
}

export async function startServer(): Promise<{
	origin: string;
	server: Server;
}> {
	const server = createServer(async (request, response) => {
		try {
			const { pathname } = new URL(request.url ?? "/", "http://localhost");
			const [type, body] = await respond(pathname);
			response.writeHead(200, {
				"content-type": type,
				"cache-control": "no-store",
			});
			response.end(body);
		} catch {
			response.writeHead(404);
			response.end();
		}
	});
	await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
	const address = server.address();
	const port = typeof address === "object" && address ? address.port : 0;
	return { origin: `http://127.0.0.1:${port}`, server };
}

export const MONA_SANS_CSS = (origin: string) =>
	[
		[
			"vietnamese",
			"U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB",
		],
		[
			"latin-ext",
			"U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
		],
		[
			"latin",
			"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
		],
	]
		.map(
			([subset, range]) =>
				`@font-face { font-family: 'Mona Sans'; font-style: normal; font-weight: 200 900; font-stretch: 75% 125%; font-display: swap; src: url(${origin}/src/fonts/mona-sans-${subset}.woff2) format('woff2'); unicode-range: ${range}; }`,
		)
		.join("\n");
