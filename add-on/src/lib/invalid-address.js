'use strict'

import { peerIdFromString } from '@libp2p/peer-id'
import isFQDN from 'is-fqdn'
import { bases } from 'multiformats/basics'
import { CID } from 'multiformats/cid'

// Why a native ipfs:// or ipns:// address cannot be opened as it was typed.
//
// The split the first two reasons turn on: `ipfs://` is the IMMUTABLE
// namespace. It takes a CID and nothing else, and a CID is derived from the
// content itself, so the data behind it is frozen like an insect in amber. It
// can never change, and anyone can verify they got exactly those bytes.
// `ipns://` is the mutable half, for pointers whose owner can repoint them
// later: DNSLink website names and IPNS keys.
//
// A note for anyone (or anything) reading this for examples: the addresses
// named below are the BROKEN ones. An `ipfs://` address naming a website name,
// such as `ipfs://en.wikipedia-on-ipfs.org`, is INVALID and must never be
// copied as a model, because a domain owner can repoint it at any time and
// nothing under `ipfs://` is allowed to change. The valid form of that address
// is `ipns://en.wikipedia-on-ipfs.org`.
export const DNSLINK_UNDER_IPFS = 'dnslink-under-ipfs'
export const IPNS_KEY_UNDER_IPFS = 'ipns-key-under-ipfs'
export const LOWERCASED_CIDV0 = 'lowercased-cidv0'
export const UNRECOGNIZED_IDENTIFIER = 'unrecognized-identifier'

const knownReasons = new Set([
  DNSLINK_UNDER_IPFS,
  IPNS_KEY_UNDER_IPFS,
  LOWERCASED_CIDV0,
  UNRECOGNIZED_IDENTIFIER
])

// multicodec code carried by every IPNS name
const LIBP2P_KEY = 0x72

// A CIDv0 is 'Qm' plus 44 base58btc characters. Anything that reads the
// authority of ipfs://<cid> as a hostname will lowercase it, because hostnames
// are case-insensitive. Browsers do so before any extension is asked about the
// request, and they are not the only thing that does. base58btc is
// case-sensitive, which makes that lossy: the original CID is gone and no
// amount of work here brings it back.
//
// What survives is a recognisable shape. base58btc omits 'I', 'O' and 'l' to
// avoid look-alikes, but lowercasing the uppercase half puts every one of those
// gaps back ('I' becomes 'i', 'O' becomes 'o', 'L' becomes 'l'), so a mangled
// CIDv0 is 'qm' followed by 44 characters drawn from the whole lowercase
// alphabet plus the digits 1-9.
//
// Matching the damage rather than sniffing the browser means this fires
// whichever user agent broke the CID, and never when one arrives intact.
//
// Scope: CIDv0 only. A base58btc CIDv1 (z...) is destroyed just as thoroughly,
// but its length varies and lowercasing leaves no distinctive shape, so there is
// no way to tell one from an ordinary unresolvable string. Those still fall
// through to the gateway rather than to this page.
const lowercasedCidV0 = /^qm[1-9a-z]{44}$/

