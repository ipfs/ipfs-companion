# ipfs-firefox-addon

Simple Firefox addon that enables access to IPFS resources via local HTTP gateway.

If you are using Chrome or Chromium, check [ipfs-chrome-extension](https://github.com/dylanPowers/ipfs-chrome-extension) instead.

![screenshot v0.1.0](screenshot.png?1)


Right now it just replaces requests to `http://gateway.ipfs.io/(.*)` with `http://127.0.0.1:8080/$1`.
Clicking on the addon icon toggles redirection.


### How to install

The easiest way is to install from [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/ipfs-gateway-redirect/).

One can also choose to manually install [the latest .xpi from Github](https://github.com/lidel/ipfs-firefox-addon/releases/latest).

### LICENSE

Addon is released under [CC0](LICENSE). IPFS logo belongs to the http://ipfs.io project.
