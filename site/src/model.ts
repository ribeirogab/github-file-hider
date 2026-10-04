import {
	type AlwaysShowRule,
	type CustomRule,
	type Evaluation,
	enabledRuleCount,
	evaluate,
	matchesPattern,
	PRESETS,
	type PresetId,
	presetRules,
	type RuleSettings,
} from "../../src/rules.ts";
import { DEMO_FILES, type DemoFile } from "./demo.ts";

export type SandboxState = {
	active: boolean;
	showingAll: boolean;
	tree: boolean;
	menuOpen: boolean;
	presets: Record<PresetId, boolean>;
	custom: CustomRule[];
	always: AlwaysShowRule[];
	revealed: Set<string>;
	collapsed: Set<string>;
	filter: string;
	current: string | null;
};

export type FileState = "visible" | "hidden" | "revealed" | "kept";

export type View = "empty" | "inactive" | "filtering" | "showing";

export type FileModel = DemoFile & { evaluation: Evaluation; state: FileState };

export type Model = {
	filtering: boolean;
	files: FileModel[];
	byPath: Map<string, FileModel>;
	view: View;
	hidden: number;
	match: number;
	counts: Map<string, number>;
	live: Map<string, boolean>;
};

export function initialState(menuOpen: boolean): SandboxState {
	return {
		active: true,
		showingAll: false,
		tree: true,
		menuOpen,
		presets: { tests: true, lockfiles: true },
		custom: [
			{ id: "custom-generated", pattern: "**/generated/**", enabled: true },
		],
		always: [
			{ id: "always-checkout", pattern: "src/payments/checkout.spec.ts" },
		],
		revealed: new Set(),
		collapsed: new Set(),
		filter: "",
		current: null,
	};
}

export const ruleSettings = (state: SandboxState): RuleSettings => ({
	presets: {
		tests: { enabled: state.presets.tests },
		lockfiles: { enabled: state.presets.lockfiles },
	},
	customRules: state.custom,
	alwaysShow: state.always,
});

export const presetKey = (id: PresetId) => `preset:${id}`;

export const customKey = (id: string) => `custom:${id}`;

export const alwaysKey = (id: string) => `always:${id}`;

function fileState(
	file: DemoFile,
	evaluation: Evaluation,
	state: SandboxState,
	filtering: boolean,
): FileState {
	if (filtering && evaluation.matching)
		return state.revealed.has(file.path) ? "revealed" : "hidden";
	if (filtering && evaluation.kept) return "kept";
	return "visible";
}

function viewOf(
	state: SandboxState,
	settings: RuleSettings,
	filtering: boolean,
): View {
	if (enabledRuleCount(settings) === 0) return "empty";
	if (filtering) return "filtering";
	if (state.active && state.showingAll) return "showing";
	return "inactive";
}

const keptByAlwaysShow = (state: SandboxState, path: string) =>
	state.always.some((rule) => matchesPattern(rule.pattern, path));

function presetCounts(
	state: SandboxState,
	settings: RuleSettings,
	files: FileModel[],
	filtering: boolean,
	counts: Map<string, number>,
	live: Map<string, boolean>,
) {
	for (const preset of PRESETS) {
		const key = presetKey(preset.id);
		if (!state.presets[preset.id]) {
			const rules = presetRules(settings, preset.id);
			counts.set(
				key,
				DEMO_FILES.filter(
					(file) =>
						rules.some((rule) => matchesPattern(rule, file.path)) &&
						!keptByAlwaysShow(state, file.path),
				).length,
			);
			live.set(key, false);
			continue;
		}
		const matched = files.filter(
			(file) =>
				file.evaluation.reason?.kind === "preset" &&
				file.evaluation.reason.presetId === preset.id,
		);
		counts.set(
			key,
			filtering
				? matched.filter((file) => file.state === "hidden").length
				: matched.filter((file) => file.evaluation.matching).length,
		);
		live.set(key, filtering);
	}
}

function customCounts(
	state: SandboxState,
	files: FileModel[],
	filtering: boolean,
	counts: Map<string, number>,
	live: Map<string, boolean>,
) {
	for (const rule of state.custom) {
		const key = customKey(rule.id);
		if (!rule.enabled) {
			counts.set(
				key,
				DEMO_FILES.filter((file) => matchesPattern(rule.pattern, file.path))
					.length,
			);
			live.set(key, false);
			continue;
		}
		const matched = files.filter(
			(file) =>
				file.evaluation.reason?.kind === "custom" &&
				file.evaluation.reason.ruleId === rule.id,
		);
		counts.set(
			key,
			filtering
				? matched.filter((file) => file.state === "hidden").length
				: matched.length,
		);
		live.set(key, filtering);
	}
}

function alwaysCounts(
	state: SandboxState,
	files: FileModel[],
	filtering: boolean,
	counts: Map<string, number>,
	live: Map<string, boolean>,
) {
	for (const rule of state.always) {
		const key = alwaysKey(rule.id);
		counts.set(
			key,
			files.filter(
				(file) =>
					file.evaluation.kept &&
					file.evaluation.reason?.kind === "always" &&
					file.evaluation.reason.ruleId === rule.id,
			).length,
		);
		live.set(key, filtering);
	}
}

export function derive(state: SandboxState): Model {
	const settings = ruleSettings(state);
	const filtering = state.active && !state.showingAll;
	const files = DEMO_FILES.map((file) => {
		const evaluation = evaluate(file.path, settings);
		return {
			...file,
			evaluation,
			state: fileState(file, evaluation, state, filtering),
		};
	});
	const counts = new Map<string, number>();
	const live = new Map<string, boolean>();
	presetCounts(state, settings, files, filtering, counts, live);
	customCounts(state, files, filtering, counts, live);
	alwaysCounts(state, files, filtering, counts, live);
	return {
		filtering,
		files,
		byPath: new Map(files.map((file) => [file.path, file])),
		view: viewOf(state, settings, filtering),
		hidden: files.filter((file) => file.state === "hidden").length,
		match: files.filter((file) => file.evaluation.matching).length,
		counts,
		live,
	};
}
