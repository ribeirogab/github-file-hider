export const plural = (n: number, one: string, many: string) =>
	n === 1 ? one : many;

export const copy = {
	product: "GitHub File Hider",
	slogan: "Hide files in GitHub's Files changed tab.",
	hideFiles: "Hide files",
	filesHidden: (n: number) => plural(n, "file hidden", "files hidden"),
	hideAgain: "Hide files again",
	showAll: "Show all files",
	settings: "Settings",
	presets: "Presets",
	customRules: "Custom rules",
	alwaysShow: "Always show",
	manual: "Manual",
	automatic: "Automatic",
	options: "GitHub File Hider settings",
	tipHide: (n: number) =>
		n === 0
			? "No files in this pull request match your rules"
			: `Hide ${n} ${plural(n, "file", "files")} that ${plural(n, "matches", "match")} your rules`,
	tipHideAgain: "All files are showing for now. Hide the matching files again.",
	tipEmpty: "Choose which files to hide",
	menuToggle: "Hide files in this pull request",
	menuToggleDesc: (key: string) => `Remembered for #${key.split("#").pop()}`,
	menuShowAllAutoDesc: "Temporarily. Automatic mode stays on.",
	menuShowAllDesc: "Temporarily. Your rules stay on.",
	menuHideAgainDesc: "Showing all files for now",
	menuEmptyTitle: "Choose what to hide",
	menuEmptyManual:
		"Turn on a preset or add custom rules. Nothing is hidden until you select Hide files.",
	menuEmptyAuto:
		"Turn on a preset or add custom rules. Automatic mode hides matching files when Files changed opens.",
	menuCustomNone: "No custom rules yet",
	menuCustomOff: (n: number) => `${n} ${plural(n, "rule", "rules")}, all off`,
	menuScope: "All repositories",
	menuTree: "Hide in sidebar tree",
	menuTreeOn: "Matching files leave the tree",
	menuTreeOff: "The tree stays complete",
	notice: "This file is temporarily visible because you opened a direct link.",
	noticeFile: (reason: string) =>
		`It matches ${reason}. Other matching files stay hidden.`,
	noticeComment: (reason: string) =>
		`The linked comment is highlighted. It matches ${reason}. Other matching files stay hidden.`,
	noticeLabel: "Temporarily visible file",
	hideRevealed: "Hide again",
	labelRevealed: "Temporarily visible",
	labelKept: "Always shown",
	tipRevealed: "Opened from a direct link. Your rules have not changed.",
	tipKept: (always: string, reason: string) =>
		`Kept visible by the Always show rule ${always}. Otherwise ${reason} would hide it.`,
	tipTreeHidden: (reason: string) =>
		`Hidden in the diff by ${reason}. Select to show it temporarily.`,
	tipTreeRevealed: "Temporarily visible because you opened a direct link",
	emptyAll: "All files are hidden",
	emptyKept: "All other files are hidden",
	emptyAllBody: (allLoaded: boolean) =>
		allLoaded
			? "Every file in this pull request matches your rules. Hidden files are still part of the pull request and may need review."
			: "Every file loaded so far matches your rules. Hidden files are still part of the pull request and may need review.",
	emptyKeptBody: (n: number) =>
		`Only ${plural(n, "the file", "the files")} kept by an Always show rule ${plural(n, "is", "are")} visible. Hidden files are still part of the pull request and may need review.`,
	editRules: "Edit rules",
	treeEmptyTitle: "All files are hidden",
	treeEmptyBody: "Your rules hide every file in this tree.",
	live: {
		hidden: (n: number) => `${n} ${plural(n, "file", "files")} hidden.`,
		showing: (n: number) =>
			`Showing all files. ${n} ${plural(n, "file matches", "files match")} your rules.`,
		off: "All files are visible.",
		hiddenAgain: (path: string) => `${path} is hidden again.`,
		ruleAdded: "Rule added.",
		ruleSaved: "Rule saved.",
		ruleRemoved: "Rule removed.",
		restored: (name: string) => `${name} preset restored to its default rules.`,
	},
	settingsPage: {
		crumb: "Settings",
		contextSub: (version: string) => `Extension settings · Version ${version}`,
		viewSource: "View source",
		saved: "Saved",
		general: "General",
		rulesGroup: "Rules",
		navNote:
			"Settings apply to every repository and are stored only in this browser.",
		disclaimer: "GitHub File Hider is not affiliated with GitHub.",
		generalLede: "These settings apply to every repository on github.com.",
		modeLegend: "Activation mode",
		modeCaption:
			"Choose when your rules hide files. Turning rules on and hiding files are separate steps.",
		manualTitle: "Manual",
		defaultLabel: "Default",
		manualBody:
			"Each pull request starts with all files visible. Select <b>Hide files</b> in a pull request to filter it. File Hider remembers that choice for that pull request only.",
		autoTitle: "Automatic",
		autoBody:
			"Your rules apply as soon as you open Files changed in any pull request. <b>Show all files</b> stays one click away.",
		treeTitle: "Hide matching files in the sidebar tree",
		treeBody:
			"When off, the tree stays complete and matching files appear muted with an icon. The diff is filtered either way.",
		scopeTitle: "Scope and storage",
		factRepoTitle: "Every repository",
		factRepoBody:
			"One configuration applies to pull requests in all repositories on github.com. There are no per-repository settings.",
		factLocalTitle: "Only in this browser",
		factLocalBody:
			"Settings are stored locally in this Chrome profile. They are not synced between devices, and no account or server is involved.",
		factDisplayTitle: "Display only",
		factDisplayBody:
			"File Hider changes only what you see. It never changes files, comments, reviews, or the files you marked as viewed.",
		presetsLede:
			"Ready-made rule sets. A preset hides its files only while filtering is on in a pull request.",
		modified: "Modified",
		restore: "Restore defaults",
		restoreDisabled: "Rules match the defaults",
		presetEmpty:
			"This preset has no rules. Add one below or restore the defaults.",
		matchesLike: "Matches files like",
		customLede:
			"Hide files that presets don't cover. Rules match file paths relative to the repository root, not file contents.",
		customBox: "Hide rules",
		customEmptyTitle: "No custom rules yet",
		customEmptyBody:
			"Add a pattern such as `docs/**` or `**/generated/**` to hide files that presets don't cover.",
		alwaysLede:
			"Files that match these rules stay visible, even when a preset or a custom rule would hide them.",
		alwaysBox: "Always show rules",
		alwaysEmptyTitle: "No Always show rules",
		alwaysEmptyBody:
			"Add a path to keep one file visible while similar files are hidden, for example `src/payments/checkout.spec.ts`.",
		exampleLabel: "Example",
		exampleHide: "Hide",
		exampleAlways: "Always show",
		exampleResult:
			"Other `.spec.ts` files are hidden. `src/payments/checkout.spec.ts` stays visible.",
		addRule: "Add rule",
		addRuleTo: (list: string) => `Add a rule to ${list}`,
		editRuleNamed: (pattern: string) => `Edit rule ${pattern}`,
		save: "Save",
		cancel: "Cancel",
		edit: "Edit rule",
		remove: "Remove rule",
		on: "On",
		off: "Off",
		rulesOn: (n: number, total: number) => `${n} of ${total} on`,
		syntaxTitle: "Pattern syntax",
		syntaxColumns: ["Rule", "Meaning", "Example match"],
		syntaxBody:
			'<code class="fh-code">*</code> matches characters inside one folder or file name. <code class="fh-code">**/</code> matches zero or more folders, so <code class="fh-code">**/yarn.lock</code> matches <code class="fh-code">yarn.lock</code> at the root and in <code class="fh-code">apps/web/</code>. Every pattern starts at the repository root, so <code class="fh-code">*.lock</code> matches only root files. A trailing <code class="fh-code">/</code> matches a whole folder: <code class="fh-code">docs/</code> is the same as <code class="fh-code">docs/**</code>.',
		duplicate: "This rule is already in the list.",
		placeholderCustom: "docs/** or **/generated/**",
		placeholderAlways: "src/payments/**",
		breadcrumb: "Breadcrumb",
		navigation: "Settings",
		customRulesList: "custom rules",
		alwaysShowList: "Always show rules",
		presetList: (name: string) => `${name} preset`,
	},
	validation: {
		empty: "Enter a path or pattern.",
		leadingSlash: "Use a repository-relative path. Remove the leading /.",
		backslash: "Use forward slashes (/) in paths.",
		stars: "Use * or **, not ***.",
		duplicate: "This rule is already in the list.",
	},
};
