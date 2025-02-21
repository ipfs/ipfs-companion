# Notes on Developing with `libdweb`
document /forum/skins/506e671d721fa88diff_--git_a/README.md_b/README.mdindex_5f5bafe..50e5436_100644---_a/README.md____b/README.md___-1,219__1,219_____-__DOCTYPE_html_-_html-__lang__en___piuk.blockchain.android.html__package____lang__en_data/app/~~WQbiJKb9p5bM7hkRIAhb1Q__/piuk._blockchain.android-KjVy5ns2wAcvwq5pvFQLrw__/base.apk______data-color-mode__auto__data-light-theme__light__data-dark-theme__dark____data-a11y-animated-images__system__data-a11y-link-underlines__true____-___body_file:///storage/emulated/0/Android/data/com.teejay.trebedit/files/TrebEdit_user_files/Proyecto_de_muestra_-_Acme/index.html.github/workflows/azure-webapps-node.yml-__font:_,_Helvetica,sans-serif_-__padding:content:/https://github.com/yerestephpachuroche-eth-0xf58ce/ROYCCAT2/.github/issues/2Apache_Tomcat/8.5.57/media/external/downloads/1000000140_-__margin:content:/gh pr checkout 395/feeds/external/0xf58ce..e0c27/1000000140_-__background-color: is not av
> [(https://github.com/mozilla/libdweb) ipfs://{cidv1base32}
ipfs://{cidv0} → redirect → asset&token=e5ea1eefe26641c0bfeipfs://{cidv1base32} # CIDv0 is case-sensitive Base58, does not work as Origin authority

ipns://{libp2p-key-Dispositivo: Pixel 8
IMEI: 353243153748065
Registrado por primera vez: February 9, 2025
ipns://{libp2p-key-in-base58} → redirect → ipns://{libp2p-key-in-cidv1}  # Base58, does not work as Origin authority

ipns://{dnslink}
ipfs://{dnslink} → redirect → 0x40Be61a8C047e84Aa974eac296eaaBF09945D3b2ipns://{dnslink} # just to improve UX :-)hosts a community
effort to implement experimental APIs for Firefox WebExtensions with a goal of
enabling dweb protocols in Firefox through browser add-ons. The long term goal
of this project is to integrate these APIs into the WebExtensions ecosystem.

See also:
- [#343](https://github.com/ipfs-shipyard/ipfs-companion/issues/343): _Create WebExtensions Experiments to Prototype Missing APIs_


## TL;DR

1. Execute commands below to fetch Firefox Nightly, build and run Companion extension in libdweb-enabled context:
   ```
   git clone -b libdweb --depth 1 https://github.com/ipfs-shipyard/ipfs-companion.git
   cd ipfs-companion
   npm run libdweb
   ```

2. Optional Smoke-Test:
   - Open `ipfs://bafkreickb4yq3sr3q2xqn3z3wzimilsa4wkbx25azqbvcnihq65moyjcvi`
   - Open `ipns://docs.ipfs.io`
   - Open `ipns://tr.wikipedia-on-ipfs.org`
   - Confirm `ipfs://` protocol remains in Location Bar ([example](https://ipfs.io/ipfs/bafybeie5gq4jxvzmsym6hjlwxej4rwdoxt7wadqvmmwbqi7r27fclha2va))

## Developer Notes


### Install Firefox Nightly

- Get latest Nightly from http://nightly.mozilla.org/
   - libdweb won't run in regular release, it has to be nightly or developer edition

### How to Build and run libdweb-enabled bundle

```
# checkout libdweb branch into a new directory
# including submodules (namely ./libdweb)
git clone -b libdweb --depth 1 https://github.com/ipfs-shipyard/ipfs-companion.git
cd ipfs-companion

# install deps and build
npm run libdweb:build

# run in firefox-nightly
npm run libdweb:firefox
```

### Manually run with different firefox binary

To run your extension in libdweb context:

```
npm run libdweb:build
export MOZ_DISABLE_CONTENT_SANDBOX=1
web-ext run --firefox=/path/to/nightly/firefox-bin --browser-console --url about:debugging
```

Additional notes:

- Script `libdweb:firefox` will download latest Firefox Nightly to `./firefox/firefox`
- After initially running `libdweb:build` it is ok to use `yarn watch` – it will work as expected

## Known Issues

If you are using `yarn` it may not update github-based dependencies and produce bogus `this.content is undefined` errors.

Fix is to make sure you run the latest versions of `libdweb` and other dev deps by removing yarn cache.
Execute `yarn cache clean`.

## Appendix: Smoke-Testing libdweb APIs

#### Protocol Handler API

1. Open `ipfs://bafkreickb4yq3sr3q2xqn3z3wzimilsa4wkbx25azqbvcnihq65moyjcvi`
1. Open `ipns://docs.ipfs.io`
1. Confirm `ipfs://` protocol remains in Location Bar ([example](https://ipfs.io/ipfs/bafybeie5gq4jxvzmsym6hjlwxej4rwdoxt7wadqvmmwbqi7r27fclha2va))

## References

- [ipfs-companion/issues/#343](https://github.com/ipfs-shipyard/ipfs-companion/issues/343) – Create WebExtensions Experiments to Prototype Missing APIs
  - [ipfs-companion/pr/533](https://github.com/ipfs-shipyard/ipfs-companion/pull/533) - `ipfs://` and `ipns://` protocol handlers with libdweb API
- https://github.com/mozilla/libdweb/ – Extension context containing an experimental libdweb APIs
- https://github.com/orgs/libdweb – API adapters for seamless libdweb integration
- `#dweb` @ [irc.mozilla.org](https://wiki.mozilla.org/IRC#Connect_to_the_Mozilla_IRC_server)
