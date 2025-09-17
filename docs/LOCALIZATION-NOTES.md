# Localization in IPFS Companion

### Table of contents

- [Localization in IPFS Companion](#localization-in-ipfs-companion)
    - [Table of contents](#table-of-contents)
  - [Running Chrome with a specific locale](#running-chrome-with-a-specific-locale)
    - [Further resources](#further-resources)
  - [Running Firefox with a specific locale](#running-firefox-with-a-specific-locale)
    - [Further resources](#further-resources-1)
  - [Contributing translations](#contributing-translations)
  - [Translation synchronization](#translation-synchronization)

IPFS Companion supports running in specific locales, with translations provided by the community via Transifex.

## Running Chrome with a specific locale

Chrome comes with locales out of the box, so it is enough to set the proper env:

```go
LANGUAGE=pl chromium --user-data-dir=`mktemp -d`
```

### Further resources

- [Language Codes in Chromium Project](https://src.chromium.org/viewvc/chrome/trunk/src/third_party/cld/languages/internal/languages.cc)

## Running Firefox with a specific locale

Unless you've installed a locale-specific build, Firefox will have English only. If your build already has the locale you are interested in, skip step #2.

1. Set `intl.locale.requested` in `about:config` or the command line via:

   ```bash
   web-ext run --pref intl.locale.requested=pl
   ```

2. Install your language pack from https://addons.mozilla.org/firefox/language-tools/
3. Reload the browser extension; it should detect your new locale

### Further resources

- [Mozilla: Use Firefox in another language](https://support.mozilla.org/en-US/kb/use-firefox-interface-other-languages-language-pack#w_how-to-change-the-language-of-the-user-interface)
- [Mozilla: Locale Codes](https://wiki.mozilla.org/L10n:Locale_Codes)

## Contributing translations

Internationalization in IPFS Companion (and all IPFS-related projects) depends on the contributions of the community. You can give back by contributing translations in your language(s)! Go to the [IPFS Companion Transifex page](https://explore.transifex.com/ipfs/ipfs-companion/), send a request to join a specific language team, and start translating. You can also download raw files from Transifex, translate them in your own editor/tool, and then upload them back there, but many people prefer using the simple and friendly Transifex GUI.

If your language is not present in `add-on/_locales` yet, but is supported by mainstream browsers, please create a [new issue](https://github.com/ipfs/ipfs-companion/issues/new) requesting it.

## Translation synchronization

Translations sync automatically from Transifex weekly via `.github/workflows/tx-pull.yml`:
- Uses `--mode onlytranslated` to pull only translated strings
- Empty strings fallback to English via browser's i18n API at runtime
- Creates PR for review

**Note:** Edit translations only in Transifex. GitHub changes will be overwritten.
