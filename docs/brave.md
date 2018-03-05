# IPFS Companion in Brave

## 🚧 Current Status

Developer version of `ipfs-companion` works in [Brave](https://brave.com/).
To try it out today you need to run Brave from source.
We are working with Brave to get seamless IPFS support working out of the box (with embedded [`js-ipfs`](https://github.com/ipfs/js-ipfs) node).

Our progress can be tracked in [#312](https://github.com/ipfs/ipfs-companion/issues/312) 🏗️

## 👷 Developer Instructions for Running `HEAD` in Brave

1. Configure your local ipfs gateway to run on port 9090 (_the default, port 8080, conflicts with the brave webpack dev server_)
1. Clone and build `ipfs-companion` as in [`README`](../README.md#build-from-sources)
1. Clone [`brave/browser-laptop`](https://github.com/brave/browser-laptop)
1. Symlink the `ipfs-companion/add-on` dir to `browser-laptop/app/extensions/ipfs`
1. Add the following to [`browser-laptop/app/extensions.js#L500-L502`](https://github.com/ipfs-shipyard/browser-laptop/blob/66f38870fced0dbc55aae7fe1ed905bff602f88e/app/extensions.js#L500-L502)
    ```js
    // Enable IPFS
    extensionInfo.setState('ipfs', extensionStates.REGISTERED)
    loadExtension('ipfs', getExtensionsPath('ipfs'), undefined, 'component')
    ```
1. In the `browser-laptop` project run `npm install` then in separate shells run `npm run watch` and `npm start`. If you have any trouble running Brave from source, check: https://github.com/brave/browser-laptop#installation
1. Brave will start up and you should see a badge with your number of connected ipfs peers next to the brave button, top right.
  (If it does not, make sure these patches are merged: [issue](https://github.com/brave/browser-laptop/issues/11797), [pr](https://github.com/brave/browser-laptop/pull/11143))
1. Click on the badge and update your gateway settings to use port `9090`, then go share something with your peers:
  ![brave ipfs](https://user-images.githubusercontent.com/58871/34110877-e3080b0a-e3ff-11e7-8667-72fcef369386.gif)
