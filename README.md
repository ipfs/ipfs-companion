# IPFS Companion
**Harness the power of [IPFS](https://ipfs.io/) in your browser**

[![](https://img.shields.io/github/release/ipfs/ipfs-companion.svg)](https://github.com/ipfs/ipfs-companion/releases/latest)
[![](https://img.shields.io/badge/mozilla-reviewed-blue.svg)](https://addons.mozilla.org/en-US/firefox/addon/ipfs-companion/)
[![i18n status](https://img.shields.io/badge/i18n-translated-blue.svg)](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/LOCALIZATION-NOTES.md)
[![build-status](https://flat.badgen.net/travis/ipfs-shipyard/ipfs-companion)](https://travis-ci.com/ipfs-shipyard/ipfs-companion)
[![codecov](https://codecov.io/gh/ipfs-shipyard/ipfs-companion/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs-shipyard/ipfs-companion)
[![#ipfs-in-web-browsers](https://img.shields.io/badge/irc-%23ipfs--in--web--browsers-808080.svg)](https://webchat.freenode.net/?channels=ipfs-in-web-browsers)

![demo of v2.8.0](https://user-images.githubusercontent.com/157609/55318231-938ce480-5472-11e9-8624-b0021a34c1a4.gif)



| <img src="https://unpkg.com/@browser-logos/firefox/firefox_16x16.png" width="16" height="16"> [Firefox](https://www.mozilla.org/firefox/new/) \| [Firefox for Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox) | <img src="https://unpkg.com/@browser-logos/chrome/chrome_16x16.png" width="16" height="16"> [Chrome](https://www.google.com/chrome/) \| <img src="https://unpkg.com/@browser-logos/brave/brave_16x16.png" width="16" height="16"> [Brave](https://brave.com/) \| <img src="https://unpkg.com/@browser-logos/opera/opera_16x16.png" width="16" height="16"> [Opera](https://www.opera.com/)  \| <img src="https://unpkg.com/@browser-logos/edge/edge_16x16.png" width="16" height="16"> [Edge](https://www.microsoftedgeinsider.com/)
|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [![Install From AMO](https://ipfs.io/ipfs/QmWNa64XjA78QvK3zG2593bSMizkDXXcubDHjnRDYUivqt)<br>![](https://img.shields.io/amo/users/ipfs-companion?label=AMO%20users&style=social)](https://addons.mozilla.org/firefox/addon/ipfs-companion/) | [![Install from Chrome Store](https://ipfs.io/ipfs/QmU4Qm5YEKy5yHmdAgU2fD7PjZLgrYTUUbxTydqG2QK3TT)<br>![](https://img.shields.io/chrome-web-store/users/nibjojkomfdiaoajekhjakgkdhaomnch?label=Chrome%20Web%20Store%20users&style=social)](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch) |

## Lead Maintainer

[Marcin Rataj](https://github.com/lidel)

## Table of Contents

- [About IPFS Companion](#about-ipfs-companion)
- [Features](#features)
- [Install IPFS Companion](#install-ipfs-companion)
- [Contribute](#contribute)
- [Help & Troubleshooting](#help--troubleshooting)
- [Privacy & Licenses](#privacy--license)

## About IPFS Companion

IPFS Companion harnesses the power of your locally running IPFS node (either through the IPFS Desktop app or the command-line daemon) directly inside your favorite browser, enabling support for ipfs:// addresses, automatic IPFS gateway loading of websites and file paths, easy IPFS file import and sharing, and more.

IPFS is a peer-to-peer hypermedia protocol designed to make the web faster, safer, more resilient, and more open. It enables the creation and dissemination of completely distributed sites and applications that don’t rely on centralized hosting and stay true to the original vision of an open, flat web. Visit https://ipfs.io to learn more.

## Features

### Automatically detect and redirect IPFS resources

#### For URLs with IPFS paths

Requests for IPFS-like paths (`/ipfs/{cid}` or `/ipns/{peerid_or_host-with-dnslink}`) are detected on any website.  
If tested path is a [valid IPFS address](https://github.com/ipfs/is-ipfs) it gets redirected and loaded from a local gateway, e.g:  
> `https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`  
> → `http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`

#### For DNSLink-enabled URLs

IPFS Companion will detect presence of [DNSLink](https://docs.ipfs.io/guides/concepts/dnslink/) in DNS records of visited websites and redirect HTTP request to a local gateway.

> `http://docs.ipfs.io`  
> → `http://127.0.0.1:8080/ipns/docs.ipfs.io`

This means if you visit websites with a valid DNSLink (eg. https://docs.ipfs.io, https://ipld.io, http://tr.wikipedia-on-ipfs.org) browser will load them from IPFS.

More details: [DNSLink Support in IPFS Companion](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/dnslink.md)

#### For `x-ipfs-path` headers

IPFS Companion will upgrade transport to IPFS if the header is found in any HTTP response headers. This is a fallback for edge cases when IPFS path is not present in URL.

More details: [`x-ipfs-path` Header Support in IPFS Companion](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/x-ipfs-path-header.md)

#### Opting out of redirects

It is possible to opt-out from Gateway redirect by:
- a) suspending redirect via global toggle (see [_Disable All Redirects_](#disable-all-redirects) below)
- b) suspending redirect for via per website opt-out (in [_Active Tab_ section of _Browser Action_](#disable-gateway-redirect-per-website) or _Preferences_)
- c) including `x-ipfs-companion-no-redirect` in the URL (as a [hash](https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR#x-ipfs-companion-no-redirect) or [query](https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?x-ipfs-companion-no-redirect) parameter).

<!-- TODO: restore after https://github.com/ipfs-shipyard/ipfs-companion/issues/843 is closed
### IPFS API as `window.ipfs`

Your IPFS node is exposed as `window.ipfs` on every web page.
Websites can detect if `window.ipfs` exists and opt-in to use it instead of creating their own `js-ipfs` node.
It saves system resources and battery (on mobile), avoids the overhead of peer discovery/connection, enables shared repository access and more!
Make sure to read our [notes on `window.ipfs`](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/window.ipfs.md), where we explain it in-depth and provide examples on how to use it your own dapp.
-->

### IPFS status and context actions

- IPFS API and gateway status
- Add local (quick import) or remote files (context menu) to IPFS with option to preserve filename
- Easy access to [WebUI](https://github.com/ipfs/webui/) and add-on Preferences
- Toggle redirection to local gateway (automatic by default, manual mode can be enabled in Preferences)
- Additional actions for pages loaded from IPFS
    - Pin/Unpin of IPFS resources (via API)
    - Copy canonical IPFS address
    - Copy shareable URL to resource at preferred public gateway
    
### Toggle common functions

The IPFS Companion browser bar pop-up menu provides handy toggles for frequent functions.

#### Disable gateway redirect per website

In the _Active Tab_ section of the pop-up, you'll see a toggle to disable redirects (of any IPFS sub-resources) for the site in your currently active tab. If that site uses DNSLink, turning off the toggle will restore the site's original URL, too.

![per-site-opt-out](https://user-images.githubusercontent.com/157609/55317805-90452900-5471-11e9-9e0f-293afd261648.gif)

#### Disable all redirects

Use this toggle to disable all gateway redirects, but keep all other IPFS Companion features enabled.

![Toggle all gateway redirects](https://gateway.ipfs.io/ipfs/Qma2DdfpRseby7i8faJPzbWa36xXU1MbCy5CbghCNbwcDC)

#### Suspend IPFS Companion

Use the "power button" to temporarily suspend all IPFS integrations (redirects, API status content scripts, protocol handlers, etc). 

![Screenshot of power button in use](https://gateway.ipfs.io/ipfs/QmYEWTZCUUh2pWRQ3boccJmKtbFC1XvEoNuYTjyCU4Eknk)

### Try out experiments

Note that some of these experiments are disabled by default. You can enable them in IPFS Companion's Preferences.

- Requests made via [experimental protocols](https://github.com/ipfs/ipfs-companion/issues/164) are re-routed to HTTP gateway (public or custom):
    - `ipfs://$cid`
    - `ipns://$cid_or_fqdn`
    - `dweb:/ipfs/$cid`
    - `dweb:/ipns/$cid_or_fqdn`
- Make plaintext IPFS links clickable ([demo](https://ipfs.io/ipfs/bafybeidvtwx54qr44kidymvhfzefzxhgkieigwth6oswk75zhlzjdmunoy/linkify-demo.html))
- Switch between _External_ HTTP API and _Embedded_ js-ipfs node. Read about differences at [docs/node-types](docs/node-types.md).
[![screenshot of node type switch](https://gateway.ipfs.io/ipfs/QmW56BoDKUYychJ4Z4Kau1zVj5s33ovNqhLXQmgK9EN66k)](http://docs.ipfs.io/how-to/companion-node-types/)

## Install IPFS Companion

### Latest stable release

| <img src="https://unpkg.com/@browser-logos/firefox/firefox_16x16.png" width="16" height="16"> [Firefox](https://www.mozilla.org/firefox/new/) \| [Firefox for Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox) | <img src="https://unpkg.com/@browser-logos/chrome/chrome_16x16.png" width="16" height="16"> [Chrome](https://www.google.com/chrome/) \| <img src="https://unpkg.com/@browser-logos/brave/brave_16x16.png" width="16" height="16"> [Brave](https://brave.com/) \| <img src="https://unpkg.com/@browser-logos/opera/opera_16x16.png" width="16" height="16"> [Opera](https://www.opera.com/) \| <img src="https://unpkg.com/@browser-logos/edge/edge_16x16.png" width="16" height="16"> [Edge](https://www.microsoftedgeinsider.com/)
|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [![Install From AMO](https://ipfs.io/ipfs/QmWNa64XjA78QvK3zG2593bSMizkDXXcubDHjnRDYUivqt)<br>![](https://img.shields.io/amo/users/ipfs-companion?label=AMO%20users&style=social)](https://addons.mozilla.org/firefox/addon/ipfs-companion/) | [![Install from Chrome Store](https://ipfs.io/ipfs/QmU4Qm5YEKy5yHmdAgU2fD7PjZLgrYTUUbxTydqG2QK3TT)<br>![](https://img.shields.io/chrome-web-store/users/nibjojkomfdiaoajekhjakgkdhaomnch?label=Chrome%20Web%20Store%20users&style=social)](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch) |

**Important!** Make sure you have [IPFS installed](https://ipfs.io/#install) on your computer as well. Because IPFS Companion (in its standard configuration) talks to your computer’s local IPFS node to work its browser magic, you’ll need to have IPFS running on your computer, too — either from your terminal or using the friendly, free IPFS Desktop app.

### Beta channel

Developers and enthusiasts can opt in to the beta-quality channel:

- [Firefox self-hosted signed dev build](https://ipfs.io/ipfs/QmR8W5wg8BuAyBTruHnHovfWRavwvidVh3qtyinXi6NnLa)
- [Chromium-based dev build at the Chrome Web Store](https://chrome.google.com/webstore/detail/ipfs-companion-dev-build/hjoieblefckbooibpepigmacodalfndh)

It's also possible to grab the [last successful build from `master`](https://ci.ipfs.team/job/IPFS%20Shipyard/job/ipfs-companion/job/master/lastSuccessfulBuild/),
but these builds are not signed, nor will automatically update. `.zip` bundles are meant only to be manually loaded via `chrome://extensions` (Chromium) or `about:debugging` (Firefox) for smoke-testing.

### Development

To work on IPFS Companion's code, you'll need to install it from source. Quick steps are below, but see the full [developer notes](DEVELOPER-NOTES.md) for more detailed instructions and tips.

1. Clone https://github.com/ipfs-shipyard/ipfs-companion.git
2. Run this all-in-one dev build:
    ```console
    $ npm run dev-build
    ```
3. Switch `add-on/manifest.json` to the browser of your choice:
    ```console
    $ npm run bundle:firefox # for Firefox (build default)
    OR
    $ npm run bundle:chromium # for Chromium-based browsers
    ```
4. Load it into your browser:
    * Chromium
        1. Enter `chrome://extensions` in the URL bar
        2. Enable "Developer mode"
        3. Click "Load unpacked extension..."
        4. Pick the _directory_ `add-on`

    * Firefox
        1. Enter `about:debugging` in the URL bar
        2. Check "Enable add-on debugging"
        3. Click "Load Temporary Add-on"
        4. Pick the _file_ `add-on/manifest.json`

## Contribute

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](CONTRIBUTING.md)

All are welcome to help make IPFS Companion even better!
- Check out the [contribution guide](CONTRIBUTING.md) for how to get started as a developer
- Open an [issue](https://github.com/ipfs/ipfs-companion/issues)
- Make sure you read and abide by the [IPFS Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md)

## Help & troubleshooting

### Ask a question
The best place to ask about IPFS Companion (or IPFS in general!) is in the [official IPFS Forums](https://discuss.ipfs.io/), where you can search past discussions for others who may have had the same questions, too. There's also an active [#ipfs](https://webchat.freenode.net/?channels=ipfs) community on IRC.

### Common troubleshooting steps
These frequently encountered troubleshooting situations may be helpful:
- **Import via right-click does not work in Firefox:** See [this workaround](https://github.com/ipfs/ipfs-companion/issues/227).
- **HTTP-to-HTTPS redirects fail when using Ghostery:** [Ghostery](https://addons.mozilla.org/en-US/firefox/addon/ghostery/) is known to toy with HTTP-to-HTTPS redirect, which in some setups breaks websites utilizing public gateways [(more details)](https://github.com/ipfs-shipyard/ipfs-companion/issues/466). Until this is fixed upstream, a workaround is to [whitelist](https://user-images.githubusercontent.com/157609/39089525-5834c104-45c9-11e8-9e17-4459a97e5676.png) affected sites.
- **NoScript breaks IPFS Companion:** By default, [NoScript](https://addons.mozilla.org/en-US/firefox/addon/noscript/) breaks IPFS Companion by blocking assets loaded from an IPFS gateway running on localhost. To fix this, extend the SYSTEM ruleset and prepend it with IPFS whitelist (feel free to modify this, but get familiar with [ABE rule syntax](https://noscript.net/abe/abe_rules.pdf) first):

```
# Enable IPFS redirect to LOCAL
Site ^http://127.0.0.1:8080/(ipfs|ipns)*
Anonymize

# Prevent Internet sites from requesting LAN resources.
Site LOCAL
Accept from LOCAL
Deny
```

## Privacy & license

- [Privacy policy](PRIVACY-POLICY.md)
- The IPFS logo belongs to the [IPFS Project](https://github.com/ipfs) and is licensed under a <a rel="license" href="https://creativecommons.org/licenses/by-sa/3.0/legalcode">CC-BY-SA 3.0</a> license
- [is-ipfs](https://github.com/ipfs-shipyard/is-ipfs), [js-multihash](https://github.com/multiformats/js-multihash), and other NPM dependencies are under MIT license, unless stated otherwise
- IPFS Companion itself is released under [CC0](LICENSE): To the extent possible under law, the author has waived all copyright and related or neighboring rights to this work, effectively placing it in the public domain
