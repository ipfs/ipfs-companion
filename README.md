# IPFS Companion

![screenshot of v1.5.9](screenshot.png)

[![](https://img.shields.io/github/release/ipfs/ipfs-companion.svg)](https://github.com/ipfs/ipfs-companion/releases/latest)
[![](https://img.shields.io/badge/mozilla-full%20review-blue.svg)](https://addons.mozilla.org/en-US/firefox/addon/ipfs-gateway-redirect/)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-blue.svg)](http://standardjs.com/)
[![NSP Status](https://nodesecurity.io/orgs/lidelorg/projects/db13ad1f-ca19-42c5-8c58-dbb8d111b651/badge)](https://nodesecurity.io/orgs/lidelorg/projects/db13ad1f-ca19-42c5-8c58-dbb8d111b651)
[![build-status](https://travis-ci.org/ipfs/ipfs-companion.svg?branch=master)](https://travis-ci.org/ipfs/ipfs-companion)
[![Coverage Status](https://coveralls.io/repos/github/lidel/ipfs-firefox-addon/badge.svg?branch=master)](https://coveralls.io/github/lidel/ipfs-firefox-addon?branch=master)

> WebExtension that simplifies access to IPFS resources

## Table of Contents

- [Background](#background)
- [Features](#features)
- [Install](#install)
  - [Firefox](#firefox)
  - [Chromium](#chromium-based-browsers)
- [Troubleshooting](#troubleshooting)
- [Contribute](#contribute)
- [License](#license)

## Background

This add-on enables everyone to access ipfs.io (or any other public gateway) urls the way they were meant: from locally running IPFS daemon :-)

IPFS is a new hypermedia distribution protocol, addressed by content and identities.
IPFS enables the creation of completely distributed applications.
It aims to make the web faster, safer, and more open.

Learn more at: https://ipfs.io (It is really cool, I promise!)

## Features 

- Toolbar icon displays current IPFS peering status
- Click on it to open IPFS actions menu
  - Display information about custom gateway
  - Redirection to local gateway (automatic by default, manual mode can be enabled in Preferences)
  - Easy way to open WebUI (e.g. go-ipfs daemon running at the custom gateway)
  - Quick Upload of local files to IPFS
  - Mirror to IPFS via right click on any image or video on any website
  - Additionally, on pages loaded from IPFS:
    - Pin/Unpin IPFS Resource (via API)
    - Copy canonical IPFS address
    - Copy shareable URL to resource at the public gateway
- Requests to `https?://<public_gateway>/(ipfs|ipns)/$RESOURCE`  
  are replaced with `http://127.0.0.1:8080/(ipfs|ipns)/$RESOURCE`
- Custom Gateway address and other settings can be tweaked via Preferences
- Requests made via popular custom protocols are routed to the active gateway (public or custom):
   - `[web+](ipfs|ipns):/*$RESOURCE`
   - `[web+]fs:/*(ipfs|ipns)/$RESOURCE`
- Experimental features (disabled by default, use Preferences screen to enable)
   - Detect and redirect sites with [dnslink](https://github.com/jbenet/go-dnslink) to `/ipns/<fqdn>`
   - Rewrite hrefs with `/ip(f|n)s/*` paths on every page to point to IPFS gateway. Make plaintext IPFS links clickable.

## Install

### Firefox

Install the latest signed release from [AMO](https://addons.mozilla.org/en-US/firefox/addon/ipfs-gateway-redirect/):

[![Get the add-on](https://blog.mozilla.org/addons/files/2015/11/AMO-button_1.png)](https://addons.mozilla.org/en-US/firefox/addon/ipfs-gateway-redirect/)

It will guarantee automatic updates to the latest version reviewed by Mozilla community.

#### Old Firefox (< 53) and XUL-compatible browsers

Legacy  versions `1.x.x` were based on currently deprecated Add-On SDK (Firefox-only).     
While it is not maintained anymore, one can inspect, build and install it using codebase from [legacy-sdk](https://github.com/ipfs/ipfs-companion/tree/legacy-sdk) branch.    
For historical background on the rewrite see [Issue #20: Move to WebExtensions](https://github.com/ipfs/ipfs-companion/issues/20).

### Chromium-based browsers

Try manual installation:

1. Download Sources
2. Build it:

  ```bash
  npm install
  npm run build
  ```

3. Then open up `chrome://extensions` in Chromium-based browser, enable "Developer mode", click "Load unpacked extension..." and point it at `add-on/manifest.json`


### TROUBLESHOOTING

#### Upload via right-click does not work in Firefox

See [this workaround](https://github.com/ipfs/ipfs-companion/issues/227).

#### Rule to work with NoScript with ABE enabled

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

## Contribute

See [CONTRIBUTING](CONTRIBUTING.md) :sparkles:

## License

[IPFS logo](https://github.com/ipfs/logo) belongs to [The IPFS Project](https://github.com/ipfs) and is licensed under a <a rel="license" href="https://creativecommons.org/licenses/by-sa/3.0/legalcode">CC-BY-SA 3.0</a>.

[is-ipfs](https://github.com/xicombd/is-ipfs), [js-multihash](https://github.com/jbenet/js-multihash) and other NPM dependencies are under MIT license, unless stated otherwise.

The add-on itself is released under [CC0](LICENSE): to the extent possible under law, the author has waived all copyright and related or neighboring rights to this work, effectively placing it in the public domain.

