# Localization Notes

### Table of Contents

* [Contributing Translations](#contributing-translations)
* [Running Chrome with specific locale](#running-chrome-with-specific-locale)
* [Running Firefox with specific locale](#running-firefox-with-specific-locale)

## Contributing Translations

Go to https://www.transifex.com/ipfs/ipfs-companion/, send a request to join specific language team and start translating!
You can also download raw files from Transifex, translate them in your own editor/tool and then upload them back there, but most of people prefer using Transifex GUI.

If your language is not present in `add-on/_locales` yet, but is supported by mainstream browsers
please create a [new issue](https://github.com/ipfs/ipfs-companion/issues/new) requesting it :+1: 

Don't worry if GitHub does not reflect translations added at Transifex:
translations are merged manually before every release, locale files at GitHub are often behind what is already translated at Transifex. It is a good idea to keep Transifex email notifications enabled to be notified about new strings to translate.

Thanks again for your translations!

## Running Chrome with specific locale

Chrome comes with locales out of the box, so it is enouh to set proper env:

    LANGUAGE=pl chromium --user-data-dir=`mktemp -d`

#### References
- [Language Codes in Chromium Project](https://src.chromium.org/viewvc/chrome/trunk/src/third_party/cld/languages/internal/languages.cc)

## Running Firefox with specific locale

Unless user installed locale-specific build, Firefox will have English only.  
If your build already has the locale you are interested in, skip step #2.

1. Set `intl.locale.requested` in `about:config` or commandline via:
   ```
   web-ext run --pref intl.locale.requested=pl
   ```
2. Install language pack from https://addons.mozilla.org/firefox/language-tools/
3. Reload browser extension – it should detect new locale


#### References
 - [How to change the language of the user interface](https://support.mozilla.org/en-US/kb/use-firefox-interface-other-languages-language-pack#w_how-to-change-the-language-of-the-user-interface)
 - [Language Codes at Mozilla](http://l10n.mozilla-community.org/webdashboard/)

