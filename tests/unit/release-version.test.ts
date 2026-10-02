import { describe, expect, it } from "vitest";
import { releaseVersion } from "../../src/release-version";

const at = (iso: string) => new Date(iso);

describe("releaseVersion", () => {
	it.each([
		["2026-10-02T12:00:00Z", [], "2026.10.02.1", "2026.10.2.1"],
		["2026-10-02T12:00:00Z", ["v2026.10.02.1"], "2026.10.02.2", "2026.10.2.2"],
		[
			"2026-10-02T12:00:00Z",
			["v2026.10.02.1", "v2026.10.02.3", "v2026.10.01.7"],
			"2026.10.02.4",
			"2026.10.2.4",
		],
		["2026-10-03T00:30:00Z", ["v2026.10.02.2"], "2026.10.03.1", "2026.10.3.1"],
		["2027-01-03T09:00:00Z", ["v2026.12.31.5"], "2027.01.03.1", "2027.1.3.1"],
		[
			"2026-10-02T12:00:00Z",
			["release-1", "v1.0.0"],
			"2026.10.02.1",
			"2026.10.2.1",
		],
	])("on %s with %j releases %s", (date, tags, versionName, version) => {
		expect(releaseVersion(at(date), tags)).toEqual({ version, versionName });
	});

	it("uses the UTC date, not the local date", () => {
		expect(
			releaseVersion(new Date("2026-10-02T22:30:00-03:00"), []).versionName,
		).toBe("2026.10.03.1");
	});

	it("refuses a version older than a published one", () => {
		expect(() =>
			releaseVersion(at("2026-10-02T12:00:00Z"), ["v2026.10.03.1"]),
		).toThrow("greater than every published version");
	});
});
