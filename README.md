# ipfs-firefox-addon

[![Latest release](https://img.shields.io/github/release/lidel/ipfs-firefox-addon.svg)](https://github.com/lidel/ipfs-firefox-addon/releases/latest)
[![Build Status](https://travis-ci.org/lidel/ipfs-firefox-addon.svg)](https://travis-ci.org/lidel/ipfs-firefox-addon)

Firefox addon that provides transparent access to IPFS resources via local HTTP2IPFS gateway.

(If you are using Chrome or Chromium, check [ipfs-chrome-extension](https://github.com/dylanPowers/ipfs-chrome-extension) instead)

![screenshot v1.2.0](screenshot.png)

### Features

- Clicking on the addon icon toggles redirection
- Requests to `https?://<public_gateway>/(ipfs|ipns)/$RESOURCE`  
  are replaced with `http://127.0.0.1:8080/(ipfs|ipns)/$RESOURCE`
- Custom gateway host and port can be changed at   
  `about:addons` → Extensions → IPFS Gateway Redirect → Preferences
- List of public gateways can be customized too,  
  default is `ipfs.io` with second being the legacy `gateway.ipfs.io`
- Requests made via custom protocols are routed to the active gateway (public or custom):
   - `(ipfs|ipns):/*$RESOURCE`
   - `fs:/*(ipfs|ipns)/$RESOURCE`
- Context menu under right click on a page from custom gateway:   
  - Copy canonical IPFS address    
  - Copy shareable URL to resource at a default public gateway (first one on public gateway list)

### How to install

The easiest way is to get it from [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/ipfs-gateway-redirect/):

[![Get the add-on](https://blog.mozilla.org/addons/files/2015/11/AMO-button_1.png)](https://addons.mozilla.org/en-US/firefox/addon/ipfs-gateway-redirect/)

It will guarantee automatic updates to the latest version reviewed by Mozilla community. 

It is also possible to manually build XPI from [the latest relase sources](https://github.com/lidel/ipfs-firefox-addon/releases/latest), however offical Firefox builds do not accept unsigned XPIs anymore.

Please read [SECURITY.md](https://github.com/lidel/ipfs-firefox-addon/blob/master/SECURITY.md) if you want to perform quick security audit BEFORE installation.

### TROUBLESHOOTING

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

### CONTRIBUTING

See [CONTRIBUTING](CONTRIBUTING.md)


### LICENSE

[IPFS logo](https://github.com/ipfs/logo) belongs to [The IPFS Project](https://github.com/ipfs) and is licensed under a <a rel="license" href="https://creativecommons.org/licenses/by-sa/3.0/legalcode">CC-BY-SA 3.0</a>.

The add-on itself is released under [CC0](LICENSE): to the extent possible under law, the author has waived all copyright and related or neighboring rights to this work, effectively placing it in the public domain.