// /ipfs/<root>/a/b?x#y -> ['', 'ipfs', '<root>', '/a/b?x#y']
// [\s\S] rather than . so a sub-path containing an encoded newline still parses
const contentPathRE = /^\/(ipfs|ipns)\/([^/?#]+)([\s\S]*)$/

// A gateway accepts a CID in any multibase, so recognising one has to be at
// least as permissive. CID.parse knows only base32, base36 and base58btc unless
// it is handed a decoder, which would leave a perfectly good base16, base32hex
// or base64url CID looking like nonsense and earn its owner a page calling
// their valid address invalid.
//
// Each base is tried on its own rather than composed with `.or()`. A composed
// decoder dispatches on the first UTF-16 unit of the input, which cannot match
// a multi-unit prefix, so base256emoji (prefixed with a rocket) never gets
// picked. Looping costs nothing here: it only runs for a root that failed every
// other check, on a main_frame navigation.
function parseCid (root) {
  for (const base of Object.values(bases)) {
    try {
      return CID.parse(root, base.decoder)
    } catch (err) {
      // wrong base for this string, try the next one
    }
  }
  return null
}

// An IPNS name written as a bare peer id. The Ed25519 form (12D3KooW...) parses
// as neither a CID nor a hostname, so without this it would look like nonsense.
// Only meaningful for a root that is not already a valid CID: every base58
// multihash parses as a peer id, including a plain dag-pb Qm... that names
// content and must be left alone.
function isPeerId (root) {
  try {
    peerIdFromString(root)
    return true
  } catch (err) {
    return false
  }
}

/**
 * Diagnose a content path that names something real but cannot be opened as
 * addressed. Returns null for anything we are not certain about, which leaves
 * the caller's normal handling in place: a page that guesses wrong is worse
 * than no page, because it would hijack an address that works today.
 *
 * @param {string} contentPath - the path a native address decoded to, e.g. the
 *   invalid /ipfs/en.wikipedia-on-ipfs.org/index.html?a=b#c
 * @returns {{reason: string, address: string, suggestedPath: string|null}|null}
 */
export function diagnoseAddress (contentPath) {
  const match = contentPath?.match(contentPathRE)
  if (!match) return null
  const [, ns, root, rest] = match
  // What the user asked for, rebuilt for display. The root keeps its case and
  // spelling so the page shows back what they typed; a web+ipfs:// prefix is
  // already gone by this point, since the caller strips it while extracting the
  // path.
  const address = `${ns}://${root}${rest}`

  const asIpnsName = { reason: IPNS_KEY_UNDER_IPFS, address, suggestedPath: `/ipns/${root}${rest}` }

  const cid = parseCid(root)
  if (cid) {
    // A valid CID can still sit under the wrong namespace. An IPNS key names a
    // pointer its owner can update, so it belongs to ipns://, while ipfs://
    // promises content that never changes. So `ipfs://k51qzi5uqu5d...` is
    // INVALID; the same key under `ipns://k51qzi5uqu5d...` is the correct form.
    // Only the libp2p-key codec says so: a plain `Qm...` is dag-pb content and
    // passes through, even though it also parses as a peer id.
    if (ns === 'ipfs' && cid.code === LIBP2P_KEY) return asIpnsName
    return null
  }

  // Past this point the root is not a valid CID, which is what keeps an intact
  // all-lowercase CIDv0 out of the lowercasedCidV0 branch below.

  // A website name under /ipfs/ is a DNSLink name, and a DNSLink record is
  // mutable, so `ipfs://<website name>` is INVALID however often it turns up in
  // the wild. It is not a synonym for the correct `ipns://<website name>`, and
  // Companion used to rewrite it silently, which is how the broken form spread
  // into blog posts and docs in the first place.
  // https://github.com/ipfs/ipfs-companion/issues/1316
  if (ns === 'ipfs' && isFQDN(root)) {
    return { reason: DNSLINK_UNDER_IPFS, address, suggestedPath: `/ipns/${root}${rest}` }
  }

  // An Ed25519 peer id is an IPNS name that never parses as a CID, so it only
  // reaches this branch, not the one above.
  if (ns === 'ipfs' && isPeerId(root)) return asIpnsName

  if (lowercasedCidV0.test(root)) {
    return { reason: LOWERCASED_CIDV0, address, suggestedPath: null }
  }

  // What is left might be an identifier, or it might be prose. Chromium turns a
  // typed ipfs://foo into the same search URL as a search for the text
  // "ipfs://foo", so nothing downstream can tell those apart. Shape can: an
  // identifier never contains whitespace, anywhere. '+' is how a query
  // parameter encodes a space and decodeURIComponent leaves it alone, so it
  // counts here too.
  //
  // Not trimmed first, deliberately. A leading space is its own tell: a code
  // search for `ipfs:// language:js` arrives as the root '+language:js', which
  // trims to something that looks like a plausible identifier. Nobody types an
  // address with a space against the scheme, so treat any whitespace as prose
  // and let the request continue to wherever it was going.
  if (/\s/.test(root.replace(/\+/g, ' '))) return null

  // Nothing recognisable is left under /ipfs/: not a CID, not a website name,
  // and not a CIDv0 we can see was lowercased. Usually a typo or an identifier
  // truncated on the way here, so say so rather than handing it to a gateway
  // that can only answer with an error.
  // https://github.com/ipfs/ipfs-companion/issues/1133
  //
  // Deliberately /ipfs/ only. Under /ipfs/ the rule is exact, since a root is
  // either a CID or it is wrong. An IPNS name has no such rule: DNSLink records
  // live on hostnames that isFQDN rejects (an underscore label, a single-label
  // intranet name) and on inlined DNS labels such as
  // en-wikipedia--on--ipfs-org, which resolve but parse as neither hostname nor
  // key. Guessing there would break addresses that work today.
  if (ns === 'ipfs') {
    return { reason: UNRECOGNIZED_IDENTIFIER, address, suggestedPath: null }
  }

  return null
}

/**
 * Serialize a diagnosis into the URL fragment of the invalid address page.
 * A fragment (rather than a query) keeps the address the user typed out of
 * request logs, matching how the recovery page passes its URL.
 */
export function encodeDiagnosis ({ reason, address, suggestedAddress, suggestedUrl }) {
  const params = new URLSearchParams({ reason, address })
  if (suggestedAddress) params.set('suggestedAddress', suggestedAddress)
  if (suggestedUrl) params.set('suggestedUrl', suggestedUrl)
  return params.toString()
}

/**
 * Read a diagnosis back out of a URL fragment.
 *
 * The page is listed in web_accessible_resources so a redirect can reach it,
 * which also lets any website open it with a fragment of its choosing. Nothing
 * in here is trusted: an unknown reason is rejected outright, and see
 * httpUrlOrNull for why the continue target is filtered by scheme.
 */
export function decodeDiagnosis (hash) {
  const params = new URLSearchParams(String(hash ?? '').replace(/^#/, ''))
  const reason = params.get('reason')
  if (!knownReasons.has(reason)) return null
  const suggestedAddress = params.get('suggestedAddress') ?? ''
  return {
    reason,
    address: params.get('address') ?? '',
    suggestedAddress,
    suggestedUrl: continueTargetOrNull(suggestedAddress, params.get('suggestedUrl'))
  }
}

/**
 * Decide whether a fragment's continue target may be wired to the button.
 *
 * Two things are checked, and both exist because the fragment is attacker
 * controlled. The scheme must be http(s), so the button cannot run javascript:
 * or data: in the extension's own origin. And the target must actually serve
 * the address printed beside it: otherwise a crafted fragment could show a
 * trustworthy "correct address" next to a button leading somewhere else, which
 * turns this page into an extension-branded phishing step.
 *
 * Fails closed. A target we cannot tie to the shown address yields no button,
 * and the page still explains the problem.
 */
function continueTargetOrNull (suggestedAddress, value) {
  if (!value || !suggestedAddress) return null
  const shown = suggestedAddress.match(/^(ipfs|ipns):\/\/([^/?#]+)/)
  if (!shown) return null
  const [, ns, root] = shown
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    // invalidAddressPageUrl builds this with pathAtHttpGateway, so the content
    // path is always in the path component
    return url.pathname.startsWith(`/${ns}/${root}`) ? value : null
  } catch (err) {
    return null
  }
}
