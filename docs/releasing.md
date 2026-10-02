# Releasing

These standards apply to every release of GitHub File Hider, whatever publication workflow the project adopts later.

## Distribution

Each stable release is published in two channels with the same version and the same extension package:

- **GitHub Releases**: a ZIP download for local installation.
- **Chrome Web Store**: the same package, submitted for review.

The GitHub ZIP can be available while store review is pending. Store availability does not have to occur at the same time.

The initial release model includes only stable releases. Local installation is used to test the extension before publication.

## Package

The ZIP must contain the installable extension files, with `manifest.json` at the package root.

The public repository must include the source code, the MIT license, installation instructions, and a ZIP download for every stable release.

## Local Installation

1. Download `github-file-hider-2026.10.02.1.zip` from GitHub Releases.
2. Extract the ZIP into a folder.
3. Open `chrome://extensions` in Chrome.
4. Enable Developer mode.
5. Select `Load unpacked` and choose the extracted folder.

Users who install locally receive instructions for replacing the local package when a new version is available. Local installation does not require publication in the store.

The procedure follows the [Chrome unpacked-extension instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## Version Format

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

## Chrome Manifest

Chrome's `version` uses one to four integers between 0 and 65535. Nonzero components cannot have leading zeros, and the version cannot consist entirely of zeros. This project uses four components: year, month, day, and daily counter.

`version_name` preserves the formatted public version. Chrome compares `version` numerically for updates, so every newly submitted version must be greater than the previous version.

```json
{
  "version": "2026.10.2.1",
  "version_name": "2026.10.02.1"
}
```

These constraints follow the [Chrome manifest version reference](https://developer.chrome.com/docs/extensions/reference/manifest/version) and the [Chrome Web Store update requirements](https://developer.chrome.com/docs/webstore/update).

## Release Names

| Item | Format | Example |
| --- | --- | --- |
| Git tag | `vYYYY.MM.DD.N` | `v2026.10.02.1` |
| GitHub Release title | `YYYY.MM.DD.N` | `2026.10.02.1` |
| ZIP filename | `github-file-hider-YYYY.MM.DD.N.zip` | `github-file-hider-2026.10.02.1.zip` |

## Publication Workflow: Deferred Decision

The publication process will be defined when the extension is ready to publish. This document does not choose a release trigger or an automation workflow. Whether a release starts from a manual command, a Git tag, or a workflow action remains to be decided.
