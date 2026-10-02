# GitHub File Hider

Hide files in GitHub's Files changed tab. A Chrome Manifest V3 extension with local settings and no server. GitHub File Hider is not affiliated with GitHub.

## Build and load

Use Node 24 and pnpm 11.24.0:

```sh
pnpm install
pnpm build
```

Open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose the `dist` folder. Sign in to GitHub and open a pull request's current **Files changed** page (`/pull/<number>/changes`). The classic `/files` page is not supported.

## Test

```sh
pnpm exec playwright install chromium
pnpm check
pnpm typecheck
pnpm test
```

`pnpm test:unit` runs Vitest. `pnpm test:e2e` builds and loads the extension in Chromium, routes github.com to sanitized fixtures, and blocks every other network request. No GitHub account is needed for these tests.

## Package and install a ZIP

```sh
pnpm release
```

The command fetches existing Git tags and produces `github-file-hider-YYYY.MM.DD.N.zip`. `manifest.json` is at the archive root. The version uses the current UTC date and the next unused daily counter from published `v*` tags. It refuses a version older than an existing release. Tag publication and store submission are outside this command.

Extract the ZIP into a folder. Open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose that folder.

To update a local installation, extract a newer ZIP into the same folder, replace the previous package files, and select **Reload** on the extension card. Reload open GitHub tabs. Keep the same folder to retain the Chrome extension identity and its local settings.

See [the product overview](docs/product.md), [release standards](docs/releasing.md), and [fixture refresh instructions](tests/fixtures/github/README.md).

## License

[MIT](LICENSE)

## Manual test on the demo repository

Use a Chrome profile signed in to GitHub, so GitHub opens the current Files changed page.

1. Build the extension, load `dist` unpacked, and open [demo pull request 1](https://github.com/ribeirogab/github-file-hider-demo/pull/1/changes).
2. Select the caret beside **Hide files**, then **Settings**. The Chrome toolbar extension icon opens the same Settings page.
3. Turn on **Tests** and **Lockfiles**. Add the custom rule `**/generated/**`. Add the Always show rule `src/payments/checkout.spec.ts`.
4. Return to the pull request. Select **Hide files**. The control should say **11 files hidden**; checkout stays visible with **Always shown**. GitHub's total stays at 25 files.
5. Open the control's menu and select **Show all files**. All files return. Select **Hide files again** to restore filtering. Reload to verify that manual activation remains.
6. Open [a direct link to Button.spec.tsx](https://github.com/ribeirogab/github-file-hider-demo/pull/1/changes#diff-32fecba91ca3e0638460c5e5c36a6acd2c9e10af2486a8424fa6df4cdc489b06R11). That file should be temporarily visible, with a notice that names the Tests preset. Other matching files stay hidden. Select **Hide again** to hide it and clear the link.
7. In Settings, choose **Automatic**. Open a different pull request; matching files should be hidden immediately. **Show all files** lasts until reload or leaving the pull request. Choose **Manual** again to use the saved manual activations.
8. Edit a preset rule, check **Modified**, then select **Restore defaults**. Changes should reach the open pull request without reloading.

The [800-file pull request](https://github.com/ribeirogab/github-file-hider-demo/pull/2/changes) and the [optimized large pull request](https://github.com/ribeirogab/github-file-hider-demo/pull/3/changes) are compatibility targets for the remaining large-pull-request ticket.

## Current validation gaps

The review-comment fixture includes the comment's JSON and line indicator, but no open comment body. The extension can reveal its file from `#r4168120910`; highlighting the opened comment awaits a signed-in capture of that state. Ticket #9 remains open. Tickets #10 (muted sidebar tree entries and selection) and #11 (large pull requests and single file mode) depend on #9 and are not complete.
