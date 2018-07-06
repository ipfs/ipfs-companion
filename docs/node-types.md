# Node Types in IPFS Companion

> ![screenshot of node type switch](https://user-images.githubusercontent.com/157609/42382479-b4d98768-8134-11e8-979c-69b758846bf0.png)<br/>
> _IPFS Node Type selection_
----

> ### **TL;DR** when in doubt, run go-ipfs as _External_ node on your localhost:
> - [IPFS Desktop](https://github.com/ipfs-shipyard/ipfs-desktop) is a GUI app for Windows/Linux/Mac that installs and manages local IPFS node for you
> - If you prefer more on-hands approach:
>   - install IPFS node by hand: [Getting Started](https://ipfs.io/docs/getting-started/)
>   - or run it in [Docker](https://github.com/ipfs/go-ipfs#docker-usage)

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

It is a work in progress but can be used for development and experimentation
eg. for testing a dapp that uses `window.ipfs` without having to install and
start up your own IPFS daemon.

Power users can provide [custom config](https://github.com/ipfs/js-ipfs#faq) (eg. to enable experimental pubsub) [via _Preferences_](https://user-images.githubusercontent.com/157609/38084660-0b97c0cc-334e-11e8-9368-823345ced67f.png)

**Note** that at the time this note was created, Embedded js-ipfs running within webextension (browser context) comes with some limitations:

- Can't act as an HTTP gateway (extension uses public one as a fallback)
- Known to be CPU-hungry
  ([#450](https://github.com/ipfs-shipyard/ipfs-companion/issues/450),
  [ipfs/js-ipfs#1190](https://github.com/ipfs/js-ipfs/issues/1190)) over time, which may drain your battery,
- Missing DHT ([js-ipfs/#856](https://github.com/ipfs/js-ipfs/pull/856))
- Default transports limited to websockets ([js-ipfs/#1088](https://github.com/ipfs/js-ipfs/issues/1088))
    - Lack of connection closing
    ([ipfs/js-ipfs#962](https://github.com/ipfs/js-ipfs/issues/962))
    - Missing relay discovery ([js-ipfs/v0.29.x/examples/circuit-relaying](https://github.com/ipfs/js-ipfs/tree/v0.29.3/examples/circuit-relaying)) 
- The Embedded node _does not run_ when External node is selected.  Every time
  you switch back to the embedded node, a new instance is created on-demand. It
  can take [a few
  seconds](https://user-images.githubusercontent.com/157609/38493690-4a77bd9e-3bf3-11e8-85da-ba06fd94cdbf.gif)
  for a brand-new node to find peers.

When in doubt, run go-ipfs as External node instead.

## Public

Public node is not a part of the toggle UI. It is used as an implicit fallback for its Gateway functionality when External node is offline or Embedded node is used.
It does not expose API port.

