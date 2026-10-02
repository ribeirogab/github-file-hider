# GitHub File Hider

**Slogan:** Hide files in GitHub's Changes tab.

**Status:** Agreed product definition. The extension has not been implemented.

## 1. Purpose

GitHub File Hider is an open-source Chrome extension that hides selected files in the Changes tab of GitHub pull requests.

Its purpose is to let reviewers choose which files they see during a review. Users can apply ready-made presets, customize their rules, and add rules for specific cases.

For example, a reviewer can hide test files while reviewing application code, then show those files when ready to review the tests. Hidden files remain part of the pull request and may still require review.

The extension changes only the browser display. It does not remove files, change repository content, submit reviews, or mark files as viewed.

## 2. Project Identity and Audience

| Item | Definition |
| --- | --- |
| Project name | GitHub File Hider |
| Slogan | Hide files in GitHub's Changes tab. |
| Audience | GitHub users worldwide who review pull requests |
| License | [MIT](https://opensource.org/license/mit) |
| Source code | Public GitHub repository |
| Interface language | English |
| Documentation language | English |
| Distribution | Chrome Web Store and GitHub Releases |

## 3. Initial Scope

The first version supports Chrome and pull requests on `github.com`. Its product function is to hide files in the Changes view, including file blocks in the diff and, optionally, file entries in the sidebar tree.

The following are outside the initial scope:

- Other browsers and GitHub Enterprise installations.
- Filtering other GitHub pages.
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

## 5. Controls in Changes

The extension provides a control inside the Changes view. It lets users activate filtering, show all files, see how many files are hidden, and open settings.

Example interface labels:

- `Hide files`
- `8 files hidden`
- `Show all files`
- `Settings`
- `Presets`
- `Custom rules`
- `Always show`

The hidden-file count describes distinct files actually hidden by the extension. It must update when the page loads more files or the user changes the active filters. It must not count the same file twice because it appears in both the diff and the tree.

If all displayed files match the filters, the control and the option to show all files must remain available.

## 6. Activation Modes

### Manual Mode

Manual mode is the default. Each new pull request starts with filtering inactive. The user chooses the rules and activates filtering in that pull request.

The extension remembers activation separately for each pull request. Reloading that pull request preserves its activation state. Pull requests are identified by repository and pull request number.

Example:

1. The user enables the Tests preset in settings.
2. The user opens pull request A. All files remain visible.
3. The user selects `Hide files`. Matching files disappear.
4. The user reloads pull request A. Filtering remains active.
5. The user opens a new pull request B. Filtering starts inactive.

### Automatic Mode

Users can choose automatic mode in settings. In this mode, saved active rules apply when the user opens Changes, without a separate activation action for each pull request.

Example: with automatic mode and the Tests preset enabled, opening Changes hides matching test files immediately.

### Show All Files

Users can temporarily show all files and restore filtering afterward. Showing all files does not delete rules, reset presets, or change the selected activation mode.

## 7. Diff and Sidebar Tree

When filtering is active, matching file blocks are hidden from the diff.

The sidebar tree has a separate setting. By default, matching file entries are hidden there too. Users can turn that setting off to keep the tree complete while filtering the diff.

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

Users can enable or disable each preset, add rules, edit rules, remove rules, and restore a preset to its original rules.

Example: a user adds `**/*.integration.ts` to the Tests preset to cover the naming convention in their project.

## 9. Custom Rules and Exceptions

### Custom Hide Rules

Users can create hide rules independently of presets. Rules match repository-relative file paths, not file contents.

Required pattern support includes exact paths, `*` for characters within a path segment, and `**/` for zero or more directory levels. This allows rules to match files at the repository root and in nested directories.

| Rule | Meaning | Example match |
| --- | --- | --- |
| `src/config.ts` | One exact file path | `src/config.ts` |
| `**/*.test.*` | Test filenames at any directory level | `src/utils/format.test.js` |
| `**/generated/**` | Files inside generated directories | `src/generated/client.ts` |
| `docs/**` | Files inside the root docs directory | `docs/setup.md` |

### Always Show Rules

Always show rules take priority over hide rules, including rules from presets.

Example:

```text
Hide: **/*.spec.ts
Always show: src/payments/checkout.spec.ts
```

Other matching `.spec.ts` files are hidden, but `src/payments/checkout.spec.ts` remains visible.

### Rule Evaluation

1. If filtering is inactive or the user is showing all files, leave files visible.
2. If a file matches an Always show rule, leave it visible.
3. Otherwise, if it matches any rule in an enabled preset or any active custom hide rule, hide it.
4. Leave files that match no hide rule visible.

## 10. Direct Links and Dynamic Page Changes

If a direct link targets an otherwise hidden file or a comment inside that file, the extension temporarily reveals the target file and shows a notice. Other matching files remain hidden, and saved rules remain unchanged.

Example notice: `This file is temporarily visible because you opened a direct link.`

Filtering must continue to work when GitHub loads additional files or updates the Changes view during navigation. A reload must not be required for newly loaded files to receive the active filters.

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

- First installation uses manual activation and leaves both presets disabled.
- The Tests preset matches `.spec.*`, `.test.*`, and files inside `__tests__` at root or nested directory levels.
- The Lockfiles preset matches its listed filenames at root or nested directory levels.
- Users can edit preset rules, restore defaults, and create custom rules.
- Always show rules override every matching hide rule.
- Active filtering hides matching diff blocks and, by default, their tree entries.
- Disabling tree filtering preserves the full tree while filtering the diff.
- The hidden-file count remains accurate, including when more files load.
- Show all files restores visibility without deleting settings.
- Manual activation is remembered for the same pull request after reload; a new pull request starts inactive.
- Automatic mode applies the selected filters when Changes opens.
- Direct links to hidden files or their comments reveal the target temporarily with a notice.
- Preferences remain local and apply globally across repositories.
- Filtering does not modify repository content, comments, review submissions, or viewed-file state.
- The interface and documentation use English, and the public source includes the MIT license.
- GitHub releases provide an installable ZIP and instructions for local installation and updates.
- Release names follow the UTC date and daily counter, and store submissions use the same package as GitHub.

## 15. Maintenance Considerations

GitHub File Hider depends on GitHub's page structure. Changes to that structure can require an extension update. Compatibility checks must cover the diff, the sidebar tree, dynamically loaded files, and direct links.

The extension is a visibility tool. Users retain control over when hidden files are shown and reviewed.
