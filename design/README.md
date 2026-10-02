# Design prototype

High-fidelity prototype of GitHub File Hider. It is the design reference for development and implements the behavior defined in [docs/product.md](../docs/product.md). Terms follow the glossary in [CONTEXT.md](../CONTEXT.md).

## Open it

Open `design/prototype/index.html` in Chrome. No build step or server is needed.

## Screens

The yellow bar at the top belongs to the prototype, not to the design. Use it to change screens:

- **Pull request**: a replica of the Files changed tab of a pull request, with the extension's control injected.
- **Settings page**: the extension settings page.
- **Handoff**: design tokens, component states, injection points, keyboard notes, and the copy deck.

Use **Light** and **Dark** to change GitHub's theme. Use **Scenarios** to:

- Load more files.
- Open a direct link to a hidden file, or to a comment in a hidden file.
- Reload the pull request, or open another pull request (#483).
- Switch between manual and automatic mode.
- Load the demo configuration, or reset to first install.

The demo configuration enables the Tests and Lockfiles presets, the custom rule `**/generated/**`, and the Always show rule `src/payments/checkout.spec.ts`. The custom rule `docs/**` exists but is disabled. With this configuration, 10 of 22 files match.

## Files

| File | Purpose |
| --- | --- |
| `prototype/index.html` | Injected UI, settings page, and handoff |
| `prototype/lib/engine.js` | Reference rule engine: pattern matching, rule priority, activation per pull request, and the hidden-file count |
| `prototype/lib/gh.js`, `prototype/lib/gh.css` | Replica of GitHub's Files changed page |
| `prototype/lib/data.js` | Demo pull request with 22 changed files |
| `prototype/lib/proto.js`, `prototype/lib/proto.css` | Prototype bar |

## Notes

- Settings are saved in the browser's `localStorage`.
- The GitHub replica is a mock for design work. It uses no GitHub logos, and this project is not affiliated with GitHub.
- The prototype is excluded from Biome checks.
