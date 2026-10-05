import { describe, expect, it } from "vitest";
import {
	alwaysKey,
	customKey,
	derive,
	initialState,
	presetKey,
	type SandboxState,
} from "../../site/src/model";

const hiddenPaths = (state: SandboxState) =>
	derive(state)
		.files.filter((file) => file.state === "hidden")
		.map((file) => file.path);

describe("landing page sandbox model", () => {
	it("starts with the demo rules hiding 11 of 25 files", () => {
		const model = derive(initialState(true));
		expect(model.view).toBe("filtering");
		expect(model.files).toHaveLength(25);
		expect(model.hidden).toBe(11);
		expect(model.counts.get(presetKey("tests"))).toBe(8);
		expect(model.counts.get(presetKey("lockfiles"))).toBe(2);
		expect(model.counts.get(customKey("custom-generated"))).toBe(1);
		expect(model.counts.get(alwaysKey("always-checkout"))).toBe(1);
		expect(model.byPath.get("src/payments/checkout.spec.ts")?.state).toBe(
			"kept",
		);
	});

	it("shows the test files again when the Tests preset is off", () => {
		const state = initialState(true);
		state.presets.tests = false;
		expect(hiddenPaths(state)).toEqual([
			"examples/node/package-lock.json",
			"pnpm-lock.yaml",
			"src/generated/client.ts",
		]);
		expect(derive(state).counts.get(presetKey("tests"))).toBe(8);
	});

	it("hides a folder through a custom rule with a trailing slash", () => {
		const state = initialState(true);
		state.custom.push({ id: "docs", pattern: "docs/", enabled: true });
		expect(hiddenPaths(state)).toContain("docs/release notes.md");
		expect(derive(state).hidden).toBe(13);
	});

	it("keeps every file visible while Show all files is on", () => {
		const state = initialState(true);
		state.showingAll = true;
		const model = derive(state);
		expect(model.view).toBe("showing");
		expect(model.hidden).toBe(0);
		expect(model.match).toBe(11);
	});

	it("reveals a hidden file that the visitor opens from the tree", () => {
		const state = initialState(true);
		state.revealed.add("pnpm-lock.yaml");
		const model = derive(state);
		expect(model.byPath.get("pnpm-lock.yaml")?.state).toBe("revealed");
		expect(model.hidden).toBe(10);
	});

	it("reports the empty view when no rule is on", () => {
		const state = initialState(true);
		state.presets = { tests: false, lockfiles: false };
		state.custom = [];
		expect(derive(state).view).toBe("empty");
	});
});
