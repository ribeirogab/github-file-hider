import { enabledRuleCount, evaluate } from "./rules";
import type { Settings } from "./types";
export type Session = {
	key: string;
	showingAll: boolean;
	revealed: Set<string>;
};
export type FileState = "hidden" | "temporarily-visible" | "kept" | "visible";
export function createSession(key: string): Session {
	return { key, showingAll: false, revealed: new Set() };
}
export function filteringModel(
	settings: Settings,
	session: Session,
	paths: string[],
) {
	const active =
		settings.mode === "automatic" || !!settings.activations[session.key];
	const filtering = active && !session.showingAll;
	const files = paths.map((path) => {
		const evaluation = evaluate(path, settings);
		const state: FileState = !filtering
			? "visible"
			: evaluation.kept
				? "kept"
				: evaluation.matching
					? session.revealed.has(path)
						? "temporarily-visible"
						: "hidden"
					: "visible";
		return { path, state, ...evaluation };
	});
	return {
		active,
		filtering,
		files,
		hiddenCount: files.filter((f) => f.state === "hidden").length,
		matchCount: files.filter((f) => f.matching).length,
		view: !enabledRuleCount(settings)
			? "empty"
			: !active
				? "inactive"
				: filtering
					? "filtering"
					: "showing",
	};
}
