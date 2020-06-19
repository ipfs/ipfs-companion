# Developer notes for IPFS Companion

### Table of contents

* [Build from source](#build-from-source)
    * [Clone and install dependencies](#clone-and-install-dependencies)
    * [Build and run in Firefox](#build-and-run-in-firefox)
    * [Build and manually install in Chromium](#build-and-manually-install-in-chromium)
    * [Run build on file changes](#run-build-on-file-changes)
* [Reproducible build in Docker](#reproducible-build-in-docker)
* [Useful tasks](#useful-tasks)
* [Other tips](#other-tips)
* [Legacy Firefox (< 53) and XUL-compatible browsers](#legacy-firefox--53-and-xul-compatible-browsers)
* [Using IPFS Companion on Firefox for Android](#using-ipfs-companion-on-firefox-for-android)
    * [Install Firefox for Android](#install-firefox-for-android)
    * [Install IPFS Companion](#install-ipfs-companion)
    * [Hot-deploy over USB](#hot-deploy-over-usb)
    * [Debugging in Firefox for Android](#debugging-in-firefox-for-android)
    * [Further resources](#further-resources)

## Build from source

If you're looking to develop on IPFS Companion, you should build the project from source. You will need [NodeJS](https://nodejs.org/) and [Firefox](https://www.mozilla.org/en-US/firefox/developer/). Make sure `npm` and `firefox` are in your `PATH`.

You can use `yarn` instead of `npm`. We provide `yarn.lock` if you choose to do so. This guide assumes you are using `npm`.

### Clone and install dependencies

First, clone the `ipfs-shipyard/ipfs-companion` [repository](https://github.com/ipfs-shipyard/ipfs-companion):

 ```bash
 git clone https://github.com/ipfs-shipyard/ipfs-companion.git
 ```

To install all dependencies into the `node_modules` directory, execute:

```bash
npm install
```

### Build and run in Firefox

Use this one-stop command to build, test and deploy the add-on to Firefox:

```bash
npm start        # all-in-one
```

If you run into issues, you can run each step manually to pinpoint where the process is failing:

```bash
npm run build    # build runs bundle:firefox at the end, so manifest will be ok
npm run test     # test suite
npm run firefox  # spawn new Firefox
```

It is also possible to load the extension manually. Enter `about:debugging` in the URL bar, and then click "Load Temporary Add-on" and point it at `add-on/manifest.json`.

### Build and manually install in Chromium

First, clone the repository:

 ```bash
 git clone https://github.com/ipfs-shipyard/ipfs-companion.git
 ```

Then build it manually:

```bash
npm run build bundle:chromium # last part is important: it overwrites manifest
```

Then open `chrome://extensions` in your Chromium-based browser, enable "Developer mode", click "Load unpacked extension..." and point it at the `add-on` folder within your project folder.

| Chrome "unpacked extension"                                                                                                                                                               | Firefox "temporary add-on"                                                                                                                                                               |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ![installing ipfs-companion as an unpacked extension in chrome](https://bafybeih34e3a5sgkh57lwv26c6253fxn2jdvte6ilhyld6l4ghuhybzldi.ipfs.dweb.link/ipfs-companion-install-chrome-dev.gif) | ![installing ipfs-companion as a temporary add on in firefox](https://bafybeih34e3a5sgkh57lwv26c6253fxn2jdvte6ilhyld6l4ghuhybzldi.ipfs.dweb.link/ipfs-companion-install-firefox-dev.gif) |

### Run build on file changes

Regular build minifies code and strips source maps. It is possible to run build  in the `watch` mode, which will rebuild a debug version of all changed bundles:

```bash
npm run build # do regular build first
npm run watch # watch for new changes
```

**Note:** `watch` is a blocking command, so one needs to run it in a different terminal than `firefox` or `chromium`. Press ctrl+c to stop it.


## Reproducible build in Docker

Want to ensure prebuilt bundle does not include any additional code?  
Don't want to install JS dependencies such as NodeJS and yarn?  

Do an isolated build inside of Docker!

Run the following command for ending up
with a built extension inside the `build/` directory:

```sh
npm run release-build
```

It is an alias for running `ci:build` script inside of immutable Docker image, which guarantees the same output on all platforms.

## Useful tasks

Each `npm` task can run separately, but most of the time, `dev-build`, `test`, and `fix:lint` are all you need.

- `npm install`: Install all NPM dependencies
- `npm run build`: Build the add-on (copy external libraries, create `.zip` bundles for Chrome and Firefox)
- `npm run watch`: Rebuild JS/CSS on file changes (run regular `build` first to ensure everything else is in place)
- `npm run bundle:chromium`: Overwrite manifest and package a generic, Chromium-compatible version
- `npm run bundle:brave`: Overwrite manifest and package a Brave-compatible version requesting access to `chrome.sockets`
- `npm run bundle:firefox`: Overwrite manifest and package a Firefox-compatible version
- `npm run build:rename-artifacts`: Rename artifacts to include runtimes in filenames
- `npm run ci`: Run tests and build (with frozen `yarn.lock`)
- `npm test`: Run the entire test suite
- `npm run lint`: Read-only check for potential syntax problems (run all linters)
- `npm run fix:lint`: Try to fix simple syntax problems (run `standard` with `--fix`, etc.)
- `npm run lint:standard`: Run [Standard](http://standardjs.com) linter ([IPFS JavaScript projects default to standard code style](https://github.com/ipfs/community/blob/master/CONTRIBUTING_JS.md))
- `npm run lint:web-ext`: Run [addons-linter](https://github.com/mozilla/addons-linter) shipped with `web-ext` tool
- `npm run firefox`: Run as temporary add-on in Firefox
- `npm run firefox:nightly`: Run as temporary add-on in Firefox Nightly (uses one in `./firefox/`, see `get-firefox-nightly` below)
- `npm run chromium`: Run as temporary add-on in Chromium
- `npm run get-firefox-nightly`: Fetch latest Firefox nightly build to `./firefox/`
- `npm run firefox:beta:add -- --update-link "https://host/path/to/file.xpi" file.xpi`: Add a manifest entry for new self-hosted beta for Firefox

Release build shortcuts:

- `npm run dev-build`: All-in-one: fast dependency install, build with yarn (updates yarn.lock if needed)
- `npm run beta-build`: Reproducible beta build in docker with frozen `yarn.lock`
- `npm run release-build`: Reproducible release build in docker with frozen `yarn.lock`

## Other tips

- You can switch to an alternative Firefox version by overriding your `PATH`:

  ```bash
  export PATH="/path/to/alternative/version/of/firefox/:${PATH}"
  ```

- [Using localization in IPFS Companion](LOCALIZATION-NOTES.md) (running browsers with specific locale, etc)
- [Testing persistent and restart features (Mozilla)](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Testing_persistent_and_restart_features)

## Legacy Firefox (< 53) and XUL-compatible browsers

Legacy versions `1.x.x` were based on currently deprecated Add-On SDK (Firefox-only).   
While it is not maintained any more, one can inspect, build, and install it using codebase from [legacy-sdk](https://github.com/ipfs/ipfs-companion/tree/legacy-sdk) branch. For historical background on the rewrite, see [Issue #20: Move to WebExtensions](https://github.com/ipfs/ipfs-companion/issues/20).

## Using IPFS Companion on Firefox for Android

Firefox for Android is capable of running some of the same extensions as the desktop version. This makes it very useful for experimenting with IPFS.

### Install Firefox for Android

All channels are available at the Google Play Store:

- [Latest stable](https://play.google.com/store/apps/details?id=org.mozilla.firefox&hl=en)
- [Latest beta](https://play.google.com/store/apps/details?id=org.mozilla.firefox_beta)

### Install IPFS Companion

For full installation instructions, see [`README/#install`](https://github.com/ipfs-shipyard/ipfs-companion#install) in the IPFS Companion repo.

You can also test the latest code locally on an emulator, or via USB on your own device. See below for details.

### Hot-deploy over USB

To run your extension in [Firefox for Android](https://www.mozilla.org/en-US/firefox/mobile/), follow these instructions:

- [Set up your computer and Android emulator or device](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Developing_WebExtensions_for_Firefox_for_Android#Set_up_your_computer_and_Android_emulator_or_device) (enable Developer Mode, USB debugging, etc.)

Build everything, and switch `add-on/manifest.json` to the Fennec profile:

```
npm run dev-build
npm run bundle:fennec
```

Then, with your device connected to your development computer, run:

```
web-ext run -s add-on --target=firefox-android
```

It will list all connected devices with their IDs. If the list is empty, go back to the setup step and try again.

Next, deploy your extension to the specific device:

```
web-ext run -s add-on --target=firefox-android --android-device=<device ID>
```

The first time you run this command, there may be a popup on your Android device asking if you want to grant access over USB.


### Debugging in Firefox for Android

The remote debug port will be printed to the console right after successful deployment:

```
You can connect to this Android device on TCP port <debug PORT>
```

The fastest way to connect is to open `chrome://devtools/content/framework/connect/connect.xhtml` in Firefox on the same machine you run `web-ext` from.

### Further resources

- [MDN: Developing extensions for Firefox for Android](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Developing_WebExtensions_for_Firefox_for_Android)
