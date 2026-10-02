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
