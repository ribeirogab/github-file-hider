import type { ControlViewName, SessionEvent } from "./filtering-session";
import type { PresetId } from "./rules";
import {
	activate,
	deactivate,
	type PullRequestKey,
	type Settings,
	setPresetEnabled,
	setTreeFiltering,
} from "./settings";

export type ActionContext = {
	settings: Settings;
	pullRequestKey: PullRequestKey;
	active: boolean;
};

export type ActionResult = {
	settings?: Settings;
	events: SessionEvent[];
	closeMenu?: "restore-focus" | "keep-focus";
	openSettings?: string;
};

const NONE: ActionResult = { events: [] };

function activateFiltering({ settings, pullRequestKey }: ActionContext) {
	return {
		events: [{ type: "activate" }],
		settings:
			settings.mode === "manual"
				? activate(settings, pullRequestKey)
				: undefined,
	} satisfies ActionResult;
}

function turnOffFiltering({ settings, pullRequestKey }: ActionContext) {
	return {
		events: [{ type: "turn-off" }],
		settings:
			settings.mode === "manual"
				? deactivate(settings, pullRequestKey)
				: undefined,
	} satisfies ActionResult;
}

function hideFilesAgain(context: ActionContext): ActionResult {
	return context.active
		? { events: [{ type: "hide-files-again" }] }
		: activateFiltering(context);
}

export function mainAction(
	view: ControlViewName,
	context: ActionContext,
): ActionResult {
	if (view === "inactive") return activateFiltering(context);
	if (view === "showing") return hideFilesAgain(context);
	return NONE;
}

export function menuAction(key: string, context: ActionContext): ActionResult {
	const { settings } = context;
	if (key === "pr-toggle")
		return context.active
			? turnOffFiltering(context)
			: activateFiltering(context);
	if (key === "show-all")
		return { events: [{ type: "show-all" }], closeMenu: "restore-focus" };
	if (key === "hide-again")
		return { ...hideFilesAgain(context), closeMenu: "restore-focus" };
	if (key.startsWith("preset:")) {
		const id = key.slice(7) as PresetId;
		return {
			events: [],
			settings: setPresetEnabled(settings, id, !settings.presets[id].enabled),
		};
	}
	if (key === "tree")
		return {
			events: [],
			settings: setTreeFiltering(settings, !settings.treeFiltering),
		};
	if (key === "custom" || key === "settings")
		return {
			events: [],
			closeMenu: "keep-focus",
			openSettings: key === "custom" ? "custom" : "general",
		};
	return NONE;
}
