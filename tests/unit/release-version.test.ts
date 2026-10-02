import { expect, test } from "vitest";
import { releaseVersion } from "../../src/release-version";

test.each([
	["2026-10-02T23:59:59Z", [], "2026.10.02.1", "2026.10.2.1"],
	[
		"2026-10-02T12:00:00Z",
		["v2026.10.02.1", "v2026.10.02.3"],
		"2026.10.02.4",
		"2026.10.2.4",
	],
	["2026-10-03T01:30:00Z", ["v2026.10.02.3"], "2026.10.03.1", "2026.10.3.1"],
	["2027-01-03T00:00:00Z", ["v2026.10.03.9"], "2027.01.03.1", "2027.1.3.1"],
])("UTC release on %s", (date, tags, versionName, version) => {
	expect(releaseVersion(new Date(date), tags)).toEqual({
		version,
		versionName,
	});
});
test("refuses an older date than a published version", () => {
	expect(() =>
		releaseVersion(new Date("2026-10-01"), ["v2026.10.02.1"]),
	).toThrow("greater");
});
test("refuses a counter outside Chrome limits", () => {
	expect(() =>
		releaseVersion(new Date("2026-10-02"), ["v2026.10.02.65535"]),
	).toThrow("limit");
});
