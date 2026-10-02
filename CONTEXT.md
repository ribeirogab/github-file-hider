# GitHub File Hider

A Chrome extension that hides selected files on the Files changed page of GitHub pull requests. It changes only what the reviewer sees, never the pull request.

## Language

### GitHub surfaces

**Files changed page**:
The pull request page on github.com that shows the diff and the sidebar tree.
_Avoid_: Changes tab, Changes view, Files tab

**Sidebar tree**:
The list of changed files beside the diff on the Files changed page.
_Avoid_: File tree, file list, sidebar

**Single file mode**:
GitHub's display of one file at a time on the Files changed page of a large pull request.
_Avoid_: Single file view, file-by-file mode

**Direct link**:
A URL that targets one file, a line in a file, or a review comment on the Files changed page.
_Avoid_: Deep link, permalink, anchor link

**Pull request key**:
The repository owner, repository name, and pull request number that identify one pull request, without regard to letter case.
_Avoid_: PR id, PR URL

### Rules

**Pattern**:
The text of a rule: a file path relative to the repository root, anchored at that root.
_Avoid_: Glob, filter, path rule

**Hide rule**:
A pattern whose matching files are hidden while filtering is active. It comes from a preset or is a custom rule.
_Avoid_: Filter, filtering rule

**Preset**:
A named, ready-made set of hide rules that the user can turn on, edit, and restore.
_Avoid_: Template, profile, rule set

**Default rules**:
The hide rules that a preset has in the installed version of the extension. A preset whose rules differ from them is modified.
_Avoid_: Original rules, built-in rules

**Custom rule**:
A hide rule that the user creates outside any preset.
_Avoid_: User rule, custom filter

**Always show rule**:
A pattern whose matching files stay visible even when a hide rule matches them.
_Avoid_: Exception, allowlist, whitelist, keep rule

### Files

**Matching file**:
A file that a hide rule matches and no Always show rule keeps visible.
_Avoid_: Filtered file

**Hidden file**:
A matching file that the extension hides at this moment.
_Avoid_: Removed file, filtered file

**Kept file**:
A file that a hide rule matches but an Always show rule keeps visible.
_Avoid_: Exception, whitelisted file

**Reveal**:
To show one matching file temporarily, without changing any rule, because the user opened a direct link to it or GitHub opened it in single file mode. The file is then temporarily visible.
_Avoid_: Unhide, expose

**Hidden count**:
The number of matching files among the files GitHub lists in the current view, without the files that are temporarily visible.
_Avoid_: Filtered count, total hidden

### Filtering

**Filtering**:
The state in which hide rules hide matching files in a pull request. It is active or inactive.
_Avoid_: Hiding, filter on

**Activation mode**:
The global choice between manual mode and automatic mode.
_Avoid_: Filtering mode, trigger

**Manual mode**:
The activation mode in which filtering starts inactive in each pull request until the user activates it there.
_Avoid_: On-demand mode

**Automatic mode**:
The activation mode in which filtering is active in every pull request when the Files changed page opens.
_Avoid_: Always-on mode

**Activation**:
The user's choice, remembered for one pull request key in manual mode, to make filtering active.
_Avoid_: Enablement, turning on

**Show all files**:
A temporary pause of filtering for the current view of one pull request. Rules and activation do not change.
_Avoid_: Disable, turn off, reset

**Tree filtering**:
The global setting that also hides matching files from the sidebar tree.
_Avoid_: Tree hiding

**Settings page**:
The extension page where the user edits the activation mode, tree filtering, presets, custom rules, and Always show rules.
_Avoid_: Options page, popup, preferences
