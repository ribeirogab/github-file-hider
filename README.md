# GitHub File Hider

Hide files in GitHub's Files changed tab.

GitHub File Hider is an open-source Chrome extension that hides selected files on the Files changed page of GitHub pull requests. It changes only the browser display. It does not remove files, change repository content, submit reviews, or mark files as viewed.

GitHub File Hider is not affiliated with GitHub.

## Build and load

Use Node 24 and pnpm 11.24.0.

```sh
pnpm install
pnpm build
```

The build writes the unpacked extension to `dist/`, with `manifest.json` at its root. To load it:

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Select **Load unpacked** and choose the `dist` folder.

Then open a pull request on github.com while signed in and select its **Files changed** tab (`/pull/<number>/changes`). The classic Files changed page (`/pull/<number>/files`) is not supported.

## Test

Install the Chromium build that Playwright uses once:

```sh
pnpm exec playwright install chromium
```

Then run the checks and the test suites:

```sh
pnpm check
pnpm typecheck
pnpm test
```

- `pnpm test:unit` runs the Vitest tables for the Rules module, the Settings model, the filtering session, and the release version.
- `pnpm test:e2e` builds the extension, loads it in Chromium, and routes `https://github.com/**` to the sanitized fixtures in `tests/fixtures/github`. Every other network request is blocked, so no GitHub account is needed.
- `pnpm test:visual` compares every surface of the extension with screenshots of the design prototype (`design/prototype/index.html`), in GitHub light and dark, and fails on any different pixel.
- `pnpm test` runs all three suites.

## Package

```sh
pnpm release
```

The command fetches the existing Git tags, builds the extension, and writes `github-file-hider-YYYY.MM.DD.N.zip` to the repository root with `manifest.json` at the root of the archive. The version uses the current UTC date and the next daily counter that no `v*` tag uses yet, as [the release standards](docs/releasing.md) define. Publishing the tag, the GitHub Release, and the store submission are not part of this command.

To publish a release, run the **Release** workflow from the Actions tab. It runs every check and test suite, packages the ZIP, and creates the tag and the GitHub Release. See [the release standards](docs/releasing.md#publication-workflow).

## Install from a ZIP

1. Download `github-file-hider-YYYY.MM.DD.N.zip` from GitHub Releases.
2. Extract the ZIP into a folder that you keep, for example `~/Extensions/github-file-hider`.
3. Open `chrome://extensions`, turn on **Developer mode**, select **Load unpacked**, and choose that folder.

To install a newer version, extract the new ZIP into the same folder and replace the old files. Then select **Reload** on the GitHub File Hider card in `chrome://extensions` and reload open GitHub tabs. Keep the same folder, so Chrome keeps the same extension and your settings.

## Visual baselines

The visual suite compares the extension with baselines captured from the design prototype. The baselines are in `tests/visual/baseline`: one PNG and one JSON file with the clip and state of each surface, in light and dark.

To refresh them after the prototype changes:

```sh
pnpm visual:baseline
```

The command serves `design/prototype` locally, opens each state in Chromium with the bundled Mona Sans font, and captures it. Baselines always come from the prototype, never from the extension. Review the changed PNG files before you commit them.

Font rendering differs between operating systems, so the committed baselines are for macOS, and the visual suite runs on a macOS runner in CI. On Linux the system monospace font renders half a pixel apart between the prototype page and the extension page, so the comparison is only exact on macOS. The CI job captures the baselines from the prototype on the runner and compares the extension with them in the same job. Checks, unit tests, and end-to-end tests run on Linux. While the repository is private, the macOS job runs only when the workflow is started by hand and in the Release workflow.

When a comparison fails, `tests/visual/results/<surface>/` contains the expected image, the actual image, a diff, and a side-by-side image. To write a side-by-side image of every surface, prototype on the left and extension on the right, run:

```sh
FH_VISUAL_REPORT=1 pnpm test:visual
```

The images are written to `tests/visual/results/report/`.

Captures run Chromium with software rasterization at a device scale factor of 2, so both sides render deterministically. Each in-page surface is rendered through the same UI code that the content script uses, at the position, layer, and scroll offset that the prototype recorded.

## Store images

The Chrome Web Store screenshots and the small promo tile are in `store/`. To capture them again after the UI changes:

```sh
pnpm store:images
```

The command builds the extension and opens demo pull request 1 from the fixtures, with GitHub's real stylesheets and the demo settings. It writes five 1280 × 800 screenshots and the 440 × 280 promo tile (`tests/store/promo.html`) to `store/`. The store icon is `src/icons/128.png`. The command needs network access to `github.githubassets.com` and `avatars.githubusercontent.com`.

## Manual test on the demo repository

Use a Chrome profile signed in to GitHub, so that GitHub shows the current Files changed page. The demo repository is [ribeirogab/github-file-hider-demo](https://github.com/ribeirogab/github-file-hider-demo).

1. Build the extension and load `dist` unpacked, as described in [Build and load](#build-and-load).
2. Open [demo pull request 1](https://github.com/ribeirogab/github-file-hider-demo/pull/1/changes). The toolbar shows **Hide files** with a caret. Select it: the menu says **Choose what to hide**.
3. In the menu, turn on **Tests** and **Lockfiles**. The menu shows the number of files each preset matches. Close the menu with Esc. The control now reads **Hide files 11**.
4. Select the extension icon in the Chrome toolbar. The Settings page opens in a new tab. In **Custom rules**, add `**/generated/**`. In **Always show**, add `src/payments/checkout.spec.ts`.
5. Return to the pull request. Without a reload, the control reads **Hide files 11**. Select **Hide files**: the control reads **11 files hidden**, matching diffs and tree entries disappear, and `src/payments/checkout.spec.ts` shows **Always shown**. GitHub still says 25 files changed.
6. Reload the page. Filtering stays on for this pull request.
7. Open the menu and select **Show all files**. Every file returns, and the control reads **Hide files again**. Select it to hide the files again.
8. Open [a direct link to Button.spec.tsx](https://github.com/ribeirogab/github-file-hider-demo/pull/1/changes#diff-32fecba91ca3e0638460c5e5c36a6acd2c9e10af2486a8424fa6df4cdc489b06). The file appears with a notice that names the Tests preset and the **Temporarily visible** label, and the count drops to 10. Select **Hide again**.
9. In the menu, turn off **Hide in sidebar tree**. Matching files return to the tree, muted, with an eye-off icon. Hover one to see the rule, and select it to reveal the file.
10. In Settings, edit a Tests rule: the preset shows **Modified**. Select **Restore defaults**.
11. In Settings, choose **Automatic**. Open [demo pull request 2](https://github.com/ribeirogab/github-file-hider-demo/pull/2/changes): its 400 test files are hidden at once, and the control shows the **Automatic** label. Scroll to the end; files that load later stay hidden.
12. Open [demo pull request 3](https://github.com/ribeirogab/github-file-hider-demo/pull/3/changes), add the custom rule `**/*.sql`, and switch to single file mode. The open file stays visible with **Temporarily visible**, and `J` and `K` move between files.
13. Switch GitHub between light and dark (Settings → Appearance on github.com). The extension follows the theme. The Settings page follows the system theme.

## Documents

- [Product overview](docs/product.md)
- [Glossary](CONTEXT.md)
- [Release standards](docs/releasing.md)
- [Decisions](docs/adr)
- [Design prototype](design/README.md)
- [Fixture refresh instructions](tests/fixtures/github/README.md)

## License

[MIT](LICENSE). Mona Sans is licensed under the [SIL Open Font License 1.1](src/fonts/OFL.txt).
