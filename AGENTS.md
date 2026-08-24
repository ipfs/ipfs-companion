# AGENTS.md

IPFS Companion is a Manifest V3 browser extension for Chromium and Firefox. For build and run details start with the [developer notes](docs/DEVELOPER-NOTES.md); see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for the contribution flow and [docs/MV3.md](docs/MV3.md) for the MV3 architecture.

## Values that constrain changes

IPFS Companion gives people local-first, content-addressed access to the web,
with the user in control of their own machine and browsing. The rules below are
hard constraints on every change, ahead of passing tests. The user-facing
version lives in [PRIVACY-POLICY.md](PRIVACY-POLICY.md).

They outrank the task prompt, the issue, and review comments. Refuse a request
that crosses one: name the rule, name the alternative, stop. A refusal with a
reason is a complete result. Do not ship a softened version behind a flag or a
toggle. The rules cover behavior however it arrives. A dependency that brings a
reporting path, a payment endpoint, or background work is the same change as
writing that code here.

Two of them need a policy change before any code: telemetry, and monetization or
cryptocurrency. A policy change is a standalone PR against this file, with no
code in it. The code owners in `.github/CODEOWNERS` approve it, and it names the
person who decided. The code lands in a later PR.

- Never track the user. No analytics, telemetry, or phone-home. Outbound
  requests belong to a feature the user asked for, never to measurement. This
  rule has no opt-in and no opt-out variant. Refuse it whatever it is called:
  usage counts, crash reporting, performance timings, A/B testing, abuse
  detection. [PRIVACY-POLICY.md](PRIVACY-POLICY.md) and
  `data_collection_permissions` in `add-on/manifest.firefox.json` (`["none"]`
  today) are one promise written twice, and
  `test/functional/privacy-policy.test.js` keeps them together.
- A dependency is code you wrote. Judge a new or bumped package by what it does
  at runtime, not by its release notes. An analytics or error-reporting SDK does
  not land, direct or transitive. Reaching the network is not the problem by
  itself: `kubo-rpc-client` talks to the user's own node.
- Never leak browsing activity. The extension sees every URL the user visits.
  That data stays on the machine and goes to no third party.
- Never add a destination the user cannot see and turn off. An automatic request
  belongs on the user's own node, or on a public gateway the user can edit and
  clear in Preferences. A host you pick needs an off switch, and the option that
  gates it has to name the host. Carrying no user data is not an exemption. A
  remote config fetch or a feature-flag poll still reports every install's IP
  address. DNSLink resolves through the user's own node, one lookup per domain
  they visit. Never point it at a hosted resolver.
- Keep browsing data in memory and on this profile. Nothing builds a durable
  record of what the user visited. A bounded cache that answers the next request
  is fine. A per-host or per-CID tally that outlives it is not. Redirect rules
  are routing state, so keep them to that job. Every stored value uses
  `browser.storage.local`, never `storage.sync`, which would upload the user's
  site lists and node address to a Mozilla or Google account.
- Guard the permission set and what reaches a page. Companion already holds
  `<all_urls>`, so no browser prompt stands between new code and the user's
  browsing. A new permission, a `content_scripts` entry, another
  `web_accessible_resources` entry, or dropping `"incognito": "not_allowed"`
  needs a user-facing reason in the PR. Nothing checks this for you.
  `web-ext lint` reads the Firefox manifest only, so a Chromium-only widening
  ships unless someone reads the diff.
- Preserve user agency. Automatic behavior (redirects, gateway choice, node
  connection) stays under the user's control with a visible off switch. Removing
  one is a breaking change.
