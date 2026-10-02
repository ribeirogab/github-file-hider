import {
	type Evaluation,
	enabledRuleCount,
	evaluate,
	matchesPattern,
	PRESETS,
	type PresetId,
	presetRules,
} from "./rules";
import { isActive, type PullRequestKey, type Settings } from "./settings";

export type SessionState = {
	showingAll: boolean;
	revealed: ReadonlySet<string>;
};

export type SessionEvent =
	| { type: "activate" }
	| { type: "turn-off" }
	| { type: "show-all" }
	| { type: "hide-files-again" }
	| { type: "reveal"; path: string }
	| { type: "hide-revealed"; path: string }
	| { type: "change-mode" };

export const initialSession = (): SessionState => ({
	showingAll: false,
	revealed: new Set(),
});

export function reduceSession(
	state: SessionState,
	event: SessionEvent,
): SessionState {
	switch (event.type) {
		case "activate":
		case "hide-files-again":
		case "change-mode":
			return { ...state, showingAll: false };
		case "turn-off":
			return { showingAll: false, revealed: new Set() };
		case "show-all":
			return { ...state, showingAll: true };
		case "reveal":
			return { ...state, revealed: new Set([...state.revealed, event.path]) };
		case "hide-revealed": {
			const revealed = new Set(state.revealed);
			revealed.delete(event.path);
			return { ...state, revealed };
		}
	}
}

export type FileState = "hidden" | "revealed" | "kept" | "visible";

export type ControlViewName = "empty" | "inactive" | "filtering" | "showing";

export type ListedFile = {
	path: string;
	state: FileState;
	evaluation: Evaluation;
};

export type PageInput = {
	settings: Settings;
	pullRequestKey: PullRequestKey;
	paths: readonly string[];
	session: SessionState;
	openPath?: string | null;
};

export type PageModel = {
	pullRequestKey: PullRequestKey;
	mode: Settings["mode"];
	treeFiltering: boolean;
	active: boolean;
	filtering: boolean;
	showingAll: boolean;
	view: ControlViewName;
	files: ListedFile[];
	hiddenCount: number;
	matchCount: number;
	revealedPaths: string[];
	keptPaths: string[];
	presets: { id: PresetId; name: string; enabled: boolean; count: number }[];
	custom: { on: number; total: number; preview: string[]; count: number };
};

function fileState(
	evaluation: Evaluation,
	filtering: boolean,
	revealed: boolean,
): FileState {
	if (!filtering) return "visible";
	if (evaluation.matching) return revealed ? "revealed" : "hidden";
	return evaluation.kept ? "kept" : "visible";
}

function controlView(
	ruleCount: number,
	active: boolean,
	filtering: boolean,
	showingAll: boolean,
): ControlViewName {
	if (ruleCount === 0) return "empty";
	if (filtering) return "filtering";
	return active && showingAll ? "showing" : "inactive";
}

function presetCount(
	id: PresetId,
	input: PageInput,
	files: ListedFile[],
	filtering: boolean,
) {
	const { settings, paths } = input;
	if (settings.presets[id].enabled) {
		const byPreset = files.filter(
			(file) =>
				file.evaluation.reason?.kind === "preset" &&
				file.evaluation.reason.presetId === id,
		);
		return filtering
			? byPreset.filter((file) => file.state === "hidden").length
			: byPreset.filter((file) => file.evaluation.matching).length;
	}
	return paths.filter(
		(path) =>
			presetRules(settings, id).some((rule) => matchesPattern(rule, path)) &&
			!settings.alwaysShow.some((rule) => matchesPattern(rule.pattern, path)),
	).length;
}

export function derivePage(input: PageInput): PageModel {
	const { settings, pullRequestKey, session, openPath } = input;
	const active = isActive(settings, pullRequestKey);
	const filtering = active && !session.showingAll;
	const files = input.paths.map((path) => {
		const evaluation = evaluate(path, settings);
		const revealed = session.revealed.has(path) || path === openPath;
		return {
			path,
			evaluation,
			state: fileState(evaluation, filtering, revealed),
		};
	});
	const matching = files.filter((file) => file.evaluation.matching);
	const enabledCustom = settings.customRules.filter((rule) => rule.enabled);
	const byCustom = matching.filter(
		(file) => file.evaluation.reason?.kind === "custom",
	);
	return {
		pullRequestKey,
		mode: settings.mode,
		treeFiltering: settings.treeFiltering,
		active,
		filtering,
		showingAll: session.showingAll,
		view: controlView(
			enabledRuleCount(settings),
			active,
			filtering,
			session.showingAll,
		),
		files,
		hiddenCount: files.filter((file) => file.state === "hidden").length,
		matchCount: matching.length,
		revealedPaths: files
			.filter((file) => file.state === "revealed")
			.map((file) => file.path),
		keptPaths: files
			.filter((file) => file.evaluation.kept)
			.map((file) => file.path),
		presets: PRESETS.map((preset) => ({
			id: preset.id,
			name: preset.name,
			enabled: settings.presets[preset.id].enabled,
			count: presetCount(preset.id, input, files, filtering),
		})),
		custom: {
			on: enabledCustom.length,
			total: settings.customRules.length,
			preview: enabledCustom.map((rule) => rule.pattern),
			count: filtering
				? byCustom.filter((file) => file.state === "hidden").length
				: byCustom.length,
		},
	};
}
