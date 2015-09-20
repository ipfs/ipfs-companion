# ipfs-firefox-addon

[![Latest release](https://img.shields.io/github/release/lidel/ipfs-firefox-addon.svg)](https://github.com/lidel/ipfs-firefox-addon/releases/latest)
[![Build Status](https://travis-ci.org/lidel/ipfs-firefox-addon.svg)](https://travis-ci.org/lidel/ipfs-firefox-addon)

Firefox addon that provides transparent access to IPFS resources via local HTTP2IPFS gateway.

If you are using Chrome or Chromium, check [ipfs-chrome-extension](https://github.com/dylanPowers/ipfs-chrome-extension) instead.

![screenshot v0.2.0](screenshot.png)

### Features

- clicking on the addon icon toggles redirection
- requests to `https?://<public_gateway>/(ipfs|ipns)/$RESOURCE`  
  are replaced with `http://127.0.0.1:8080/(ipfs|ipns)/$RESOURCE`
- custom gateway host and port can be changed at   
  `about:addons` → Extensions → IPFS Gateway Redirect → Preferences
- list of public gateways can be customized too,  
  default is `ipfs.io` with second being the legacy `gateway.ipfs.io`
- requests to custom protocols are routed to the active gateway (public or custom):
   - `(ipfs|ipns):$RESOURCE`
   - `(ipfs|ipns)://$RESOURCE` 
- context menu under right click on a page from custom gateway   
  contains an option to copy shareable link to resource at default public gateway (first one on the list)

### How to install

The easiest way is to install from [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/ipfs-gateway-redirect/).   
It will guarantee automatic updates to version reviewed by Mozilla community. 

One can also choose to manually install [the latest .xpi from Github](https://github.com/lidel/ipfs-firefox-addon/releases/latest) (no automatic updates).

Please read [SECURITY.md](https://github.com/lidel/ipfs-firefox-addon/blob/master/SECURITY.md) if you want to perform quick security audit BEFORE installation.

### LICENSE

[IPFS logo](https://github.com/ipfs/logo) belongs to [The IPFS Project](https://github.com/ipfs) and is licensed under a <a rel="license" href="https://creativecommons.org/licenses/by-sa/3.0/legalcode">CC-BY-SA 3.0</a>.

The add-on itself is released under [CC0](LICENSE): to the extent possible under law, the author has waived all copyright and related or neighboring rights to this work, effectively placing it in the public domain.
