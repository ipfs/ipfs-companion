<h1 align="center">IPFS Companion Browser Extension</h1>

<p align="center" style="font-size: 1.2rem;">Harness the power of <a href="https://ipfs.tech">IPFS</a> in your browser!</p>

<p align="center">
  <a href="https://ipfs.tech"><img src="https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square" alt="Official Part of IPFS Project"></a>
  <a href="https://discuss.ipfs.tech"><img alt="Discourse Forum" src="https://img.shields.io/discourse/posts?server=https%3A%2F%2Fdiscuss.ipfs.tech&amp;color=blue"></a>
  <a href="https://matrix.to/#/#ipfs-space:ipfs.io"><img alt="Matrix Chat" src="https://img.shields.io/matrix/ipfs-space%3Aipfs.io?server_fqdn=matrix.org&amp;color=blue"></a>
  <a href="https://github.com/ipfs/ipfs-companion/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/ipfs/ipfs-companion?filter=!*rc*"></a>
  <a href="https://github.com/ipfs-shipyard/ipfs-companion/blob/main/docs/LOCALIZATION-NOTES.md"><img src="https://img.shields.io/badge/i18n-translated-blue.svg" alt="i18n status"></a>
  <a href="https://github.com/ipfs/ipfs-companion/actions"><img src="https://img.shields.io/github/actions/workflow/status/ipfs/ipfs-companion/ci.yml?branch=main" alt="ci"></a>
</p>

<a href="https://docs.ipfs.tech/install/ipfs-companion/"><img src="https://github.com/user-attachments/assets/ae0131b8-1802-47d3-87ea-65ff5d548199" alt="Companion UX demo" title="Companion UX demo" width="100%"></a>

<div align="center">
  
