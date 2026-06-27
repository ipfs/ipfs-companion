import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'

// Deep-merge the shared manifest with a per-browser one and write add-on/manifest.json.
// Objects merge recursively; everything else (scalars, arrays) is overridden by the
// per-browser manifest. Replaces the `json --deep-merge` CLI used in the bundle scripts.
function deepMerge (base, override) {
  const out = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const mergeable = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
    out[key] = mergeable(value) && mergeable(out[key]) ? deepMerge(out[key], value) : value
  }
  return out
}

export function mergeManifest (target) {
  const common = JSON.parse(readFileSync('add-on/manifest.common.json', 'utf8'))
  const specific = JSON.parse(readFileSync(`add-on/manifest.${target}.json`, 'utf8'))
  writeFileSync('add-on/manifest.json', `${JSON.stringify(deepMerge(common, specific), null, 2)}\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2]
  if (target !== 'chromium' && target !== 'firefox') {
    console.error('usage: node scripts/merge-manifest.js <chromium|firefox>')
    process.exit(1)
  }
  mergeManifest(target)
}
