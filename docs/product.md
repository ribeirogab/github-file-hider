# GitHub File Hider

**Slogan:** Hide files in GitHub's Files changed tab.

**Status:** Agreed product definition. The extension has not been implemented.

Terms follow the glossary in [CONTEXT.md](../CONTEXT.md).

## 1. Purpose

GitHub File Hider is an open-source Chrome extension that hides selected files on the Files changed page of GitHub pull requests.

Its purpose is to let reviewers choose which files they see during a review. Users can apply ready-made presets, customize their rules, and add rules for specific cases.

For example, a reviewer can hide test files while reviewing application code, then show those files when ready to review the tests. Hidden files remain part of the pull request and may still require review.

The extension changes only the browser display. It does not remove files, change repository content, submit reviews, or mark files as viewed.

## 2. Project Identity and Audience

| Item | Definition |
| --- | --- |
| Project name | GitHub File Hider |
| Slogan | Hide files in GitHub's Files changed tab. |
| Audience | GitHub users worldwide who review pull requests |
| Affiliation | Not affiliated with GitHub. The Settings page and the Chrome Web Store listing say so. |
| License | [MIT](https://opensource.org/license/mit) |
| Source code | Public GitHub repository |
| Interface language | English |
| Documentation language | English |
| Distribution | Chrome Web Store and GitHub Releases |

The name stays "GitHub File Hider" by decision. See [ADR 0002](adr/0002-keep-the-name-github-file-hider.md).

## 3. Initial Scope

The first version supports Chrome and pull requests on `github.com`. It works on the current Files changed page at `/pull/<number>/changes`, including views of a single commit or a commit range of the pull request. Its product function is to hide files on that page, including file blocks in the diff and, optionally, file entries in the sidebar tree.

The following are outside the initial scope:

- Other browsers and GitHub Enterprise installations.
- The classic Files changed page at `/pull/<number>/files`. On that page, the extension does nothing.
- Filtering other GitHub pages, such as commit pages and compare pages outside a pull request.
- Settings for individual repositories.
- Synchronization between devices.
- Interface translations.
- Beta releases.
- Editing code or changing GitHub review state.

Documentation and generated-file presets are not included in the initial preset list. Users can cover those cases with custom rules.

## 4. Default Settings

| Setting | Default |
| --- | --- |
| Activation mode | Manual |
| Hide matching files in the diff | When filtering is active |
| Hide matching files in the sidebar tree | Enabled |
| Tests preset | Disabled |
| Lockfiles preset | Disabled |
| Custom hide rules | Empty |
| Always show rules | Empty |
| Settings scope | Global across repositories |
| Settings storage | Local to the current browser |

Selecting filtering rules and activating filtering are separate actions. Saved rules do not hide files until filtering is active.

## 5. Controls on the Files Changed Page

The extension provides a control on the Files changed page. It lets users activate filtering, show all files, see how many files are hidden, and open settings.

Example interface labels:

- `Hide files`
- `8 files hidden`
- `Show all files`
- `Settings`
- `Presets`
- `Custom rules`
- `Always show`

The hidden count is the number of matching files among the files GitHub lists in the current view, after GitHub's own file filters. It does not include files that are temporarily visible. It counts each file once, whether the file appears in the diff, the sidebar tree, or both. It does not depend on which diff blocks GitHub has loaded or on the tree filtering setting. It must update when GitHub lists more files or the user changes the rules.

If all displayed files match the rules, the control and the option to show all files must remain available.

The control's menu can turn presets and tree filtering on or off. These changes apply to every repository, and the menu says so.

Selecting the extension icon in the Chrome toolbar opens the Settings page. The extension has no popup. Installation does not open a page; the menu's empty state guides the first use.

## 6. Activation Modes

### Manual Mode

Manual mode is the default. Each new pull request starts with filtering inactive. The user chooses the rules and activates filtering in that pull request.

The extension remembers activation separately for each pull request. Reloading that pull request preserves its activation state. An activation stays until the user turns filtering off in that pull request; activations do not expire.

Pull requests are identified by repository owner, repository name, and pull request number, without regard to letter case. If a repository is renamed or transferred, its pull requests start inactive again. The same activation applies to every view of the pull request, including a single commit or a commit range.

Example:

1. The user enables the Tests preset in settings.
2. The user opens pull request A. All files remain visible.
3. The user selects `Hide files`. Matching files disappear.
4. The user reloads pull request A. Filtering remains active.
5. The user opens a new pull request B. Filtering starts inactive.

### Automatic Mode

Users can choose automatic mode in settings. In this mode, saved active rules apply when the user opens the Files changed page, without a separate activation action for each pull request.

Example: with automatic mode and the Tests preset enabled, opening the Files changed page hides matching test files immediately.

Automatic mode has no setting to turn off filtering for one pull request. Users can show all files in that pull request for the current view.

### Show All Files

Users can temporarily show all files and restore filtering afterward. Showing all files does not delete rules, reset presets, change the selected activation mode, or remove the activation of the pull request.

Show all files lasts for the current view of that pull request. It ends when the user selects `Hide files again`, reloads the page, or leaves the pull request.

## 7. Diff and Sidebar Tree

When filtering is active, matching file blocks are hidden from the diff.

The sidebar tree has a separate setting. By default, matching file entries are hidden there too. A folder in the tree is hidden when all its files are hidden. Users can turn that setting off to keep the tree complete while filtering the diff. With tree filtering off, matching entries appear muted with an icon.

Example: `src/button.spec.ts` disappears from both areas by default. With tree filtering disabled, its tree entry remains visible while its diff block is hidden.

The extension does not change GitHub's file totals, diff statistics, review status, or viewed-file state.

## 8. Presets

The initial version includes two presets. Both are disabled on first installation.

### Tests

Default rules:

```text
**/*.spec.*
**/*.test.*
**/__tests__/**
```

Example matches:

```text
button.spec.ts
src/components/Button.spec.tsx
src/utils/format.test.js
src/__tests__/checkout.ts
```

A file such as `src/test-utils.ts` does not match these rules merely because its name contains the word `test`.

### Lockfiles

Default rules:

```text
**/package-lock.json
**/yarn.lock
**/pnpm-lock.yaml
```

Example matches:

```text
package-lock.json
apps/web/yarn.lock
packages/service/pnpm-lock.yaml
```

### Preset Customization

Users can enable or disable each preset, add rules, edit rules, remove rules, and restore a preset to its default rules. Preset rules do not have individual on/off switches; users turn the whole preset on or off.

Example: a user adds `**/*.integration.ts` to the Tests preset to cover the naming convention in their project.

A preset that the user has not modified follows the default rules of the installed version, so a later version can improve its defaults. A preset whose rules differ from the defaults is marked `Modified` and keeps the user's rules. Restoring a preset applies the current default rules. See [ADR 0003](adr/0003-store-preset-edits-only.md).

## 9. Custom Rules and Exceptions

### Custom Hide Rules

Users can create hide rules independently of presets. Each custom rule can be turned on or off without deleting it.

Rules match repository-relative file paths, not file contents. A file with review comments is hidden like any other matching file. For a renamed or moved file, rules match the new path. For a deleted file, rules match its old path.

Every pattern starts at the repository root. A pattern without `**/` does not match files in nested directories: `*.lock` matches `yarn.lock` but not `apps/web/yarn.lock`. This differs from `.gitignore`. See [ADR 0001](adr/0001-anchor-patterns-at-repository-root.md).

Pattern support:

- Exact paths. Paths can contain spaces.
- `*` matches characters within one path segment.
- `?` matches one character within one path segment.
- `**/` matches zero or more directory levels.
- A trailing `/**` or `/` matches everything inside a directory: `docs/` is the same as `docs/**`.
- Matching is case-sensitive.
- Brace expansion (`{a,b}`), negation (`!`), and character classes (`[abc]`) are not supported.

| Rule | Meaning | Example match |
| --- | --- | --- |
| `src/config.ts` | One exact file path | `src/config.ts` |
| `**/*.test.*` | Test filenames at any directory level | `src/utils/format.test.js` |
| `**/generated/**` | Files inside generated directories | `src/generated/client.ts` |
| `docs/**` | Files inside the root docs directory | `docs/setup.md` |
| `docs/` | Same as `docs/**` | `docs/setup.md` |

### Always Show Rules

Always show rules take priority over hide rules, including rules from presets. Always show rules do not have an on/off switch; users remove a rule to stop it.

Example:

```text
Hide: **/*.spec.ts
Always show: src/payments/checkout.spec.ts
```

Other matching `.spec.ts` files are hidden, but `src/payments/checkout.spec.ts` remains visible.

### Rule Evaluation

1. If filtering is inactive or the user is showing all files, leave files visible.
2. If a file matches an Always show rule, leave it visible.
3. Otherwise, if it matches any rule in an enabled preset or any custom rule that is on, hide it.
4. Leave files that match no hide rule visible.

## 10. Direct Links and Dynamic Page Changes

### Direct Links

If a direct link targets an otherwise hidden file, a line in that file, or a review comment inside it, the extension temporarily reveals the file and shows a notice. Other matching files remain hidden, and saved rules remain unchanged.

Example notice: `This file is temporarily visible because you opened a direct link.`

The file stays visible until the user selects `Hide again`, turns filtering off, or leaves the pull request. A reload with the same link reveals the file again.

When GitHub's own navigation changes the URL to target a hidden file, the extension treats it as a direct link. With tree filtering off, selecting a muted tree entry also reveals the file as a direct link does.

### Single File Mode

On large pull requests, GitHub can show one file at a time. In that mode, the open file always stays visible. If it is a matching file, it is labelled as temporarily visible. The sidebar tree still follows the tree filtering setting.

### Dynamic Page Changes

Filtering must continue to work when GitHub loads additional files or updates the Files changed page during navigation. A reload must not be required for newly loaded files to receive the active rules.

## 11. Storage and Access

Preferences are saved locally in the current browser. They include activation mode, preset selections, edited preset rules, custom rules, Always show rules, the sidebar setting, and activation state for individual pull requests.

There is one global configuration across repositories. The first version does not provide repository overrides or synchronization between computers.

Example: enabling the Tests preset makes it available for every repository. In manual mode, the user still activates filtering separately in each new pull request.

The defined features do not require a backend server or an additional account. File paths and settings can remain in the browser. Extension access must be limited to the GitHub access needed for these features.

## 12. Distribution

### Chrome Web Store

The extension is intended for public publication in the Chrome Web Store. Users can install it through its store listing.

### GitHub

The public repository must include the source code, the MIT license, installation instructions, and a ZIP download for every stable release.

The ZIP must contain the installable extension files, with `manifest.json` at the package root.

Example local installation flow:

1. Download `github-file-hider-2026.10.02.1.zip` from GitHub Releases.
2. Extract the ZIP into a folder.
3. Open `chrome://extensions` in Chrome.
4. Enable Developer mode.
5. Select `Load unpacked` and choose the extracted folder.

Users who install locally receive instructions for replacing the local package when a new version is available. Local installation does not require publication in the store.

The installation procedure follows the [Chrome unpacked-extension instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## 13. Release and Version Standards

### Public Version Format

Use `YYYY.MM.DD.N`, based on the release date in UTC.

- `YYYY`: four-digit year.
- `MM`: two-digit month.
- `DD`: two-digit day.
- `N`: daily release counter, starting at `1` without leading zeros.

The counter increases for each new release on the same UTC date and resets to `1` on the next UTC date. Published version identifiers must not be reused.

| Release | Public version | Chrome internal version |
| --- | --- | --- |
| First on October 2, 2026 UTC | `2026.10.02.1` | `2026.10.2.1` |
| Second on the same UTC date | `2026.10.02.2` | `2026.10.2.2` |
| First on October 3, 2026 UTC | `2026.10.03.1` | `2026.10.3.1` |
| First on January 3, 2027 UTC | `2027.01.03.1` | `2027.1.3.1` |

UTC determines the date regardless of where a contributor is located. For example, a publication at 22:30 on October 2 in a UTC-3 location occurs at 01:30 UTC on October 3 and uses `2026.10.03.N`.

### Chrome Manifest

Chrome's `version` uses one to four integers between 0 and 65535. Nonzero components cannot have leading zeros, and the version cannot consist entirely of zeros. This project uses four components: year, month, day, and daily counter.

`version_name` preserves the formatted public version. Chrome compares `version` numerically for updates, so every newly submitted version must be greater than the previous version.

These constraints follow the [Chrome manifest version reference](https://developer.chrome.com/docs/extensions/reference/manifest/version) and the [Chrome Web Store update requirements](https://developer.chrome.com/docs/webstore/update).

Example manifest fields:

```json
{
  "version": "2026.10.2.1",
  "version_name": "2026.10.02.1"
}
```

### Release Names and Package Consistency

| Item | Format | Example |
| --- | --- | --- |
| Git tag | `vYYYY.MM.DD.N` | `v2026.10.02.1` |
| GitHub Release title | `YYYY.MM.DD.N` | `2026.10.02.1` |
| ZIP filename | `github-file-hider-YYYY.MM.DD.N.zip` | `github-file-hider-2026.10.02.1.zip` |

Each stable GitHub release is also submitted for Chrome Web Store review. Both channels use the same version and the same extension package. The GitHub ZIP can be available while store review is pending; store availability does not have to occur at the same time.

The initial release model includes only stable releases. Local installation is used to test the extension before publication.

### Publication Workflow: Deferred Decision

The publication process will be defined when the extension is implemented and ready to publish. This document does not choose a release trigger or an automation workflow.

For example, whether a release starts from a manual command, a Git tag, or a workflow action remains to be decided. The version, naming, UTC, and package-consistency standards above apply regardless of that future choice.

## 14. Acceptance Criteria

- First installation uses manual activation, leaves both presets disabled, and opens no page.
- The extension runs on the current Files changed page, including single-commit and commit-range views, and does nothing on the classic page.
- The Tests preset matches `.spec.*`, `.test.*`, and files inside `__tests__` at root or nested directory levels.
- The Lockfiles preset matches its listed filenames at root or nested directory levels.
- Users can edit preset rules, restore defaults, and create custom rules.
- An unmodified preset follows the default rules of the installed version.
- Patterns start at the repository root, accept spaces, and match case-sensitively.
- Renamed files match by their new path.
- Always show rules override every matching hide rule.
- Active filtering hides matching diff blocks and, by default, their tree entries.
- Disabling tree filtering preserves the full tree while filtering the diff.
- The hidden count equals the matching files GitHub lists in the current view, without temporarily visible files, and updates when more files load.
- Show all files restores visibility without deleting settings and ends on reload or when the user leaves the pull request.
- Manual activation is remembered for the same pull request after reload; a new pull request starts inactive.
- Automatic mode applies the selected rules when the Files changed page opens.
- Direct links to hidden files, their lines, or their comments reveal the target temporarily with a notice.
- In single file mode, the open file stays visible.
- Menu changes to presets and tree filtering state that they apply to every repository.
- Selecting the extension icon opens the Settings page.
- Preferences remain local and apply globally across repositories.
- Filtering does not modify repository content, comments, review submissions, or viewed-file state.
- The interface and documentation use English, and the public source includes the MIT license.
- The Settings page and the store listing state that the project is not affiliated with GitHub.
- GitHub releases provide an installable ZIP and instructions for local installation and updates.
- Release names follow the UTC date and daily counter, and store submissions use the same package as GitHub.

## 15. Maintenance Considerations

GitHub File Hider depends on GitHub's page structure. Changes to that structure can require an extension update. Compatibility checks must cover the diff, the sidebar tree, dynamically loaded files, virtualized large pull requests, single file mode, and direct links.

The extension is a visibility tool. Users retain control over when hidden files are shown and reviewed.

### Known Limitations

- The classic Files changed page is not supported.
- In single file mode, GitHub's previous and next buttons do not skip matching files.
- GitHub navigation that does not change the URL can move to a hidden file; that file stays hidden.
- Renaming or transferring a repository resets the activation of its pull requests.
- Files with review comments are hidden like other matching files.
