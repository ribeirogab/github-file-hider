export function pullRequestKey(url: URL): string | null {
	const route =
		/^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/changes(?:\/[^/]+)?\/?$/.exec(
			url.pathname,
		);
	return url.hostname === "github.com" && route
		? `${route[1]}/${route[2]}#${route[3]}`.toLowerCase()
		: null;
}
