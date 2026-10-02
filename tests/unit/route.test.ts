import { expect, test } from "vitest";
import { pullRequestKey } from "../../src/route";

test.each([
	["/Owner/Repo/pull/12/changes", "owner/repo#12"],
	["/owner/repo/pull/12/changes/abc123", "owner/repo#12"],
	["/owner/repo/pull/12/changes/abc..def?mode=single", "owner/repo#12"],
	["/owner/repo/pull/12/files", null],
	["/owner/repo/pull/12", null],
	["/owner/repo/compare/a..b", null],
])("route %s produces %s", (path, key) => {
	expect(pullRequestKey(new URL(path, "https://github.com"))).toBe(key);
});
test("other hosts stay inactive", () => {
	expect(
		pullRequestKey(new URL("https://example.com/a/b/pull/1/changes")),
	).toBeNull();
});
