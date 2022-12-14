# Release Process
---

This process can be used to push a manual release to the [Firefox Add-Ons](https://addons.mozilla.org/) and [Chrome Web Store](https://chrome.google.com/webstore/category/extensions). Before you can do that you need to:

- [Release Process](#release-process)
  - [Tag a Release](#tag-a-release)
  - [Build Release Artifacts](#build-release-artifacts)
  - [Publish on Chrome Web Store)](#publish-on-chrome-web-store)
  - [Publish on Firefox Add-Ons Store](#publish-on-firefox-add-ons-store)
  - [Release on Github.](#release-on-github)


## Tag a Release

- Bump `<semver>` version in `add-on/manifest.common.json`
- Create a PR for Release
    - Generate and push the tag to github
    ```sh
        git tag <semver> && git push && git push origin v<semver> # Don't forget the 'v'
    ```
    - Create draft release from https://github.com/ipfs/ipfs-companion/releases using the `<semver>`
    - Use github's auto release notes feature to fill release notes.

## Build Release Artifacts

- run `npm run release-build`
- `build` folder would contain three artifacts, one each for:
    - brave
    - chromium
    - firefox
- Attach these assets to the draft release.

## Publish on Chrome Webstore (this also applies to brave as brave uses the chrome webstore)

- IPFS Companion Chrome Webstore: https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch
- Make sure you are added to the IPFS companion maintainers google group.
- Go to Developer Dashboard and select publisher: `IPFS Shipyard`.
- Select `Package` from the left sub-menu.
- Upload the newly built package for chromium [earlier](#build-release-artifacts).
- The new package goes to draft state automatically.
- Go to `Store listing` section from the left sub-menu.
- Click `Save Draft` and then `Submit for Review`.
- Google sends no email informing when new version is approved.
- Only way to check it is to inspect the version number on the store listing or Dev Dashboard.

## Publish on [Firefox Add-Ons Store](https://addons.mozilla.org/)

- IPFS Companion Firefox Add-On: https://addons.mozilla.org/en-US/firefox/addon/ipfs-companion/
- Create a developer account with firefox store and send [@lidel](https://github.com/lidel) an email to get added to the extension management group.
- Goto `Manage My Submissions` from the drop-down menu from your username.
- Select `IPFS Companion` item.
- On the left menu select `Manage Status & Versions`
- Open the latest one in a new tab because you'll need this for reference for copying listing details.
- Click `Upload a New Version`.
- Select the asset generated [earlier](#build-release-artifacts).
- For `Compatibility` select both :
    - Firefox
    - Firefox for android
- Optionally quickly check the validation report to see there are no blocking validations.
- Click continue.
- When asked: `Do you need to submit source code`  select `yes`
    - Go to Github Release and download .zip with Source Code for the release tag.
    - Upload it to Mozilla.
- In the field asking for release notes just link to the release at Github
- Add Instructions/Notes for the reviewer (*Warning: if you forget, the release may be rejected during human review*):
    - Reuse the explanation from the previous release (ask reviewer to run the `npm run release-build` so they can run the build in a Docker container and get reproducible result across platforms)
- The new build is published immediately, but it will be reviewed in a week by a real human (unlike Chrome Web Store),  and can be taken down if it doesn’t meet the guidelines around privacy and reproducibility.

## Release on Github.

Release the draft release just created. That's it!
