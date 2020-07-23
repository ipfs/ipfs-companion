# IPFS Companion
**Harness the power of [IPFS](https://ipfs.io/) in your browser!**

[![](https://img.shields.io/github/release/ipfs/ipfs-companion.svg)](https://github.com/ipfs/ipfs-companion/releases/latest)
[![](https://img.shields.io/badge/mozilla-reviewed-blue.svg)](https://addons.mozilla.org/en-US/firefox/addon/ipfs-companion/)
[![i18n status](https://img.shields.io/badge/i18n-translated-blue.svg)](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/LOCALIZATION-NOTES.md)
[![build-status](https://flat.badgen.net/travis/ipfs-shipyard/ipfs-companion)](https://travis-ci.com/ipfs-shipyard/ipfs-companion)
[![codecov](https://codecov.io/gh/ipfs-shipyard/ipfs-companion/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs-shipyard/ipfs-companion)
[![#ipfs-in-web-browsers](https://img.shields.io/badge/irc-%23ipfs--in--web--browsers-808080.svg)](https://webchat.freenode.net/?channels=ipfs-in-web-browsers)

![Quick runthrough of basic IPFS Companion features](https://gateway.ipfs.io/ipfs/QmeF2v4UFFvZ341ZDQh1xLeeyN4u8Cr9XSTUj6krDEwfrr)



| <img src="https://unpkg.com/@browser-logos/firefox/firefox_16x16.png" width="16" height="16"> [Firefox](https://www.mozilla.org/firefox/new/) \| [Firefox for Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox) | <img src="https://unpkg.com/@browser-logos/chrome/chrome_16x16.png" width="16" height="16"> [Chrome](https://www.google.com/chrome/) \| <img src="https://unpkg.com/@browser-logos/brave/brave_16x16.png" width="16" height="16"> [Brave](https://brave.com/) \| <img src="https://unpkg.com/@browser-logos/opera/opera_16x16.png" width="16" height="16"> [Opera](https://www.opera.com/)  \| <img src="https://unpkg.com/@browser-logos/edge/edge_16x16.png" width="16" height="16"> [Edge](https://www.microsoftedgeinsider.com/)
|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [![Install From AMO](https://ipfs.io/ipfs/QmWNa64XjA78QvK3zG2593bSMizkDXXcubDHjnRDYUivqt)<br>![](https://img.shields.io/amo/users/ipfs-companion?label=AMO%20users&style=social)](https://addons.mozilla.org/firefox/addon/ipfs-companion/) | [![Install from Chrome Store](https://ipfs.io/ipfs/QmU4Qm5YEKy5yHmdAgU2fD7PjZLgrYTUUbxTydqG2QK3TT)<br>![](https://img.shields.io/chrome-web-store/users/nibjojkomfdiaoajekhjakgkdhaomnch?label=Chrome%20Web%20Store%20users&style=social)](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch) |

## Lead maintainer

[Marcin Rataj](https://github.com/lidel), with help from the [IPFS GUI working group](https://github.com/ipfs/ipfs-gui).

## Table of contents

- [About IPFS Companion](#about-ipfs-companion)
- [Features](#ipfs-companion-features)
- [Install](#install-ipfs-companion)
- [Contribute](#contribute)
- [Help & Troubleshooting](#help--troubleshooting)
- [Privacy & Licenses](#privacy--license)

## About IPFS Companion

IPFS Companion harnesses the power of your locally running IPFS node (either through the [IPFS Desktop](https://github.com/ipfs-shipyard/ipfs-desktop/#ipfs-desktop) app or the command-line daemon) directly inside your favorite Chromium-based or Firefox browser, enabling support for `ipfs://` addresses, automatic IPFS gateway loading of websites and file paths, easy IPFS file import and sharing, and more.

IPFS is a peer-to-peer hypermedia protocol designed to make the web faster, safer, more resilient, and more open. It enables the creation and dissemination of completely distributed sites and applications that don’t rely on centralized hosting and stay true to the original vision of an open, flat web. Visit [the IPFS Project website](https://ipfs.io) to learn more.

## IPFS Companion features

### Automatically detect and redirect IPFS resources

#### Detect URLs with IPFS paths

IPFS Companion detects and tests requests for IPFS-like paths ( such as `/ipfs/{cid}` or `/ipns/{peerid_or_host-with-dnslink}`) on any website. If a path is a [valid IPFS address](https://github.com/ipfs/is-ipfs), it is redirected to load from your local gateway. The gateway at `localhost` will also automatically switch to a subdomain to provide a unique origin for each website:
> `https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`  
> → `http://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`
> → `http://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.localhost:8080`

#### Detect DNSLink-enabled URLs

IPFS Companion [detects DNSLink info](http://docs.ipfs.io/how-to/dnslink-companion/) in the DNS records of websites. If a site uses DNSLink (a few examples are https://docs.ipfs.io, https://ipld.io, and http://tr.wikipedia-on-ipfs.org), IPFS Companion redirects the HTTP request to your local gateway:

> `http://docs.ipfs.io`  
> → `http://localhost:8080/ipns/docs.ipfs.io` → `http://docs.ipfs.io.ipns.localhost:8080/`

#### Detect pages with `x-ipfs-path` headers

IPFS Companion also upgrades transport to IPFS if it finds the `x-ipfs-path` in any HTTP response headers; this also acts as a fallback for cases when an IPFS path is not present in the URL. [Learn more.](http://docs.ipfs.io/how-to/companion-x-ipfs-path-header/)


#### Toggle redirects globally or per site

You can disable and re-enable local gateway redirects by several means:
- Suspend redirects **globally** in IPFS Companion's preferences
- Suspend redirects **per site** using the toggle under "Current tab" ([illustrated below](#toggle-gateway-redirects-on-a-per-website-basis)) or in IPFS Companion's preferences
- Add `x-ipfs-companion-no-redirect` to the URL itself as a hash ([example](https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR#x-ipfs-companion-no-redirect)) or query parameter ([example](https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?x-ipfs-companion-no-redirect))

<!-- TODO: restore after https://github.com/ipfs-shipyard/ipfs-companion/issues/843 is closed
### IPFS API as `window.ipfs`

Your IPFS node is exposed as `window.ipfs` on every web page.
Websites can detect if `window.ipfs` exists and opt-in to use it instead of creating their own `js-ipfs` node.
It saves system resources and battery (on mobile), avoids the overhead of peer discovery/connection, enables shared repository access and more!
Make sure to read our [notes on `window.ipfs`](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/window.ipfs.md), where we explain it in-depth and provide examples on how to use it your own dapp.
-->

### Access frequently-used IPFS actions from your browser bar

IPFS Companion enables you to quickly and easily access common actions from your browser bar with just a few clicks:

- See how many peers you're connected with a glance at the cube icon in your browser bar
- Check your IPFS API and gateway status by clicking the cube icon to reveal the main menu
- Right-click images and other page assets to easily add them to IPFS (including the option to preserve file names)
- Choose the _Quick Import/Share..._ option in the main menu for quick drag-and-drop import from a browser tab
- Pin or unpin IPFS resources (via API) directly from the main menu
- Copy shareable public gateway links, IPFS content paths, or CIDs of IPFS resources directly from the main menu
- Launch the [IPFS Web UI dashboard](https://github.com/ipfs-shipyard/ipfs-webui) from the main menu with a single click
- Toggle gateway redirects or switch all IPFS Companion features on/off quickly and easily from the main menu (illustrations below)

#### Toggle gateway redirects on a per-website basis

You can toggle redirects (of any IPFS sub-resources) for an individual website under the _Current Tab_ section of the main menu. If that site uses DNSLink, toggling off will restore the site's original URL, too.

![Toggle per-site opt-out](https://gateway.ipfs.io/ipfs/QmbAWhTk8GjtFqpNQVCRXWyJbh9YFC61nTNcBPZi87e4qo)

#### Switch all IPFS Companion features on/off

To temporarily suspend all IPFS integrations (redirects, API status content scripts, protocol handlers, etc.), use the on/off button at the top of the IPFS Companion menu.

![Turn IPFS Companion off and on again](https://gateway.ipfs.io/ipfs/QmVWFueChvoxfRpPcB9C7TJFucr2TJx6tPT3udtYd58GSy)

### Try out experiments!

IPFS Companion ships with a variety of experimental features. Some are disabled by default, so be sure to check out IPFS Companion's Preferences to see them all.

- Make plaintext IPFS links clickable ([demo](https://ipfs.io/ipfs/bafybeidvtwx54qr44kidymvhfzefzxhgkieigwth6oswk75zhlzjdmunoy/linkify-demo.html))
- Re-route requests made via the following [experimental protocols](https://github.com/ipfs/ipfs-companion/issues/164) to an HTTP gateway (public or custom):
    - `ipfs://$cid`
    - `ipns://$cid_or_fqdn`
    - `dweb:/ipfs/$cid`
    - `dweb:/ipns/$cid_or_fqdn`

- Switch between the external HTTP API of your local IPFS node (default setting) and a js-ipfs node embedded in your browser (note that this has some [functionality limitations](https://docs.ipfs.io/how-to/companion-node-types/))
[![screenshot of node type switch](https://gateway.ipfs.io/ipfs/QmZVAyxih3qt99qED3Xp8wzHxsV3XJ3vVa7HuW21AGapPP)](http://docs.ipfs.io/how-to/companion-node-types/)

## Install IPFS Companion

### Latest stable release

| <img src="https://unpkg.com/@browser-logos/firefox/firefox_16x16.png" width="16" height="16"> [Firefox](https://www.mozilla.org/firefox/new/) \| [Firefox for Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox) | <img src="https://unpkg.com/@browser-logos/chrome/chrome_16x16.png" width="16" height="16"> [Chrome](https://www.google.com/chrome/) \| <img src="https://unpkg.com/@browser-logos/brave/brave_16x16.png" width="16" height="16"> [Brave](https://brave.com/) \| <img src="https://unpkg.com/@browser-logos/opera/opera_16x16.png" width="16" height="16"> [Opera](https://www.opera.com/) \| <img src="https://unpkg.com/@browser-logos/edge/edge_16x16.png" width="16" height="16"> [Edge](https://www.microsoftedgeinsider.com/)
|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [![Install From AMO](https://ipfs.io/ipfs/QmWNa64XjA78QvK3zG2593bSMizkDXXcubDHjnRDYUivqt)<br>![](https://img.shields.io/amo/users/ipfs-companion?label=AMO%20users&style=social)](https://addons.mozilla.org/firefox/addon/ipfs-companion/) | [![Install from Chrome Store](https://ipfs.io/ipfs/QmU4Qm5YEKy5yHmdAgU2fD7PjZLgrYTUUbxTydqG2QK3TT)<br>![](https://img.shields.io/chrome-web-store/users/nibjojkomfdiaoajekhjakgkdhaomnch?label=Chrome%20Web%20Store%20users&style=social)](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch) |

**Important!** Make sure you have [IPFS installed](https://ipfs.io/#install) on your computer as well. Because IPFS Companion (in its standard configuration) talks to your computer’s local IPFS node to work its browser magic, you’ll need to have IPFS running on your computer, too.

### Beta channel

Developers and enthusiasts can opt in to the beta-quality channel:

- [Firefox self-hosted signed dev build](https://bafybeibjozlsoxzrxsoklis775aglnwpal2hjl42ippo57jdwiv6zoij7m.ipfs.dweb.link/)
- [Chromium-based dev build at the Chrome Web Store](https://chrome.google.com/webstore/detail/ipfs-companion-dev-build/hjoieblefckbooibpepigmacodalfndh)

It's also possible to grab [vendor-specific packages for each release](https://github.com/ipfs-shipyard/ipfs-companion/releases),
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

## Privacy & license info

- IPFS Companion [Privacy policy](PRIVACY-POLICY.md)
- The IPFS logo belongs to the [IPFS Project](https://github.com/ipfs) and is licensed under a <a rel="license" href="https://creativecommons.org/licenses/by-sa/3.0/legalcode">CC-BY-SA 3.0</a> license
- [is-ipfs](https://github.com/ipfs-shipyard/is-ipfs), [js-multihash](https://github.com/multiformats/js-multihash), and other npm dependencies are under MIT license, unless stated otherwise
- IPFS Companion itself is released under [CC0](LICENSE); to the extent possible under law, the author has waived all copyright and related or neighboring rights to this work, effectively placing it in the public domain
