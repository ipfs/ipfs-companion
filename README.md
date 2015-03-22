# ipfs-firefox-addon

![screenshot v0.1.0](screenshot.png)

Simple Firefox addon that enables access to IPFS resources via local HTTP gateway

Right now it just replaces requests to `http://gateway.ipfs.io/(.*)` with `http://127.0.0.1:8080/$1`.

If you are using Chrome or Chromium, check [ipfs-chrome-extension](https://github.com/dylanPowers/ipfs-chrome-extension) instead.

### TODO

- add option to use custom host/port instead of default `127.0.0.1:8080`
- add support for `ipfs://` protocol and other common notations
