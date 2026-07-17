# AGENTS.md

IPFS Companion is a Manifest V3 browser extension for Chromium and Firefox. For build and run details start with the [developer notes](docs/DEVELOPER-NOTES.md); see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for the contribution flow and [docs/MV3.md](docs/MV3.md) for the MV3 architecture.

## Setup

Node and npm versions come from `.nvmrc` and `engines` in `package.json`. Install with `npm ci`, or use `npm run dev-build` for an all-in-one install plus build.

## Common tasks

| Task                  | Command                                                              |
|-----------------------|---------------------------------------------------------------------|
| Build                 | `npm run build` (bundles with rspack, then packages with web-ext)   |
| Bundle JS only        | `npm run build:js:rspack`                                            |
| Unit/functional tests | `npm run test:functional` (vitest)                                  |
| Coverage              | `npm run test:coverage`                                              |
| Lint                  | `npm run lint` (eslint, a `tsc` type-check, and web-ext)            |
| Autofix lint          | `npm run fix:lint`                                                   |
| e2e tests             | `npm run test:e2e` (playwright)                                      |
| Run in a browser      | `npm run firefox` / `npm run chromium`                              |

## Conventions

- Code style is [standard](https://standardjs.com), enforced by neostandard and eslint 9 (flat config in `eslint.config.js`): no semicolons, single quotes, 2-space indent.
- TypeScript is transpiled type-strip only by rspack/SWC; type errors are caught by `npm run lint`, which runs `tsc` over the `.ts` files. `tsconfig.json` is strict.
- The per-browser manifests are merged from `add-on/manifest.common.json` and `add-on/manifest.{chromium,firefox}.json` at bundle time. Edit those, not the generated `add-on/manifest.json`.
- Source lives in `add-on/src/`; the UI is built on [choo](https://github.com/choojs/choo).
- The `x-ipfs-path` response header is a hint, not a source of truth. Treat its presence as an opaque boolean, the site signalling it is hosted on IPFS, and never read its value to decide what content path to load or where to redirect. Redirect only when the host has a DNSLink, and only to the mutable `/ipns/<host>` address derived from the URL. Trusting the value caused more bugs than it solved: sites put gateways behind custom reverse proxies that emit misconfigured paths and stranded users on stale `/ipfs/` snapshots (#1052). Handling lives in `onHeadersReceived` in `add-on/src/lib/ipfs-request.js`.
- `@material/switch` stays on 10.x. Later majors rewrote the switch into a `<button role="switch">` using `mdc-switch__handle` and `mdc-switch--selected`, but `add-on/src/pages/components/switch-toggle.js` builds the 10.x DOM (an `<input type="checkbox">` inside `mdc-switch__thumb-underlay`). The newer CSS styles none of the classes we use, so a bump unstyles every toggle. Nothing in CI renders CSS, so such a bump passes all checks. Bumping it means rewriting the component along with `switch-toggle.css` and the `.mdc-switch` rules in `options.css`, and only landing it once someone has looked at the toggles in the options page and popup and confirmed they still render correctly.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Before opening a PR

Run `npm run lint` and `npm run test:functional`. For anything touching redirects, the options page, or the node connection, also run the e2e suite (`npm run test:e2e`, which needs a built extension, a reachable Kubo node, and `TEST_E2E=true`). Do not land changes that have not passed e2e.
