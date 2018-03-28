# Localization Notes

### Table of Contents

* [Contributing Translations](#contributing-translations)
* [Running Chrome with specific locale](#running-chrome-with-specific-locale)
* [Running Firefox with specific locale](#running-firefox-with-specific-locale)

## Contributing Translations

Just go to https://crowdin.com/project/ipfs-companion  and start translating!

If your language is not present in `add-on/_locales` yet, but is supported by mainstream browsers
please create a [new issue](https://github.com/ipfs/ipfs-companion/issues/new) requesting it :+1: 

Same if anyone want to become a proofreader for a specific language:

> Difference between translators and proofreaders:
> 
> - translators can suggest translations for empty or translated strings and vote on existing ones
> - proofreader can translate and suggest (of course) but will lose their Voting feature to get a more powerful "Proofreader " button that allows them to approve or reject translations

Don't worry if GitHub does not reflect translations added at Crowdin:
translations are merged manually before every release.

It is a good idea to opt-in for email notifications about any new strings in future:
https://crowdin.com/settings#email

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

