import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Fails when a host appears in the built extension that nobody signed off on. A
// dependency that adds an endpoint is the same change as writing that endpoint
// in add-on/src/, and nothing else in CI reads what a package does at runtime.
//
// This is a tripwire, not an inventory of what the extension contacts. It reads
// scheme-prefixed literals in shipped JavaScript, so a URL assembled at runtime
// never shows up, and shipped CSS, HTML, and source maps are outside the scan.
// Most entries below are documentation links the user chooses to open rather
// than endpoints Companion talks to.
//
// A new host goes on this list in the same PR that introduces it. One that is
// not a gateway, the user's own node, or a page the user chose to open needs a
// reason in the PR description. See AGENTS.md.

const DIST_DIR = 'add-on/dist'

// build:minimize-dist deletes these from the package, so they never ship. They
// are still on disk after a partial build (build:copy without a full build).
const NOT_SHIPPED = ['lib', 'contentScripts']

const allowedHosts = new Map([
  ['127.0.0.1', 'default Kubo RPC and gateway address on the user machine'],
  ['[::1]', 'loopback address of the user own node, IPv6 spelling'],
  ['localhost', 'default Kubo RPC and gateway address on the user machine'],
  ['ipfs.io', 'DEFAULT_PUBLIC_GATEWAY_URL in add-on/src/lib/options.js'],
  ['dweb.link', 'DEFAULT_PUBLIC_SUBDOMAIN_GATEWAY_URL in add-on/src/lib/options.js'],
  ['docs.ipfs.tech', 'documentation links in the options page and popup'],
  ['specs.ipfs.tech', 'spec links in code comments and help text'],
  ['blog.ipfs.tech', 'resource link on the welcome page'],
  ['discuss.ipfs.tech', 'forum links on the welcome page, and the page opened after an uninstall'],
  ['cid.ipfs.tech', 'CID converter linked from the invalid address page'],
  ['github.com', 'issue and source links'],
  ['developer.mozilla.org', 'browser API references in code comments'],
  ['bugs.chromium.org', 'browser bug references in code comments'],
  ['research.protocol.ai', 'tutorial links on the welcome page'],
  ['www.youtube.com', 'tutorial links on the welcome page'],
  ['www.w3.org', 'SVG and XML namespace identifiers, not a network request'],
  ['companion-origin', 'placeholder origin used when building redirect rules'],
  ['missing-origin', 'placeholder origin used when building redirect rules']
])

function shippedScripts (dir, relative = '') {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (relative === '' && NOT_SHIPPED.includes(entry.name)) continue
      out.push(...shippedScripts(join(dir, entry.name), join(relative, entry.name)))
    } else if (entry.name.endsWith('.js')) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

let scripts
try {
  scripts = shippedScripts(DIST_DIR)
} catch {
  console.error(`error: ${DIST_DIR} not found, run "npm run build" first`)
  process.exit(1)
}

if (scripts.length === 0) {
  console.error(`error: no JavaScript in ${DIST_DIR}, run "npm run build" first`)
  process.exit(1)
}

const found = new Map()
for (const path of scripts) {
  const source = readFileSync(path, 'utf8')
  for (const match of source.matchAll(/(?:https?|wss?):\/\/(\[[0-9a-fA-F:]+\]|[a-zA-Z0-9._%-]+)/gi)) {
    const host = match[1].toLowerCase()
    if (!found.has(host)) found.set(host, new Set())
    found.get(host).add(path)
  }
}

const unknown = [...found.keys()].filter(host => !allowedHosts.has(host)).sort()
const unused = [...allowedHosts.keys()].filter(host => !found.has(host)).sort()

if (unused.length > 0) {
  console.log(`note: allowed but no longer shipped: ${unused.join(', ')}`)
}

if (unknown.length > 0) {
  console.error(`error: ${unknown.length} host(s) in ${DIST_DIR} are not on the allowlist in scripts/check-bundle-hosts.js`)
  for (const host of unknown) {
    console.error(`  ${host}  (${[...found.get(host)].sort().join(', ')})`)
  }
  console.error('Add each one to the allowlist with a reason, or remove it from the source.')
  process.exit(1)
}

console.log(`ok: ${found.size} host(s) in ${scripts.length} shipped script(s), all on the allowlist`)
