import { readFileSync, writeFileSync } from 'node:fs'

// Playwright loads the unpacked add-on/ directory as the extension, so its
// manifest.json must be the Chromium build. Merge it the same way the bundle
// scripts do (common + chromium), independent of whatever the last build left.
function deepMerge (base, override) {
  const out = { ...base }
  for (const [key, value] of Object.entries(override)) {
    out[key] = value !== null && typeof value === 'object' && !Array.isArray(value) && typeof out[key] === 'object'
      ? deepMerge(out[key], value)
      : value
  }
  return out
}

export default function globalSetup () {
  const common = JSON.parse(readFileSync('add-on/manifest.common.json', 'utf8'))
  const chromium = JSON.parse(readFileSync('add-on/manifest.chromium.json', 'utf8'))
  writeFileSync('add-on/manifest.json', JSON.stringify(deepMerge(common, chromium), null, 2))
}
