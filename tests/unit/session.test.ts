import { expect, test } from "vitest";
import { createSession, filteringModel } from "../../src/filtering-session";
import { firstInstallSettings } from "../../src/settings-store";

test("no rules, activation, pause, and resume produce the control states", () => {
	const settings = firstInstallSettings();
	const session = createSession("owner/repo#1");
	expect(filteringModel(settings, session, ["a.spec.ts"]).view).toBe("empty");
	settings.presets.tests.enabled = true;
	expect(filteringModel(settings, session, ["a.spec.ts"]).view).toBe(
		"inactive",
	);
	settings.activations[session.key] = true;
	expect(filteringModel(settings, session, ["a.spec.ts"])).toMatchObject({
		view: "filtering",
		hiddenCount: 1,
	});
	session.showingAll = true;
	expect(filteringModel(settings, session, ["a.spec.ts"])).toMatchObject({
		view: "showing",
		hiddenCount: 0,
		matchCount: 1,
	});
	session.showingAll = false;
	expect(filteringModel(settings, session, ["a.spec.ts"]).hiddenCount).toBe(1);
});
test("revealed and kept files do not count as hidden", () => {
	const settings = firstInstallSettings();
	settings.mode = "automatic";
	settings.presets.tests.enabled = true;
	settings.alwaysShow = [{ id: "kept", pattern: "checkout.spec.ts" }];
	const session = createSession("owner/repo#1");
	session.revealed.add("button.spec.ts");
	const model = filteringModel(settings, session, [
		"button.spec.ts",
		"checkout.spec.ts",
		"other.spec.ts",
		"app.ts",
	]);
	expect(model.files.map((file) => [file.path, file.state])).toEqual([
		["button.spec.ts", "temporarily-visible"],
		["checkout.spec.ts", "kept"],
		["other.spec.ts", "hidden"],
		["app.ts", "visible"],
	]);
	expect(model.hiddenCount).toBe(1);
});
