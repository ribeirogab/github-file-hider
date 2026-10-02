import { describe, expect, it } from "vitest";
import { parseRoute } from "../../src/github-page";

const demo = "https://github.com/ribeirogab/github-file-hider-demo";

describe("parseRoute", () => {
	it.each([
		[`${demo}/pull/1/changes`, "ribeirogab/github-file-hider-demo#1", false],
		[`${demo}/pull/1/changes/`, "ribeirogab/github-file-hider-demo#1", false],
		[
			`${demo}/pull/1/changes/e398fbd9e231722d3da3a7c3665efc43797fb3e1`,
			"ribeirogab/github-file-hider-demo#1",
			false,
		],
		[
			`${demo}/pull/1/changes/e3caccf28a9c0ad74ccf4cfad449a36e58cb081e..b4877d0616704e3775667dc3a8d3ae53ad36167d`,
			"ribeirogab/github-file-hider-demo#1",
			false,
		],
		[
			`${demo}/pull/3/changes?mode=single#diff-abc`,
			"ribeirogab/github-file-hider-demo#3",
			true,
		],
		[
			"https://github.com/RibeiroGab/GitHub-File-Hider-Demo/pull/7/changes",
			"ribeirogab/github-file-hider-demo#7",
			false,
		],
	])("detects the Files changed page at %s", (url, key, singleFile) => {
		expect(parseRoute(new URL(url))).toEqual({ key, singleFile });
	});

	it.each([
		`${demo}/pull/1`,
		`${demo}/pull/1/files`,
		`${demo}/pull/1/commits`,
		`${demo}/compare/main...feature`,
		`${demo}/commit/e398fbd9e231722d3da3a7c3665efc43797fb3e1`,
		"https://gist.github.com/ribeirogab/1/pull/1/changes",
	])("ignores %s", (url) => {
		expect(parseRoute(new URL(url))).toBeNull();
	});
});
