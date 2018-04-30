# Node Types in IPFS Companion

![screenshot of node type toggle](https://user-images.githubusercontent.com/157609/39421672-59010924-4c6a-11e8-9e64-6b5d5f5f2768.png)

> **TL;DR** When in doubt, run go-ipfs as External node (see: [Getting Started](https://ipfs.io/docs/getting-started/))


## External

_External_ node can be any instance of IPFS daemon that runs outside of web
browser process and exposes _Gateway_ and writable _API_ over HTTP at TCP ports.

At this time [go-ipfs](https://github.com/ipfs/go-ipfs) daemon is preferred
implementation. It is easier on CPU and provides `dhtclient` mode which
decreases ambient bandwidth use and smaller battery drain (key characteristics
of something that is expected to run in background all the time).

A good practice is to run it on localhost (`127.0.0.1`) as it provides:
- Increased security (native IPFS used as end-to-end transport)
- Better UX in web browser (no mixed-content warnings)
- Improved performance (local loopback is used, no network overhead)

Don't know where to start? See [Getting Started](https://ipfs.io/docs/getting-started/) instructions.


## Embedded

_Embedded_ node is a js-ipfs instance running in browser (in-memory), without need for
any external software.

It is great for quickly sharing files with someone, or for testing a dapp that
uses `window.ipfs` without having to install and start up your own IPFS daemon.

Power users can provide [custom config](https://github.com/ipfs/js-ipfs#faq) (eg. to enable experimental pubsub) [via _Preferences_](https://user-images.githubusercontent.com/157609/38084660-0b97c0cc-334e-11e8-9368-823345ced67f.png)

**Note** that Embedded js-ipfs running within webextension (browser context) comes with some limitations:

- Can't act as an HTTP gateway (extension uses public one as a fallback)
- Known to be CPU-hungry
  ([#450](https://github.com/ipfs-shipyard/ipfs-companion/issues/450),
  [ipfs/js-ipfs#1190](https://github.com/ipfs/js-ipfs/issues/1190)) over time,
- Lack of connection closing
  ([ipfs/js-ipfs#962](https://github.com/ipfs/js-ipfs/issues/962))
- The Embedded node _does not run_ when External node is selected.  Every time
  you switch back to the embedded node, a new instance is created on-demand. It
  can take [a few
  seconds](https://user-images.githubusercontent.com/157609/38493690-4a77bd9e-3bf3-11e8-85da-ba06fd94cdbf.gif)
  for a brand-new node to find peers.

When in doubt, run go-ipfs as External node instead.

## Public

Public node is not a part of the toggle UI. It is used as an implicit fallback for its Gateway functionality when External node is offline or Embedded node is used.
It does not expose API port.