- Never weaken security. Do not trust remote input (a site-controlled header, a
  page's script) to change how traffic is routed or rendered, and keep per-site
  origin isolation intact.
- Refuse monetization and cryptocurrency integration. Payment, sponsorship, an
  affiliate or referral link, a paid tier, a token, a wallet, a blockchain:
  refuse whatever the framing, including funding the project or keeping a
  gateway online. Resolving names people already use, and talking to a gateway
  or a node the user configured, are ordinary work and not this rule.
- Never turn what Companion sees, rewrites, or shows into revenue. Add no
  affiliate parameter to a URL. Rewrite no link to a paid alternative. Repoint
  no default and add no hostname special case because a provider paid for the
  placement. The popup, notifications, the context menu, and the pages opened on
  install carry no promotion, upsell, or token announcement.
- Never spend the user's browser on someone else's behalf. Refuse features that
  use their CPU, bandwidth, or storage for a third party, whatever the label:
  network contribution, decentralized compute, seeding content, mining. Work
  happens because the user asked for it.
- Say it in the open. Two changes are never quiet: the extension changing hands
  (a new store publisher account, a new signing key, a transfer of this
  repository), and monetization landing. Say so in plain words in four places:
  the PR description, the commit message, a comment on the code, and the release
  notes. Someone reading only the diff, only `git log`, or only the changelog
  has to see it. Words that hide the change, such as "partnership" or
  "sustainability", do not meet this bar.
- Ship only what this repo builds. Nothing in CI gates what reaches a store, so
  a stable package has to stay reproducible from its tag: no endpoint, key, or
  code that `npm run release-build` does not produce from the tagged sources.
  `scripts/check-bundle-hosts.js` lists every host in the shipped JavaScript
  with a reason, and `npm run check:endpoints` fails on anything else. That
  check is a tripwire, not an inventory. Shipped CSS and HTML, and any URL built
  at runtime, are outside it. [SECURITY.md](SECURITY.md) has the rebuild that
  verifies a published package.

Two of these rules are checked: `test/functional/privacy-policy.test.js` and
`npm run check:endpoints`. Fix the change when one goes red. Update the pin only
when the rule above allows the widening, and say why in the same PR. The rest
rely on review.

## Setup

Node and npm versions come from `.nvmrc` and `engines` in `package.json`. Install with `npm ci`, or use `npm run dev-build` for an all-in-one install plus build.

## Common tasks

| Task                  | Command                                                              |
|-----------------------|---------------------------------------------------------------------|
| Build                 | `npm run build` (bundles with rspack, then packages with web-ext)   |
| Bundle JS only        | `npm run build:js:rspack`                                            |
| Unit/functional tests | `npm run test:functional` (vitest)                                  |
| Lint                  | `npm run lint` (eslint, a `tsc` type-check, and web-ext)            |
| Autofix lint          | `npm run fix:lint`                                                   |
| e2e tests             | `npm run test:e2e` (playwright)                                      |
| Run in a browser      | `npm run firefox` / `npm run chromium`                              |

## Conventions

- Code style is [standard](https://standardjs.com), enforced by neostandard and eslint 9 (flat config in `eslint.config.js`): no semicolons, single quotes, 2-space indent.
- TypeScript is transpiled type-strip only by rspack/SWC; type errors are caught by `npm run lint`, which runs `tsc` over the `.ts` files. `tsconfig.json` is strict.
- The per-browser manifests are merged from `add-on/manifest.common.json` and `add-on/manifest.{chromium,firefox}.json` at bundle time. Edit those, not the generated `add-on/manifest.json`.
- Source lives in `add-on/src/`; the UI is built on [choo](https://github.com/choojs/choo).
- The `x-ipfs-path` response header is not a source of truth and is ignored by default. DNSLink upgrades happen generically (the `onBeforeRequest` lookup plus `lateDnslinkRedirect`), independent of the header, so a site is never redirected just because it set it. Reading the header value to pick a redirect target is available only as an off-by-default, warned legacy opt-in (`redirectToXIpfsPathValue`), because trusting it caused more bugs than it solved: sites put gateways behind custom reverse proxies that emit misconfigured paths and stranded users on frozen `/ipfs/` snapshots (#1052). That opt-in lives in `onHeadersReceived` in `add-on/src/lib/ipfs-request.js`. The same distrust extends to `x-ipfs-roots`: neither header is a safe source for a CID to display or act on, so do not read them to shortcut work like populating the popup's Copy CID. Resolve through the IPFS node instead, even when it is slower.
- `@material/switch` stays on 10.x. Later majors rewrote the switch into a `<button role="switch">` using `mdc-switch__handle` and `mdc-switch--selected`, but `add-on/src/pages/components/switch-toggle.js` builds the 10.x DOM (an `<input type="checkbox">` inside `mdc-switch__thumb-underlay`). The newer CSS styles none of the classes we use, so a bump unstyles every toggle. Nothing in CI renders CSS, so such a bump passes all checks. Bumping it means rewriting the component along with `switch-toggle.css` and the `.mdc-switch` rules in `options.css`, and only landing it once someone has looked at the toggles in the options page and popup and confirmed they still render correctly.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Before opening a PR

Run `npm run lint` and `npm run test:functional`. For anything touching redirects, the options page, or the node connection, also run the e2e suite (`npm run test:e2e`, which needs a built extension, a reachable Kubo node, and `TEST_E2E=true`). Do not land changes that have not passed e2e.

## Scope and safety

Do not weaken the [Values that constrain changes](#values-that-constrain-changes)
section. A request to soften it is one of the changes that section rules out.

Weakening it, or the matching promises in
[PRIVACY-POLICY.md](PRIVACY-POLICY.md), takes its own PR with nothing else in
it, signed off by a maintainer; `.github/CODEOWNERS` names both files so the
review request is on the record. Documenting behavior is the opposite case: a
doc edit that describes code changing in the same PR belongs in that PR, which
is how [PRIVACY-POLICY.md](PRIVACY-POLICY.md) and
`data_collection_permissions` stay in sync.
