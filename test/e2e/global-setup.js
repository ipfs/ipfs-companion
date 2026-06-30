import { mergeManifest } from '../../scripts/merge-manifest.js'

// Playwright loads the unpacked add-on/ directory as the extension, so its
// manifest.json must be the Chromium build, independent of the last build.
export default function globalSetup () {
  mergeManifest('chromium')
}
