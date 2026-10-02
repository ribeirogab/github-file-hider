# GitHub page fixtures

Sanitized copies of GitHub's Files changed page. The end-to-end tests serve them in place of github.com. They come from the public demo repository [ribeirogab/github-file-hider-demo](https://github.com/ribeirogab/github-file-hider-demo), captured while signed in on 2026-10-02.

Each fixture is the rendered DOM of the page, gzipped. GitHub's scripts are removed, so the page is static: tests replay dynamic behavior by switching between fixtures of the same page.

## Fixtures

| Fixture | Source URL | What it covers |
| --- | --- | --- |
| `pr1-changes` | `/pull/1/changes` | 25 files with every diff rendered: tests, lockfiles, generated code, docs, a renamed file (`src/__tests__/format-helpers.ts` → `src/utils/format-helpers.ts`), a deleted file (`src/legacy/old-checkout.spec.ts`), a path with a space (`docs/release notes.md`), and a review comment on `src/components/Button.spec.tsx` |
| `pr1-commit` | `/pull/1/changes/e398fbd…` | Single-commit view (8 test files) |
| `pr1-range` | `/pull/1/changes/e3caccf…..b4877d0…` | Commit-range view (19 files) |
| `pr1-conversation` | `/pull/1` | Conversation tab, the start point for navigation to Files changed without a full page load |
| `pr1-classic` | `/pull/1/files`, signed out | The classic Files changed page |
| `pr2-changes` | `/pull/2/changes` | 800 files, first render: complete sidebar tree, about 10% of the diff lines rendered |
| `pr2-changes-scrolled` | `/pull/2/changes` | The same page after scrolling to the end: every diff rendered |
| `pr3-optimized` | `/pull/3/changes` | 330 files and about 150,000 lines: the view optimized for large pull requests, with `Load Diff` placeholders |
| `pr3-single-file` | `/pull/3/changes?mode=single` | Single file mode on the first file |
| `pr3-single-file-next` | `/pull/3/changes?mode=single` | Single file mode after `J` (next file) |

## Findings

- The tab label is "Files changed". Routes: `/pull/<number>/changes`, `/changes/<sha>`, `/changes/<from>..<to>`, and `?mode=single` for single file mode.
- The sidebar tree lists every file before the diffs render. In `pr2-changes` the tree has all 800 files while about 10% of the diff lines exist.
- Each file block is `div#diff-<sha256 of path>`. A renamed file uses its new path, a deleted file its old path, and a path with spaces is hashed as is.
- A review comment has no element id in the diff. `#r<id>` resolves through the page's embedded JSON, where the comment's `databaseId` sits next to its file.
- Class names are hashed CSS-module names, such as `Diff-module__diff__rx9XH`. Do not select elements by them.
- 800 small files render progressively and stay mounted after scrolling. About 150,000 lines open the optimized view, which links to single file mode. In single file mode, `J` and `K` move between files and change the URL hash to the new file's anchor.

## Sanitization

Scripts, tokens, CSRF values, nonces, session values, and analytics identifiers are removed or replaced with `REDACTED`, including inside `<template>` elements. Public data stays: the repository, the pull requests, and the author's public username.

## Refresh

1. Sign in to GitHub in a Chromium-based browser and open the source URL of the fixture.
2. For `pr1-changes` and `pr2-changes-scrolled`, scroll to the end of the page. For `pr3-single-file-next`, press `J`.
3. Paste `scripts/capture-fixture.js` into the DevTools console, run `captureFixture("<fixture>")`, and select the yellow download link.
4. Run `pnpm fixtures:sanitize <downloaded files>`. It removes scripts and secrets, refuses a file that still looks like it contains a secret, and writes `<fixture>.html.gz` to this directory.
5. Delete the downloaded originals.

For `pr1-classic`, download the page signed out with `curl` and sanitize it the same way.
