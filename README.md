# ipfs-firefox-addon

[![Build Status](https://travis-ci.org/lidel/ipfs-firefox-addon.svg)](https://travis-ci.org/lidel/ipfs-firefox-addon)

Firefox addon that provides transparent access to IPFS resources via local HTTP2IPFS gateway.

If you are using Chrome or Chromium, check [ipfs-chrome-extension](https://github.com/dylanPowers/ipfs-chrome-extension) instead.

![screenshot v0.2.0](screenshot.png)

### Features

- Requests to `http://gateway.ipfs.io/ipfs/(.*)`  
  are replaced with `http://127.0.0.1:8080/ipfs/$1`
- Custom gateway host and port can be changed in Preferences
- Clicking on the addon icon toggles redirection
- Requests to`ipfs:(.*)` are routed to active gateway (public or custom)


### How to install

The easiest way is to install from [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/ipfs-gateway-redirect/).

One can also choose to manually install [the latest .xpi from Github](https://github.com/lidel/ipfs-firefox-addon/releases/latest).

Please read [SECURITY.md](https://github.com/lidel/ipfs-firefox-addon/blob/master/SECURITY.md) if you want to perform quick security audit BEFORE installation.

### LICENSE

Addon is released under [CC0](LICENSE). IPFS logo belongs to the http://ipfs.io project.
