import { describe, expect, it } from "vitest";
import {
	derivePage,
	initialSession,
	reduceSession,
	type SessionState,
} from "../../src/filtering-session";
import {
	activate,
	addAlwaysShow,
	addCustomRule,
	firstInstallSettings,
	type Settings,
	setMode,
	setPresetEnabled,
	updateCustomRule,
} from "../../src/settings";

const PROTOTYPE_PATHS = [
	"docs/payments.md",
	"e2e/checkout.spec.ts",
	"examples/node/package-lock.json",
	"src/__tests__/checkout.ts",
	"src/components/Button.spec.tsx",
	"src/components/Button.tsx",
	"src/components/CheckoutForm.test.tsx",
	"src/components/CheckoutForm.tsx",
	"src/config.ts",
	"src/generated/client.ts",
	"src/payments/__tests__/gateway.ts",
	"src/payments/checkout.spec.ts",
	"src/payments/checkout.ts",
	"src/payments/gateway.ts",
	"src/payments/retry-policy.spec.ts",
	"src/payments/retry-policy.ts",
	"src/test-utils.ts",
	"src/utils/format.test.ts",
	"src/utils/format.ts",
	"package.json",
	"pnpm-lock.yaml",
	"README.md",
];

const KEY = "acme/storefront#482";

function demo(): Settings {
	let settings = setPresetEnabled(
		setPresetEnabled(firstInstallSettings(), "tests", true),
		"lockfiles",
		true,
	);
	settings = addCustomRule(settings, "generated", "**/generated/**");
	settings = addCustomRule(settings, "docs", "docs/**");
	settings = updateCustomRule(settings, "docs", { enabled: false });
	return addAlwaysShow(settings, "checkout", "src/payments/checkout.spec.ts");
}

const page = (settings: Settings, session: SessionState = initialSession()) =>
	derivePage({
		settings,
		pullRequestKey: KEY,
		paths: PROTOTYPE_PATHS,
		session,
	});

describe("derivePage with the prototype demo", () => {
	it("matches 10 of 22 files before activation", () => {
		const model = page(demo());
		expect(model.view).toBe("inactive");
		expect(model.matchCount).toBe(10);
		expect(model.hiddenCount).toBe(0);
		expect(model.presets.map((p) => [p.id, p.count])).toEqual([
			["tests", 7],
			["lockfiles", 2],
		]);
		expect(model.custom).toEqual({
			on: 1,
			total: 2,
			preview: ["**/generated/**"],
			count: 1,
		});
	});

	it("hides 10 files and keeps checkout.spec.ts while filtering", () => {
		const model = page(activate(demo(), KEY));
		expect(model.view).toBe("filtering");
		expect(model.hiddenCount).toBe(10);
		expect(model.keptPaths).toEqual(["src/payments/checkout.spec.ts"]);
		expect(
			model.files.find((f) => f.path === "src/payments/checkout.spec.ts")
				?.state,
		).toBe("kept");
		expect(model.files.find((f) => f.path === "src/test-utils.ts")?.state).toBe(
			"visible",
		);
	});

	it("shows the empty view when no rule is on", () => {
		expect(page(firstInstallSettings()).view).toBe("empty");
	});

	it("is active everywhere in automatic mode", () => {
		const model = page(setMode(demo(), "automatic"));
		expect(model.active).toBe(true);
		expect(model.view).toBe("filtering");
	});
});

describe("session events", () => {
	it("show all pauses filtering without changing activation", () => {
		const session = reduceSession(initialSession(), { type: "show-all" });
		const model = page(activate(demo(), KEY), session);
		expect(model.view).toBe("showing");
		expect(model.active).toBe(true);
		expect(model.hiddenCount).toBe(0);
		expect(model.matchCount).toBe(10);
	});

	it("excludes revealed files from the hidden count", () => {
		const session = reduceSession(initialSession(), {
			type: "reveal",
			path: "src/components/Button.spec.tsx",
		});
		const model = page(activate(demo(), KEY), session);
		expect(model.hiddenCount).toBe(9);
		expect(model.revealedPaths).toEqual(["src/components/Button.spec.tsx"]);
	});

	it("turning off forgets reveals and showing all", () => {
		let session = reduceSession(initialSession(), { type: "show-all" });
		session = reduceSession(session, { type: "reveal", path: "a" });
		expect(reduceSession(session, { type: "turn-off" })).toEqual({
			showingAll: false,
			revealed: new Set(),
		});
	});

	it("treats the open file in single file mode as revealed", () => {
		const model = derivePage({
			settings: activate(demo(), KEY),
			pullRequestKey: KEY,
			paths: PROTOTYPE_PATHS,
			session: initialSession(),
			openPath: "e2e/checkout.spec.ts",
		});
		expect(
			model.files.find((f) => f.path === "e2e/checkout.spec.ts")?.state,
		).toBe("revealed");
		expect(model.hiddenCount).toBe(9);
	});
});
