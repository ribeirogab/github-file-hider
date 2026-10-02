export type PresetId = "tests" | "lockfiles";
export type PullRequestKey = string;
export type Settings = {
	schemaVersion: 1;
	mode: "manual" | "automatic";
	treeFiltering: boolean;
	presets: Record<PresetId, { enabled: boolean; rules?: string[] }>;
	customRules: { id: string; pattern: string; enabled: boolean }[];
	alwaysShow: { id: string; pattern: string }[];
	activations: Record<PullRequestKey, true>;
};
export type Reason =
	| { kind: "preset"; presetId: PresetId; pattern: string }
	| { kind: "custom" | "always"; ruleId: string; pattern: string };
export type Evaluation = {
	matching: boolean;
	kept: boolean;
	reason: Reason | null;
};
