# IPFS Companion

> Upgrade your browser with [IPFS](https://ipfs.io/) super powers

![demo of v2.8.0](https://user-images.githubusercontent.com/157609/55318231-938ce480-5472-11e9-8624-b0021a34c1a4.gif)

[![](https://img.shields.io/github/release/ipfs/ipfs-companion.svg)](https://github.com/ipfs/ipfs-companion/releases/latest)
[![](https://img.shields.io/badge/mozilla-reviewed-blue.svg)](https://addons.mozilla.org/en-US/firefox/addon/ipfs-companion/)
[![i18n status](https://img.shields.io/badge/i18n-translated-blue.svg)](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/localization-notes.md)
[![build-status](https://flat.badgen.net/travis/ipfs-shipyard/ipfs-companion)](https://travis-ci.com/ipfs-shipyard/ipfs-companion)
[![codecov](https://codecov.io/gh/ipfs-shipyard/ipfs-companion/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs-shipyard/ipfs-companion)
[![#ipfs-in-web-browsers](https://img.shields.io/badge/irc-%23ipfs--in--web--browsers-808080.svg)](https://webchat.freenode.net/?channels=ipfs-in-web-browsers)

| <img src="https://unpkg.com/@browser-logos/firefox/firefox_16x16.png" width="16" height="16"> [Firefox](https://www.mozilla.org/firefox/new/) / [Firefox for Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox) | <img src="https://unpkg.com/@browser-logos/chrome/chrome_16x16.png" width="16" height="16"> [Chrome](https://www.google.com/chrome/) / <img src="https://unpkg.com/@browser-logos/brave/brave_16x16.png" width="16" height="16"> [Brave](https://brave.com/) / <img src="https://unpkg.com/@browser-logos/opera/opera_16x16.png" width="16" height="16"> [Opera](https://www.opera.com/)  / <img src="https://unpkg.com/@browser-logos/edge/edge_16x16.png" width="16" height="16"> [Edge](https://www.microsoftedgeinsider.com/)
|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [![Install From AMO](https://ipfs.io/ipfs/QmWNa64XjA78QvK3zG2593bSMizkDXXcubDHjnRDYUivqt)<br>![](https://img.shields.io/amo/users/ipfs-companion?label=AMO%20users&style=social)](https://addons.mozilla.org/firefox/addon/ipfs-companion/) | [![Install from Chrome Store](https://ipfs.io/ipfs/QmU4Qm5YEKy5yHmdAgU2fD7PjZLgrYTUUbxTydqG2QK3TT)<br>![](https://img.shields.io/chrome-web-store/users/nibjojkomfdiaoajekhjakgkdhaomnch?label=Chrome%20Web%20Store%20users&style=social)](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch) |

## Lead Maintainer

[Marcin Rataj](https://github.com/lidel)

## Table of Contents

- [Background](#background)
- [Features](#features)
- [Install](#install)
- [Contribute](#contribute)
- [Troubleshooting](#troubleshooting)
- [Privacy Policy](#privacy-policy)
- [License](#license)

## Background

This add-on enables everyone to access IPFS resources the way they were meant: from locally running IPFS node :-)

IPFS is a new hypermedia distribution protocol, addressed by content and identities.
IPFS enables the creation of completely distributed applications.
It aims to make the web faster, safer, and more open.

Learn more at [ipfs.io](https://ipfs.io) (it is really cool, we promise!)

## Features

### Automagical Detection of IPFS Resources

#### IPFS Path in URL

Requests for IPFS-like paths (`/ipfs/{cid}` or `/ipns/{peerid_or_host-with-dnslink}`) are detected on any website.  
If tested path is a [valid IPFS address](https://github.com/ipfs/is-ipfs) it gets redirected and loaded from a local gateway, e.g:  
> `https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`  
> → `http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`

#### DNSLink

Companion will detect presence of [DNSLink](https://docs.ipfs.io/guides/concepts/dnslink/) in DNS records of visited websites and redirect HTTP request to a local gateway.

> `http://docs.ipfs.io`  
> → `http://127.0.0.1:8080/ipns/docs.ipfs.io`

This means if you visit websites with a valid DNSLink (eg. https://docs.ipfs.io, https://ipld.io, http://tr.wikipedia-on-ipfs.org) browser will load them from IPFS.

More details: [DNSLink Support in IPFS Companion](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/dnslink.md)

#### X-Ipfs-Path

Companion will upgrade transport to IPFS if the header is found in any HTTP response headers. This is a fallback for edge cases when IPFS path is not present in URL.

More details: [`x-ipfs-path` Header Support in IPFS Companion](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/x-ipfs-path-header.md)

#### Redirect Opt-Out

It is possible to opt-out from Gateway redirect by:
- a) suspending redirect via global toggle (see [_Disable All Redirects_](#disable-all-redirects) below)
- b) suspending redirect for via per website opt-out (in [_Active Tab_ section of _Browser Action_](#disable-gateway-redirect-per-website) or _Preferences_)
- c) including `x-ipfs-companion-no-redirect` in the URL (as a [hash](https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR#x-ipfs-companion-no-redirect) or [query](https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?x-ipfs-companion-no-redirect) parameter).

<!-- TODO: restore after https://github.com/ipfs-shipyard/ipfs-companion/issues/843 is closed
### IPFS API as `window.ipfs`

Your IPFS node is exposed as `window.ipfs` on every webpage.
Websites can detect if `window.ipfs` exists and opt-in to use it instead of creating their own `js-ipfs` node.
It saves system resources and battery (on mobile), avoids the overhead of peer discovery/connection, enables shared repository access and more!
Make sure to read our [notes on `window.ipfs`](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/window.ipfs.md), where we explain it in-depth and provide examples on how to use it your own dapp.
-->

### Quick Toggles

The Browser Action pop-up provides handy toggles for often used operations.

#### Disable Gateway Redirect Per Website

> _Active Tab_ actions include option to opt-out current website from Gateway redirect of any IPFS subresources.    
> Disabling redirect for DNSLink website will restore original URL as well:
>
> ![per-site-opt-out](https://user-images.githubusercontent.com/157609/55317805-90452900-5471-11e9-9e0f-293afd261648.gif)

#### Disable All Redirects

> A handy toggle to disable all gateway redirects while keeping all other features enabled:
>
> ![redirect](https://user-images.githubusercontent.com/157609/55317804-90452900-5471-11e9-9fc1-42bee5b15a6a.gif)

#### Suspend IPFS Extension

> The "power" icon can be used to temporarily suspend all IPFS integrations
> (redirects, API status, content scripts, protocol handlers etc).
> Useful during testing. Extension can be re-enabled with a single click:
>
> ![screenshot of suspend toggle](https://user-images.githubusercontent.com/157609/55317803-8fac9280-5471-11e9-96e3-f068cc62148b.gif)

### IPFS Status and Context Actions

- IPFS API and Gateway status
- Add local (quick import) or remote files (context menu) to IPFS with option to preserve filename
- Easy access to [WebUI](https://github.com/ipfs/webui/) and add-on Preferences
- Toggle redirection to local gateway (automatic by default, manual mode can be enabled in Preferences)
- Additional actions for pages loaded from IPFS
    - Pin/Unpin of IPFS resources (via API)
    - Copy canonical IPFS address
    - Copy shareable URL to resource at preferred public gateway

### Experiments!

_(some are disabled by default, use Preferences screen to enable)_

- Requests made via [experimental protocols](https://github.com/ipfs/ipfs-companion/issues/164) are re-routed to HTTP gateway (public or custom):
    - `ipfs://$cid`
    - `ipns://$cid_or_fqdn`
    - `dweb:/ipfs/$cid`
    - `dweb:/ipns/$cid_or_fqdn`
- Make plaintext IPFS links clickable ([demo](https://ipfs.io/ipfs/bafybeidvtwx54qr44kidymvhfzefzxhgkieigwth6oswk75zhlzjdmunoy/linkify-demo.html))
- Switch between _External_ HTTP API and _Embedded_ js-ipfs node. Read about differences at [docs/node-types](docs/node-types.md).
  > [![screenshot of node type switch](https://user-images.githubusercontent.com/157609/42382479-b4d98768-8134-11e8-979c-69b758846bf0.png)](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/node-types.md)

## Install

### Release Channel

We recommend installing the stable release via your browser's add-on store.

| <img src="https://unpkg.com/@browser-logos/firefox/firefox_16x16.png" width="16" height="16"> [Firefox](https://www.mozilla.org/firefox/new/) / [Firefox for Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox) | <img src="https://unpkg.com/@browser-logos/chrome/chrome_16x16.png" width="16" height="16"> [Chrome](https://www.google.com/chrome/) / <img src="https://unpkg.com/@browser-logos/brave/brave_16x16.png" width="16" height="16"> [Brave](https://brave.com/) / <img src="https://unpkg.com/@browser-logos/opera/opera_16x16.png" width="16" height="16"> [Opera](https://www.opera.com/)  / <img src="https://unpkg.com/@browser-logos/edge/edge_16x16.png" width="16" height="16"> [Edge](https://www.microsoftedgeinsider.com/)
|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [![Install From AMO](https://ipfs.io/ipfs/QmWNa64XjA78QvK3zG2593bSMizkDXXcubDHjnRDYUivqt)<br>![](https://img.shields.io/amo/users/ipfs-companion?label=AMO%20users&style=social)](https://addons.mozilla.org/firefox/addon/ipfs-companion/) | [![Install from Chrome Store](https://ipfs.io/ipfs/QmU4Qm5YEKy5yHmdAgU2fD7PjZLgrYTUUbxTydqG2QK3TT)<br>![](https://img.shields.io/chrome-web-store/users/nibjojkomfdiaoajekhjakgkdhaomnch?label=Chrome%20Web%20Store%20users&style=social)](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch) |




**Note:** `ipfs-companion` is designed to retrieve content from a locally running IPFS daemon.  
Make sure [IPFS is installed](https://docs.ipfs.io/introduction/usage/) on your computer.

### Beta Channel

Developers and enthusiasts can opt-in for Beta-quality channel with hand-picked Dev Builds:

- Beta for Firefox: [Self-hosted Signed Dev Build](https://ipfs.io/ipfs/QmR8W5wg8BuAyBTruHnHovfWRavwvidVh3qtyinXi6NnLa)
- Beta for Chromium-based browsers: [Dev Build at Chrome Web Store](https://chrome.google.com/webstore/detail/ipfs-companion-dev-build/hjoieblefckbooibpepigmacodalfndh)

It is also possible to [grab the last successful build from `master`](https://ci.ipfs.team/job/IPFS%20Shipyard/job/ipfs-companion/job/master/lastSuccessfulBuild/),
but these builds are not signed nor will automatically update:
`.zip` bundles are meant only to be manually loaded via `chrome://extensions` (Chromium-based) or `about:debugging` (Firefox) for the purpose of quick smoke-testing.

## Development

To work on the extension you need to install it from source rather than from the add on store.

1. Clone https://github.com/ipfs-shipyard/ipfs-companion.git
2. Run all-in-one dev build:
    ```console
    $ npm run dev-build
    ```
3. Switch `add-on/manifest.json` to the browser of your choice:
    ```console
    $ npm run bundle:firefox # for Firefox (build default)
    OR
    $ npm run bundle:chromium # for Chromium-based browsers
    ```
4. Load it into browser:
    * Chromium-based
        1. Enter `chrome://extensions` in the URL bar
        2. Enable "Developer mode"
        3. Click "Load unpacked extension..."
        4. Pick the _directory_ `add-on`

    * Firefox
        1. Enter `about:debugging` in the URL bar
        2. Check "Enable add-on debugging"
        3. Click "Load Temporary Add-on"
        4. Pick the _file_ `add-on/manifest.json`

**See [`DEVELOPER-NOTES.md`](DEVELOPER-NOTES.md) for more detailed instructions**

### Reproducible Build in Docker

Want to ensure prebuilt bundle does not include any additional code?  
Don't want to install JS dependencies such as NodeJS and yarn?  

Do an isolated build inside of Docker!

Run the following command for ending up
with a built extension inside the `build/` directory:

```sh
npm run release-build
```

It is an alias for running `ci:build` script inside of immutable Docker image, which guarantees the same output on all platforms.

### Legacy Firefox (< 53) and XUL-Compatible Browsers

Legacy  versions `1.x.x` were based on currently deprecated Add-On SDK (Firefox-only).   
While it is not maintained anymore, one can inspect, build and install it using codebase from [legacy-sdk](https://github.com/ipfs/ipfs-companion/tree/legacy-sdk) branch.    
For historical background on the rewrite see [Issue #20: Move to WebExtensions](https://github.com/ipfs/ipfs-companion/issues/20).

## Contribute

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](CONTRIBUTING.md)

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/ipfs-companion/issues)!

If you want to help in developing this extension, please see [CONTRIBUTING](CONTRIBUTING.md) page :sparkles:

The browser extension team hangs out at the [#ipfs-in-web-browsers](https://webchat.freenode.net/?channels=ipfs-in-web-browsers) channel on Freenode.

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

### TROUBLESHOOTING

The best place to ask your questions about IPFS in general, how it works and what you can do with it is at [discuss.ipfs.io](https://discuss.ipfs.io/).  
We are also available at the [#ipfs](https://webchat.freenode.net/?channels=ipfs) channel, where most of IPFS community hangs out.

Questions specific to this browser companion can be asked directly at [`#ipfs-in-web-browsers`](https://webchat.freenode.net/?channels=ipfs-in-web-browsers)

#### Import via Right-Click Does Not Work in Firefox

See [this workaround](https://github.com/ipfs/ipfs-companion/issues/227).

#### Workaround for HTTP Redirect to Work with Ghostery

[Ghostery](https://addons.mozilla.org/en-US/firefox/addon/ghostery/) is known to toy with HTTP-to-HTTPS redirect, which in some setups breaks websites utilizing public gateways. More details in [#466](https://github.com/ipfs-shipyard/ipfs-companion/issues/466). Until it is fixed upstream, a workaround is to [whitelist](https://user-images.githubusercontent.com/157609/39089525-5834c104-45c9-11e8-9e17-4459a97e5676.png) affected site.

#### Rule to Work with NoScript with ABE Enabled

By default [NoScript](https://addons.mozilla.org/en-US/firefox/addon/noscript/) breaks this addon by blocking assets loaded from IPFS Gateway running on localhost.    
To make it work, one needs to extend the SYSTEM Rulset and prepend it with IPFS whitelist:

```
# Enable IPFS redirect to LOCAL
Site ^http://127.0.0.1:8080/(ipfs|ipns)*
Anonymize

# Prevent Internet sites from requesting LAN resources.
Site LOCAL
Accept from LOCAL
Deny
```

Feel free to modify it, but get familiar with [ABE rule syntax](https://noscript.net/abe/abe_rules.pdf) first.

## Privacy Policy

See [`PRIVACY-POLICY.md`](PRIVACY-POLICY.md)

## License

[IPFS logo](https://github.com/ipfs/logo) belongs to [The IPFS Project](https://github.com/ipfs) and is licensed under a <a rel="license" href="https://creativecommons.org/licenses/by-sa/3.0/legalcode">CC-BY-SA 3.0</a>.

[is-ipfs](https://github.com/xicombd/is-ipfs), [js-multihash](https://github.com/jbenet/js-multihash) and other NPM dependencies are under MIT license, unless stated otherwise.

The add-on itself is released under [CC0](LICENSE): to the extent possible under law, the author has waived all copyright and related or neighboring rights to this work, effectively placing it in the public domain.
