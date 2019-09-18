# Firefox for Android

Firefox for Android is capable of running the same extensions as desktop version.

It makes it very useful for IPFS experimentation.

## Install


### Install Firefox for Android

All channels are available at Google Play Store:

- [Latest Stable](https://play.google.com/store/apps/details?id=org.mozilla.firefox&hl=en)
- [Latest Beta](https://play.google.com/store/apps/details?id=org.mozilla.firefox_beta)
- [Nightly](https://play.google.com/store/apps/details?id=org.mozilla.fennec_aurora)

### Install IPFS Companion

See [`README/#install`](https://github.com/ipfs-shipyard/ipfs-companion#install).
Developers can also test the latest code locally on emulator or via USB on own device (see below).

## Hot-deploy over USB

To run your extension in [Firefox for Android](https://www.mozilla.org/en-US/firefox/mobile/), follow these instructions:

- [Set up your computer and Android emulator or device](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Developing_WebExtensions_for_Firefox_for_Android#Set_up_your_computer_and_Android_emulator_or_device) (enable Developer Mode, USB Debugging etc)

Build everything and switch `add-on/manifest.json` to Fennec profile:

```
npm run dev-build
npm run bundle:fennec
```

With device connected to your development computer, run:

```
web-ext run -s add-on --target=firefox-android
```

It will list all connected devices with their IDs. If the list is empty, go back to the setup step.

Next, deploy extension to the specific device:

```
web-ext run -s add-on --target=firefox-android --android-device=<device ID>
```

The first time you run this command there may be a popup on your Android device asking if you want to grant access over USB.

## Debugging in Firefox for Android

Remote debug port will be printed to console right after successful deployment:

```
You can connect to this Android device on TCP port <debug PORT>
```

The fastest way to connect is to open `chrome://devtools/content/framework/connect/connect.xhtml` in Firefox the same machine you run `web-ext` from.

## References

- [MDN: Developing extensions for Firefox for Android](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Developing_WebExtensions_for_Firefox_for_Android)
