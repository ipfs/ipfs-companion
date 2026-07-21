# Release Process

Releases are cut by [release-please](https://github.com/googleapis/release-please). You do not bump the version or create tags by hand. The only manual work left is uploading the built extension to the Firefox Add-Ons and Chrome Web Store.

- [Release Process](#release-process)
  - [Cut the release](#cut-the-release)
  - [Manual fallback](#manual-fallback)
  - [Publish on Chrome Web Store](#publish-on-chrome-web-store)
  - [Publish on Firefox Add-Ons Store](#publish-on-firefox-add-ons-store)

## Cut the release

release-please watches `main` and keeps an open pull request titled `chore: release ipfs-companion vX.Y.Z`. It bumps the version in `package.json` and `add-on/manifest.common.json` and updates `CHANGELOG.md` from the conventional-commit history.

To ship:

- Review the open `chore: release ...` PR. The version bump and changelog are the review gate, so confirm they look right.
- Merge it.

On merge, CI does the rest:

- tags `vX.Y.Z` and publishes the GitHub release with auto-generated notes,
- builds the stable Chromium and Firefox bundles and attaches them to that release as `ipfs_companion-<version>_chromium.zip` and `ipfs_companion-<version>_firefox.zip` (this takes a few minutes after the release appears).

The zips attached to the release are what you upload to the stores below. To build the same bundles locally (for example, when a store reviewer asks for a reproducible build), run `npm run release-build`, which builds inside Docker for identical output across platforms.

## Manual fallback

If release-please or CI is down and a fix has to ship now, cut the release by hand. The store-publish steps below are the same either way.

- Bump the version to the new `X.Y.Z` in all three files so the next automated run stays in sync:
    - `package.json`
    - `add-on/manifest.common.json`
    - `.release-please-manifest.json` (the baseline release-please reads; skipping it is what breaks the following automated release)
- Add the matching `CHANGELOG.md` entry.
- Commit as `chore: release vX.Y.Z` and get it onto `main` (a quick PR, or directly if you have push access).
- Tag and push the merged commit:
    ```sh
    git tag vX.Y.Z && git push origin vX.Y.Z # keep the 'v' prefix
    ```
- Build the bundles locally (CI does not build them on a hand-pushed tag):
    ```sh
    npm run release-build
    ```
  The `build/` directory then holds `ipfs_companion-<version>_chromium.zip` and `ipfs_companion-<version>_firefox.zip`.
- Create the GitHub release from the `vX.Y.Z` tag at https://github.com/ipfs/ipfs-companion/releases, fill notes with GitHub's auto-generated release notes, and attach both zips.

## Publish on Chrome Web Store

All Chromium-based browsers support install from Chrome Web Store.
Brave, Opera, and Edge do not require additional publishing step.

- IPFS Companion Chrome Webstore: https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch
- Publishing requires your Google Account to belong to the IPFS Companion Maintainers Google Group (ask IPFS Stewards to be added).
- Go to Developer Dashboard and select publisher in the top right: `IPFS Shipyard`
- You should see `IPFS Companion` and `IPFS Companion (Beta @ xxxxxx). If not, select `Items` on the left menu.
- Select the correct extension you want to publish, usually `IPFS Companion`.
- Select `Package` on the left menu (Under the Build category).
- Upload the `ipfs_companion-<version>_chromium.zip` attached to the GitHub release.
- The new package goes to draft state automatically.
- Go to `Store listing` section from the left sub-menu. (This should happen automatically after uploading a new package).
- Click `Save Draft` and then `Submit for Review`.
- "Review" may take from a few hours to a few days. Google sends no email informing when new version is approved.
- Only way to check when it is published is to inspect the version number on the store listing or Dev Dashboard.

## Publish on [Firefox Add-Ons Store](https://addons.mozilla.org/)

- IPFS Companion Firefox Add-On: https://addons.mozilla.org/en-US/firefox/addon/ipfs-companion/
- Publishing requires logging into a [Developer Account](https://addons.mozilla.org/developers/) at Firefox Add-Ons site. The account needs to be marked as one of developers of IPFS Companion (ask IPFS Stewards to be added).
- Goto `Manage My Submissions` from the drop-down menu from your username.
- Select `IPFS Companion` item.
- On the left menu select `Manage Status & Versions`
- Open the latest one in a new tab because you'll need this for reference for copying listing details.
- Click `Upload a New Version`.
- Select the `ipfs_companion-<version>_firefox.zip` attached to the GitHub release.
- For `Compatibility` select both :
    - Firefox
    - Firefox for Android
- Optionally quickly check the validation report to see there are no blocking validations.
- Click continue.
- When asked: `Do you need to submit source code`  select `yes`
    - Go to the GitHub release and download the `.zip` with Source Code for the release tag.
    - Upload it to Mozilla.
- In the field asking for release notes just link to the release at Github
- Add Instructions/Notes for the reviewer (*Warning: if you forget, the release may be rejected during human review*):
    - Reuse the explanation from the previous release (ask reviewer to run the `npm run release-build` so they can run the build in a Docker container and get reproducible result across platforms)
- The new build is published immediately, but it will be reviewed in a week by a real human (unlike Chrome Web Store),  and can be taken down if it doesn’t meet the guidelines around privacy and reproducibility.
