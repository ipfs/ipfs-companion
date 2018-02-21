# Contributing

Contributions are always welcome!

## Creating New Issues

Do not hesitate and [create a new Issue](https://github.com/ipfs/ipfs-companion/issues/new) if you see a bug, room for improvement or simply have a question.

## Working on existing Issues

Feel free to work on issues that are [not assigned yet](https://github.com/ipfs/ipfs-companion/issues?utf8=✓&q=is%3Aissue+is%3Aopen+no%3Aassignee) and/or ones marked with [help wanted](https://github.com/ipfs/ipfs-companion/issues?q=is%3Aopen+label%3A%22help+wanted%22+no%3Aassignee) tag.  
As a courtesy, please add a comment informing  about your intent. That way we will not duplicate effort.

## Submitting Pull Requests

Just make sure your PR comes with its own tests and does pass [automated CI build](https://ci.ipfs.team/blue/organizations/jenkins/IPFS%20Shipyard%2Fipfs-companion/pr).
See the [GitHub Flow Guide](https://guides.github.com/introduction/flow/) for details.

Read section below to get familiar with tools and commands that will make your work easier.

## Translations

Submit PR with a new locale or improve existing ones via [Crowdin](https://crowdin.com/project/ipfs-companion).

## Development

You will need [NodeJS](https://nodejs.org/) and [Firefox](https://www.mozilla.org/en-US/firefox/developer/). Make sure `npm` and `firefox` are in your `PATH`.

It may be a good idea to use `yarn` instead of `npm`. We provide `yarn.lock` if you choose to do so.

### Installing Dependencies

To install all dependencies into to `node_modules` directory, execute:

```bash
npm install
```

### Firefox

One stop command to build, test and deploy add-on to Firefox:

```bash
npm start
```

### Chromium

First, build it manually:

```bash
npm run build
```

Then open up `chrome://extensions` in Chromium-based browser, enable "Developer mode", click "Load unpacked extension..." and point it at `add-on/manifest.json`

### Firefox for Android

To run your extension in [Firefox for Android](https://www.mozilla.org/en-US/firefox/mobile/), follow these instructions:

- [Set up your computer and Android emulator or device](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Developing_WebExtensions_for_Firefox_for_Android#Set_up_your_computer_and_Android_emulator_or_device) (enable Developer Mode, USB Debugging etc)

With device connected to your development computer, run:

```
web-ext run -s add-on --target=firefox-android
```

It will list all connected devices with their IDs. If the list is empty, go back to the setup step.

Next, deploy extension to the specific device:

```
web-ext run --target=firefox-android --android-device=<device ID>
```

The first time you run this command there may be a popup on your Android device asking if you want to grant access over USB.

#### Debugging in Firefox for Android

Remote debug port will be printed to console right after successful deployment:

```
You can connect to this Android device on TCP port <debug PORT>
```

The fastest way to connect is to open `chrome://devtools/content/framework/connect/connect.xhtml` in Firefox the same machine you run web-ext from.

## Useful Tasks

Each `npm` task can be run separately. The most useful ones are:

- `npm install` -- install all NPM dependencies
- `npm run build` -- build the add-on (copy external libraries, create `.zip` bundle)
- `npm run yarn-build` -- fast dependency install + build with yarn (installs and updates yarn.lock if needed)
- `npm run ci` -- reproducible test and build (with frozen yarn.lock)
- `npm test` -- run entire test suite
- `npm run lint` -- check for potential syntax problems (run all linters)
- `npm run lint:standard` -- run [standard](http://standardjs.com) linter ([IPFS JavaScript projects default to standard code style](https://github.com/ipfs/community/blob/master/js-project-guidelines.md#linting--code-style))
- `npm run lint:web-ext` -- run [addons-linter](https://github.com/mozilla/addons-linter) shipped with `web-ext` tool
- `npm run firefox` -- run as temporary add-on in Firefox

### Tips

- You can switch to alternative Firefox version by overriding your `PATH`:

  ```bash
  export PATH="/path/to/alternative/version/of/firefox/:${PATH}"
  ```

- [Testing persistent and restart features](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Testing_persistent_and_restart_features)
