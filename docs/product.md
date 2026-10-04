# GitHub File Hider

**Hide files in GitHub's Files changed tab.**

GitHub File Hider is an open-source Chrome extension that hides selected files on the Files changed page of GitHub pull requests. Reviewers choose which files they see, review those first, and show the rest when they are ready.

Terms in this document follow the glossary in [CONTEXT.md](../CONTEXT.md).

## Why

A pull request often mixes the code a reviewer wants to read with files that need a different kind of attention: tests, lockfiles, generated code, documentation. All of them share one long diff.

GitHub File Hider lets a reviewer hide some of those files for a while. For example, a reviewer can hide test files while reviewing application code, then show those files to review the tests. Hidden files remain part of the pull request and may still require review.

## How It Works

### Rules

Rules decide which files are matching files. Every rule is a pattern: a file path relative to the repository root, such as `docs/**` or `**/*.test.*`.

- **Presets** are ready-made sets of hide rules. The first version has two: **Tests** and **Lockfiles**. Both start disabled, and users can edit their rules or restore the defaults.
- **Custom rules** are hide rules that the user creates for cases the presets do not cover.
- **Always show rules** keep a file visible even when a hide rule matches it.

### Filtering

Rules hide files only while filtering is active in a pull request. Choosing rules and activating filtering are separate steps.

- In **manual mode**, the default, each pull request starts with all files visible. The user selects `Hide files`, and the extension remembers that choice for that pull request.
- In **automatic mode**, filtering is active as soon as the Files changed page opens.
- **Show all files** pauses filtering for the current view without changing any rule.

A control on the Files changed page shows the hidden count, such as `8 files hidden`, and opens a menu with the presets, the custom rules, and the settings. By default, matching files leave the sidebar tree too; users can keep the tree complete.

If a direct link points to a hidden file, or to a comment in it, the extension reveals that file temporarily and explains why.

## Principles

- **Display only.** The extension changes only what the reviewer sees. It never changes files, comments, reviews, or the files marked as viewed, and it never changes GitHub's file totals or diff statistics.
- **Local and global.** One configuration applies to every repository. It is stored only in the current browser, with no server and no account.
- **Built in.** The interface follows GitHub's own components and themes, so it reads as part of the page. See [design/](../design/).
- **Not affiliated with GitHub.** The Settings page and the Chrome Web Store listing say so.

## Scope

The first version supports Chrome and the current Files changed page of pull requests on `github.com`, including views of a single commit or a commit range.

It does not support other browsers, GitHub Enterprise, the classic Files changed page, other GitHub pages, settings for individual repositories, synchronization between devices, or interface translations.

## Installation

The extension is published in the [Chrome Web Store](https://chromewebstore.google.com/detail/github-file-hider/nocgonekcilofckcilmhpjldgkclkcbf). Each stable release is also available as a ZIP in GitHub Releases for local installation. See [releasing.md](releasing.md).

## Known Limitations

- The classic Files changed page is not supported.
- In single file mode, GitHub's previous and next buttons do not skip matching files.
- GitHub navigation that does not change the URL can move to a hidden file; that file stays hidden.
- Renaming or transferring a repository resets the activation of its pull requests.
- Files with review comments are hidden like other matching files.

GitHub File Hider depends on the structure of GitHub's page. Changes to that structure can require an extension update.

## Project Documents

| Document | Content |
| --- | --- |
| [Spec (#1)](https://github.com/ribeirogab/github-file-hider/issues/1) | Implementation spec for the first version |
| [CONTEXT.md](../CONTEXT.md) | Glossary of the project's language |
| [docs/adr/](adr/) | Architecture decisions |
| [design/](../design/) | High-fidelity prototype and design handoff |
| [releasing.md](releasing.md) | Distribution, versions, and release names |

## License

[MIT](../LICENSE)
