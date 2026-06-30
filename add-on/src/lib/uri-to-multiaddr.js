import { isIPv4, isIPv6 } from 'is-ip'

const DEFAULT_PORTS = { http: '80', https: '443', ws: '80', wss: '443' }

/**
 * Convert a URI to a multiaddr string, e.g.
 *   http://127.0.0.1:5001 => /ip4/127.0.0.1/tcp/5001/http
 *   https://example.com   => /dns4/example.com/tcp/443/https
 *   http://[::1]:8080     => /ip6/::1/tcp/8080/http
 *
 * The single caller interpolates the result as a string, so this returns a
 * string directly. Replaces the uri-to-multiaddr dependency, which pulled a
 * second (multiformats@9) major into the bundle.
 *
 * @param {string} uri
 * @returns {string}
 */
export default function uriToMultiaddr (uri) {
  const { protocol, hostname, port } = new URL(uri)
  const scheme = protocol.slice(0, -1)
  const host = hostname[0] === '[' ? hostname.slice(1, -1) : hostname
  const hostTuple = isIPv4(host)
    ? `ip4/${host}`
    : isIPv6(host)
      ? `ip6/${host}`
      : `dns4/${hostname}`
  const transport = scheme === 'udp' ? 'udp' : 'tcp'
  const portNum = port || DEFAULT_PORTS[scheme] || ''
  const tail = scheme === 'tcp' || scheme === 'udp' ? '' : `/${scheme}`
  return `/${hostTuple}/${transport}/${portNum}${tail}`
}