| <img src="https://unpkg.com/@browser-logos/firefox/firefox_16x16.png" width="16" height="16"> [Firefox](https://www.mozilla.org/firefox/new/) \| [Firefox for Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox) | <img src="https://unpkg.com/@browser-logos/chrome/chrome_16x16.png" width="16" height="16"> [Chrome](https://www.google.com/chrome/) \| <img src="https://unpkg.com/@browser-logos/brave/brave_16x16.png" width="16" height="16"> [Brave](https://brave.com/) \| <img src="https://unpkg.com/@browser-logos/opera/opera_16x16.png" width="16" height="16"> [Opera](https://www.opera.com/)  \| <img src="https://unpkg.com/@browser-logos/edge/edge_16x16.png" width="16" height="16"> [Edge](https://www.microsoft.com/en-us/edge/download)
|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [![Install From AMO](https://ipfs.io/ipfs/QmWNa64XjA78QvK3zG2593bSMizkDXXcubDHjnRDYUivqt)<br>![](https://img.shields.io/amo/users/ipfs-companion?label=AMO%20users&style=social)](https://addons.mozilla.org/firefox/addon/ipfs-companion/) | [![Install from Chrome Store](https://ipfs.io/ipfs/QmU4Qm5YEKy5yHmdAgU2fD7PjZLgrYTUUbxTydqG2QK3TT)<br>![](https://img.shields.io/chrome-web-store/users/nibjojkomfdiaoajekhjakgkdhaomnch?label=Chrome%20Web%20Store%20users&style=social)](https://chromewebstore.google.com/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch) |

</div>

<hr />


## Maintenance

<a href="https://ipshipyard.com/"><img align="right" src="https://github.com/user-attachments/assets/39ed3504-bb71-47f6-9bf8-cb9a1698f272" /></a>

> [!NOTE]
> This browser extension is currently maintained by the [Shipyard](https://ipshipyard.com/) team.


## Table of contents

- [About IPFS Companion](#about-ipfs-companion)
- [Features](#ipfs-companion-features)
- [Install](#install-ipfs-companion)
- [Contribute](#contribute)
- [Help & Troubleshooting](#help--troubleshooting)
- [Privacy & Licenses](#privacy--license-info)

## About IPFS Companion

IPFS Companion harnesses the power of your locally running IPFS [Kubo](https://github.com/ipfs/kubo) node (either through the [IPFS Desktop](https://docs.ipfs.tech/install/ipfs-desktop/) app or the [command-line daemon](https://docs.ipfs.tech/install/command-line/)) directly inside your favorite Chromium-based or Firefox browser, enabling support for [`ipfs://` addresses](https://docs.ipfs.tech/how-to/address-ipfs-on-web/#native-urls), redirecting content-addressed websites and file paths to your local [Gateway](https://docs.ipfs.tech/concepts/glossary/#gateway), easy IPFS file import and sharing, and more.

IPFS is a peer-to-peer hypermedia protocol designed to make the web faster, safer, more resilient, and more open. It enables completely distributed sites and applications that don’t rely on centralized hosting and stay true to the original vision of an open, flat web. Visit [the IPFS Project website](https://ipfs.tech) to learn more.

## IPFS Companion features

### Automatically detect and redirect IPFS resources

#### Detect URLs with IPFS paths

IPFS Companion detects requests for IPFS-like paths (such as `/ipfs/{cid}` or `/ipns/{peerid_or_host-with-dnslink}`) on any website. If a path is a [valid IPFS address](https://github.com/ipfs/is-ipfs), it is redirected to load from your local gateway. The gateway at `localhost` will also automatically switch to a [subdomain gateway](https://docs.ipfs.tech/how-to/address-ipfs-on-web/#subdomain-gateway) to provide a unique origin for each website:

> [!NOTE]
> **Path gateway redirect flow:**
> 
> - **Step 1:** Public gateway URL detected
>   - `https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`
> - **Step 2:** Redirect to local gateway
>   - `http://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`
> - **Step 3:** Automatic upgrade to subdomain with origin isolation
>   - `http://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.localhost:8080`

> [!NOTE]
> **Subdomain gateway redirect flow:**
> 
> - **Step 1:** Subdomain gateway URL detected
>   - `https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link`
> - **Step 2:** Redirect to local subdomain with origin isolation
>   - `http://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.localhost:8080`

#### Detect DNSLink-enabled URLs

IPFS Companion [detects DNSLink info](https://docs.ipfs.tech/how-to/dnslink-companion/) in the DNS records of websites. If a site uses DNSLink (a few examples are https://docs.ipfs.tech, https://ipld.io, and http://tr.wikipedia-on-ipfs.org), IPFS Companion redirects the HTTP request to your local gateway:

> [!NOTE]
> **DNSLink redirect flow:**
> 
> - **Step 1:** DNSLink-enabled website detected
>   - `http://docs.ipfs.tech`
> - **Step 2:** Redirect to local gateway
>   - `http://localhost:8080/ipns/docs.ipfs.tech`
> - **Step 3:** Automatic upgrade to subdomain with origin isolation
>   - `http://docs.ipfs.tech.ipns.localhost:8080/`

#### Detect pages with `x-ipfs-path` headers

IPFS Companion also upgrades transport to IPFS when it detects `x-ipfs-path` in HTTP response headers; this also acts as a fallback for cases when an IPFS path is not present in the URL. [Learn more.](https://docs.ipfs.tech/how-to/companion-x-ipfs-path-header/)


#### Toggle redirects globally or per site

You can disable and re-enable local gateway redirects by several means:
- Suspend redirects **globally** in IPFS Companion's preferences
- Suspend redirects **per site** using the toggle under "Current tab" ([illustrated below](#toggle-gateway-redirects-on-a-per-website-basis)) or in IPFS Companion's preferences
- Add `x-ipfs-companion-no-redirect` to the URL itself as a hash ([example](https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR#x-ipfs-companion-no-redirect)) or query parameter ([example](https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?x-ipfs-companion-no-redirect))

### Access frequently-used IPFS actions from your browser bar

IPFS Companion enables you to quickly and easily access common actions from your browser bar with just a few clicks:

- The cube icon in your browser bar shows your live peer count for quick reference.
- Check your IPFS API and gateway status by clicking the cube icon to reveal the main menu
- Right-click images and other page assets to easily add them to IPFS (including the option to preserve file names)
- Choose the _Import_ option in the main menu for quick drag-and-drop import from a browser tab
- Pin or unpin IPFS resources (via API) directly from the main menu
- Copy shareable public gateway links, IPFS content paths, or CIDs of IPFS resources directly from the main menu
- Launch the [IPFS Web UI dashboard](https://github.com/ipfs-shipyard/ipfs-webui) from the main menu with a single click
- Toggle gateway redirects or switch all IPFS Companion features on/off quickly and easily from the main menu (illustrations below)

#### Toggle gateway redirects on a per-website basis

You can toggle redirects (of any IPFS sub-resources) for an individual website under the _Current Tab_ section of the main menu. If that site uses DNSLink, toggling off will restore the site's original URL, too.

![Toggle per-site opt-out](https://gateway.ipfs.io/ipfs/QmYWXd4TSjk1RSzqzpaUbYp42obYjWtRme1oeYaTUdqkWu)

#### Switch all IPFS Companion features on/off

To temporarily suspend all IPFS integrations (redirects, API status content scripts, protocol handlers, etc.), use the on/off button at the top of the IPFS Companion menu.

![Turn IPFS Companion off and on again](https://gateway.ipfs.io/ipfs/QmZqyBnLY1jatj2ppJEbJqyj8oJecZt7chNB62jhhq8f9g)

### Try out experiments!

IPFS Companion ships with a variety of experimental features. Some are disabled by default, so be sure to check out IPFS Companion's Preferences to see them all.

- Make plaintext IPFS links clickable ([demo](https://ipfs.io/ipfs/bafybeidvtwx54qr44kidymvhfzefzxhgkieigwth6oswk75zhlzjdmunoy/linkify-demo.html))
- Re-route requests made via the following [experimental protocols](https://github.com/ipfs/ipfs-companion/issues/164) to an HTTP gateway (public or custom):
    - `ipfs://$cid`
    - `ipns://$cid_or_fqdn`

## Install IPFS Companion

### Latest stable release

| <img src="https://unpkg.com/@browser-logos/firefox/firefox_16x16.png" width="16" height="16"> [Firefox](https://www.mozilla.org/firefox/new/) \| [Firefox for Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox) | <img src="https://unpkg.com/@browser-logos/chrome/chrome_16x16.png" width="16" height="16"> [Chrome](https://www.google.com/chrome/) \| <img src="https://unpkg.com/@browser-logos/brave/brave_16x16.png" width="16" height="16"> [Brave](https://brave.com/) \| <img src="https://unpkg.com/@browser-logos/opera/opera_16x16.png" width="16" height="16"> [Opera](https://www.opera.com/) \| <img src="https://unpkg.com/@browser-logos/edge/edge_16x16.png" width="16" height="16"> [Edge](https://www.microsoft.com/en-us/edge/download)
|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [![Install From AMO](https://ipfs.io/ipfs/QmWNa64XjA78QvK3zG2593bSMizkDXXcubDHjnRDYUivqt)<br>![](https://img.shields.io/amo/users/ipfs-companion?label=AMO%20users&style=social)](https://addons.mozilla.org/firefox/addon/ipfs-companion/) | [![Install from Chrome Store](https://ipfs.io/ipfs/QmU4Qm5YEKy5yHmdAgU2fD7PjZLgrYTUUbxTydqG2QK3TT)<br>![](https://img.shields.io/chrome-web-store/users/nibjojkomfdiaoajekhjakgkdhaomnch?label=Chrome%20Web%20Store%20users&style=social)](https://chromewebstore.google.com/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch) |

**Important!** Make sure you have [IPFS installed](https://docs.ipfs.tech/install/) on your computer as well. IPFS Companion requires a local IPFS [Kubo](https://github.com/ipfs/kubo) node running on your computer to function properly.

It's also possible to grab [vendor-specific packages for each release](https://github.com/ipfs-shipyard/ipfs-companion/releases),
but these builds are not signed, nor will they automatically update. `.zip` bundles are meant only to be manually loaded via `chrome://extensions` (Chromium) or `about:debugging` (Firefox) for smoke-testing.

### Development

To work on IPFS Companion's code, you'll need to install it from source. Quick steps are below, but see the full [developer notes](./docs/DEVELOPER-NOTES.md) for more detailed instructions and tips.

1. Clone https://github.com/ipfs-shipyard/ipfs-companion.git
2. Run this all-in-one dev build to install dependencies, build, and launch in the browser of your choice:
    * Chromium
        ```console
        $ npm run dev-build chromium
        ```
    * Firefox
        ```console
        $ npm run dev-build firefox    # firefox:nightly works too!
        ```

## Contribute

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](./docs/CONTRIBUTING.md)

All are welcome to help make IPFS Companion even better!
- Check out the [contribution guide](./docs/CONTRIBUTING.md) for how to get started as a developer
- Open an [issue](https://github.com/ipfs/ipfs-companion/issues)
- Make sure you read and abide by the [IPFS Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md)

## Release Process

The release process has been [documented here](./docs/RELEASE-PROCESS.md).

## Help & troubleshooting

### Ask a question

> [!TIP]
> The best place to ask about IPFS Companion (or IPFS in general!) is in the [official IPFS Forums](https://discuss.ipfs.tech/), where you can search past discussions for others who may have had the same questions, too.

### Common troubleshooting steps
These frequently encountered troubleshooting situations may be helpful:
- **Import via right-click does not work in Firefox:** See [this workaround](https://github.com/ipfs/ipfs-companion/issues/227).
- **HTTP-to-HTTPS redirects fail when using Ghostery:** [Ghostery](https://addons.mozilla.org/en-US/firefox/addon/ghostery/) is known to interfere with HTTP-to-HTTPS redirects, which in some setups breaks websites utilizing public gateways [(more details)](https://github.com/ipfs-shipyard/ipfs-companion/issues/466). Until this is fixed upstream, a workaround is to [allowlist](https://user-images.githubusercontent.com/157609/39089525-5834c104-45c9-11e8-9e17-4459a97e5676.png) affected sites.
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

- IPFS Companion [Privacy policy](./PRIVACY-POLICY.md)
- The IPFS logo belongs to the [IPFS Project](https://github.com/ipfs) and is licensed under a <a rel="license" href="https://creativecommons.org/licenses/by-sa/3.0/legalcode">CC-BY-SA 3.0</a> license
- [is-ipfs](https://github.com/ipfs-shipyard/is-ipfs), [js-multihash](https://github.com/multiformats/js-multihash), and other npm dependencies are under MIT license, unless stated otherwise
- IPFS Companion itself is released under [CC0](LICENSE); to the extent possible under law, the author has waived all copyright and related or neighboring rights to this work, effectively placing it in the public domain
