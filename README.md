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

When a comparison fails, `tests/visual/results/<surface>/` contains the expected image, the actual image, a diff, and a side-by-side image.

## Documents

- [Product overview](docs/product.md)
- [Glossary](CONTEXT.md)
- [Release standards](docs/releasing.md)
- [Decisions](docs/adr)
- [Design prototype](design/README.md)
- [Fixture refresh instructions](tests/fixtures/github/README.md)

## License

[MIT](LICENSE). Mona Sans is licensed under the [SIL Open Font License 1.1](src/fonts/OFL.txt).
