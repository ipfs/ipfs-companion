'use strict'
import { stub } from 'sinon'
import { describe, it, beforeEach, afterEach } from 'vitest'
import { expect } from 'chai'
import { URL } from 'url'
import { ipfsUri, ipfsContentPath, createIpfsPathValidator, sameGateway, safeHostname, toCaseInsensitiveRoot } from '../../../add-on/src/lib/ipfs-path.js'
import { initState } from '../../../add-on/src/lib/state.js'
import createDnslinkResolver from '../../../add-on/src/lib/dnslink.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
import { spoofCachedDnslink } from './dnslink.test.js'

function spoofIpfsResolve (ipfs, path, value) {
  const resolve = stub(ipfs, 'resolve')
  resolve.withArgs(path).resolves(value)
  resolve.throws((arg) => new Error(`Unexpected stubbed call ipfs.resolve(${arg})`))
}

// https://github.com/ipfs/ipfs-companion/issues/303
describe('ipfs-path.js', function () {
  let ipfs, state, dnslinkResolver, ipfsPathValidator

  beforeEach(function () {
    global.URL = URL
    // public gateways are empty by default; these cases exercise configured-gateway behavior
    state = Object.assign(
      initState({ ...optionDefaults, publicGatewayUrl: 'https://ipfs.io', publicSubdomainGatewayUrl: 'https://dweb.link' }),
      { peerCount: 1 }
    )
    ipfs = {
      name: {
        resolve (arg) {
          throw new Error(`Unexpected call ipfs.name.resolve(${arg})`)
        }
      },
      resolve (arg) {
        throw new Error(`Unexpected call ipfs.resolve(${arg})`)
      }
    }
    dnslinkResolver = createDnslinkResolver(() => state)
    ipfsPathValidator = createIpfsPathValidator(() => state, () => ipfs, dnslinkResolver)
  })

  afterEach(function () {
    if (ipfs.name.resolve.reset) ipfs.name.resolve.reset()
    if (ipfs.resolve.reset) ipfs.resolve.reset()
  })

  // TODO: move to some lib?
  describe('ipfsContentPath', function () {
    it('should detect /ipfs/ path in URL from a public gateway', function () {
      const url = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar'
      expect(ipfsContentPath(url)).to.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar')
    })
    it('should detect /ipfs/ path in detached IPFS path', function () {
      const path = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar'
      expect(ipfsContentPath(path)).to.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar')
    })
    it('should detect /ipns/ path in URL from a public gateway', function () {
      const url = 'https://ipfs.io/ipns/libp2p.io/bundles/'
      expect(ipfsContentPath(url)).to.equal('/ipns/libp2p.io/bundles/')
    })
    it('should detect /ipns/ path in detached IPFS path', function () {
      const path = '/ipns/libp2p.io/bundles/'
      expect(ipfsContentPath(path)).to.equal('/ipns/libp2p.io/bundles/')
    })
    it('should drop search and hash from URL by default', function () {
      const url = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsContentPath(url)).to.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')
    })
    it('should keep search and hash from URL if keepURIParams=true', function () {
      const url = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsContentPath(url, { keepURIParams: true })).to.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should drop search and hash in detached IPFS path by default', function () {
      const path = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsContentPath(path)).to.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')
    })
    it('should preserve search and hash in detached IPFS path if keepURIParams=true', function () {
      const path = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsContentPath(path, { keepURIParams: true })).to.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should decode special characters in URL', function () {
      const url = 'https://ipfs.io/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1%20-%20Barrel%20-%20Part%201'
      expect(ipfsContentPath(url)).to.equal('/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1 - Barrel - Part 1')
    })
    it('should decode special characters in path', function () {
      const path = '/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1%20-%20Barrel%20-%20Part%201'
      expect(ipfsContentPath(path)).to.equal('/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1 - Barrel - Part 1')
    })
    it('should resolve CID-in-subdomain URL to IPFS path', function () {
      const url = 'https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(ipfsContentPath(url)).to.equal('/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html')
    })
    it('should resolve CID(libp2p-key)-in-subdomain URL to IPNS path', function () {
      const url = 'https://k2k4r8ncs1yoluq95unsd7x2vfhgve0ncjoggwqx9vyh3vl8warrcp15.ipns.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(ipfsContentPath(url)).to.equal('/ipns/k2k4r8ncs1yoluq95unsd7x2vfhgve0ncjoggwqx9vyh3vl8warrcp15/wiki/Mars.html')
    })
    it('should resolve dnslink-in-subdomain URL to IPNS path', function () {
      const url = 'http://en.wikipedia-on-ipfs.org.ipns.localhost:8080/wiki/Mars.html?argTest#hashTest'
      expect(ipfsContentPath(url)).to.equal('/ipns/en.wikipedia-on-ipfs.org/wiki/Mars.html')
    })
    it('should resolve inlined-dnslink-in-subdomain URL to IPNS path', function () {
      const url = 'https://en-wikipedia--on--ipfs-org.ipns.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(ipfsContentPath(url)).to.equal('/ipns/en.wikipedia-on-ipfs.org/wiki/Mars.html')
    })
    it('should return null if there is no valid path for input URL', function () {
      const url = 'https://foo.io/invalid/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsContentPath(url)).to.equal(null)
    })
    it('should return null if there is no valid path for input path', function () {
      const path = '/invalid/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
      expect(ipfsContentPath(path)).to.equal(null)
    })
  })

  describe('safeHostname', function () {
    it('should return URL.hostname on http URL', function () {
      const url = 'https://example.com:8080/path/file.txt'
      expect(safeHostname(url)).to.equal('example.com')
    })
    it('should return null on error', function () {
      const url = ''
      expect(safeHostname(url)).to.equal(null)
    })
  })

  // TODO: move to some lib?
  describe('ipfsUri', function () {
    it('should detect /ipfs/ path in URL from a public gateway', function () {
      const url = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar'
      expect(ipfsUri(url)).to.equal('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/foo/bar')
    })
    it('should detect /ipfs/ path in detached IPFS path', function () {
      const path = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar'
      expect(ipfsUri(path)).to.equal('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/foo/bar')
    })
    it('should detect /ipns/ path in URL from a public gateway', function () {
      const url = 'https://ipfs.io/ipns/libp2p.io/bundles/'
      expect(ipfsUri(url)).to.equal('ipns://libp2p.io/bundles/')
    })
    it('should detect /ipns/ path in detached IPFS path', function () {
      const path = '/ipns/libp2p.io/bundles/'
      expect(ipfsUri(path)).to.equal('ipns://libp2p.io/bundles/')
    })
    it('should keep search and hash from original URL', function () {
      const url = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsUri(url)).to.equal('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi?argTest#hashTest')
    })
    it('should preserve search and hash in detached IPFS path', function () {
      const path = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsUri(path)).to.equal('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi?argTest#hashTest')
    })
    it('should decode special characters in URL', function () {
      const url = 'https://ipfs.io/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1%20-%20Barrel%20-%20Part%201'
      expect(ipfsUri(url)).to.equal('ipfs://bafybeif6fbogj4sog6hkbvsdktotjbumcmotnwky2z3cmc7imgbr27mc4u/1 - Barrel - Part 1')
    })
    it('should decode special characters in path', function () {
      const path = '/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1%20-%20Barrel%20-%20Part%201'
      expect(ipfsUri(path)).to.equal('ipfs://bafybeif6fbogj4sog6hkbvsdktotjbumcmotnwky2z3cmc7imgbr27mc4u/1 - Barrel - Part 1')
    })
    it('should resolve CID-in-subdomain URL to IPFS path', function () {
      const url = 'https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(ipfsUri(url)).to.equal('ipfs://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest')
    })
    it('should return null if there is no valid path for input URL', function () {
      const url = 'https://foo.io/invalid/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsUri(url)).to.equal(null)
    })
    it('should return null if there is no valid path for input path', function () {
      const path = '/invalid/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
      expect(ipfsUri(path)).to.equal(null)
    })
    it('should normalize a CIDv0 to a base32 CIDv1 ipfs:// URI', function () {
      expect(ipfsUri('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')).to.equal('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
    })
    it('should normalize an RSA ipns peer id to a base36 libp2p-key ipns:// URI', function () {
      expect(ipfsUri('/ipns/QmbCMUZw6JFeZ7Wp9jkzbye3Fzp2GVcPEjHP52ijStQBEs/x')).to.equal('ipns://k2k4r8o6f2xzvywvsl380r29ur6qm6k4f6qhp5tkmsms4h9rvxe45g50/x')
    })
    it('should normalize an Ed25519 ipns peer id to a base36 libp2p-key ipns:// URI', function () {
      expect(ipfsUri('/ipns/12D3KooWD3eckifWpRn9wQpMG9R9hX3sD158z7EqHWmweQAJU5SA')).to.equal('ipns://k51qzi5uqu5dhdmyb9bd18pypu2wp5lpv2xnskfmrqa4lb5knqryrotb05e7or')
    })
    it('should leave a DNSLink hostname ipns:// URI unchanged', function () {
      expect(ipfsUri('/ipns/docs.ipfs.tech/concepts/')).to.equal('ipns://docs.ipfs.tech/concepts/')
    })
  })

  describe('toCaseInsensitiveRoot', function () {
    it('normalizes an ipfs CIDv0 to base32 CIDv1', function () {
      expect(toCaseInsensitiveRoot('ipfs', 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')).to.equal('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
    })
    it('leaves an already base32 ipfs CIDv1 unchanged', function () {
      const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      expect(toCaseInsensitiveRoot('ipfs', cid)).to.equal(cid)
    })
    it('normalizes an ipns peer id to a base36 libp2p-key CIDv1', function () {
      expect(toCaseInsensitiveRoot('ipns', '12D3KooWD3eckifWpRn9wQpMG9R9hX3sD158z7EqHWmweQAJU5SA')).to.equal('k51qzi5uqu5dhdmyb9bd18pypu2wp5lpv2xnskfmrqa4lb5knqryrotb05e7or')
    })
    it('leaves an ipns DNSLink hostname unchanged', function () {
      expect(toCaseInsensitiveRoot('ipns', 'docs.ipfs.tech')).to.equal('docs.ipfs.tech')
    })
    it('returns the root unchanged when it cannot be parsed', function () {
      expect(toCaseInsensitiveRoot('ipfs', 'not-a-cid')).to.equal('not-a-cid')
      expect(toCaseInsensitiveRoot('ipns', 'not-a-peer-id')).to.equal('not-a-peer-id')
    })
    it('throws on an unsupported namespace', function () {
      expect(() => toCaseInsensitiveRoot('ipld', 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')).to.throw(/unsupported namespace/)
    })
  })

  describe('sameGateway', function () {
    it('should return true on direct host match', function () {
      const url = 'https://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar'
      const gw = 'http://127.0.0.1:8080'
      expect(sameGateway(url, gw)).to.equal(true)
    })
    it('should return true on localhost/127.0.0.1 host match', function () {
      const url = 'https://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar'
      const gw = 'http://127.0.0.1:8080'
      expect(sameGateway(url, gw)).to.equal(true)
    })
    it('should return true on 127.0.0.1/localhost host match', function () {
      const url = 'https://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar'
      const gw = 'http://localhost:8080'
      expect(sameGateway(url, gw)).to.equal(true)
    })
    it('should return true on localhost subdomain host match', function () {
      const url = 'http://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.localhost:8080/foo/bar'
      const gw = 'http://localhost:8080'
      expect(sameGateway(url, gw)).to.equal(true)
    })
    it('should return true on RPC webui path 127.0.0.1/0.0.0.0 host match', function () {
      // this is misconfiguration, but handling it in sameGateway ensures users who do this dont waste our time debugging
      const url = 'http://0.0.0.0:5001/webui'
      const api = 'http://127.0.0.1:5001'
      expect(sameGateway(url, api)).to.equal(true)
    })
    it('should return true on RPC /api/v0 path 127.0.0.1/0.0.0.0 host match', function () {
      // this is misconfiguration, but handling it in sameGateway ensures users who do this dont waste our time debugging
      const url = 'http://0.0.0.0:5001/api/v0/id'
      const api = 'http://127.0.0.1:5001'
      expect(sameGateway(url, api)).to.equal(true)
    })
    it('should return false on hostname match but different port', function () {
      const url = 'https://localhost:8081/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar'
      const gw = 'http://localhost:8080'
      expect(sameGateway(url, gw)).to.equal(false)
    })
    it('should return false when the gateway is not configured', function () {
      const url = 'https://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar'
      expect(sameGateway(url, undefined)).to.equal(false)
    })
  })

  describe('validIpfsOrIpns', function () {
    // this is just a smoke test, extensive tests are in is-ipfs package
    it('should return true for IPFS NURI', async function () {
      const path = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(await ipfsPathValidator.validIpfsOrIpns(path)).to.equal(true)
    })
    it('should return false for non-IPFS NURI', async function () {
      const path = '/ipfs/NotAValidCid'
      expect(await ipfsPathValidator.validIpfsOrIpns(path)).to.equal(false)
    })
    // this is just a smoke test, extensive tests are in is-ipfs package
    it('should return true for URL at IPFS Gateway', async function () {
      const url = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(await ipfsPathValidator.validIpfsOrIpns(url)).to.equal(true)
    })
    it('should return false for non-IPFS URL', async function () {
      const url = 'https://ipfs.io/ipfs/NotACid?argTest#hashTest'
      expect(await ipfsPathValidator.validIpfsOrIpns(url)).to.equal(false)
    })
  })

  describe('publicIpfsOrIpnsResource', function () {
    it('should return true for URL at Public IPFS Gateway', async function () {
      const url = `${state.pubGwURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
      expect(await ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(true)
    })
    it('should return false for URL at Local IPFS Gateway', async function () {
      const url = `${state.gwURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
      expect(await ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(false)
    })
    it('should return false for IPFS URL at API port', async function () {
      const url = `${state.apiURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
      expect(await ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(false)
      expect(await ipfsPathValidator.validIpfsOrIpns(url)).to.equal(true)
    })
    it('should return false for non-IPFS URL', async function () {
      const url = 'https://ipfs.io/ipfs/NotACid?argTest#hashTest'
      expect(await ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(false)
      expect(await ipfsPathValidator.validIpfsOrIpns(url)).to.equal(false)
    })
    describe('isIpfsPageActionsContext', function () {
      it('should return true for URL at Public IPFS Gateway', function () {
        const url = `${state.pubGwURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
        expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(true)
      })
      it('should return true for URL at Local IPFS Gateway', function () {
        const url = `${state.gwURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
        expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(true)
      })
      it('should return false for IPFS URL at API port', async function () {
        const url = `${state.apiURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
        expect(await ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(false)
        expect(await ipfsPathValidator.validIpfsOrIpns(url)).to.equal(true)
      })
      it('should return false for non-IPFS URL', async function () {
        const url = 'https://ipfs.io/ipfs/NotACid?argTest#hashTest'
        expect(await ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(false)
        expect(await ipfsPathValidator.validIpfsOrIpns(url)).to.equal(false)
      })
    })
  })

  describe('isIpfsPageActionsContext', function () {
    it('should return true for URL at a Gateway', function () {
      const url = 'https://example.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(true)
    })
    it('should return true for URL at a Gateway with Base32 CIDv1 in subdomain', function () {
      // context-actions are shown on publick gateways that use CID in subdomain as well
      const url = 'http://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy.ipfs.dweb.link/'
      expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(true)
    })
    it('should return false for URL at a Gateway with Base58 CIDv0 in subdomain', function () {
      // should not be allowed, but who knows
      const url = 'http://QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR.ipfs.dweb.link/'
      expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(false)
    })
    it('should return false for non-IPFS URL', function () {
      const url = 'https://example.com/ipfs/NotACid?argTest#hashTest'
      expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(false)
    })
  })

  describe('isRedirectPageActionsContext', function () {
    it('should return true for /ipfs/ URL at a Gateway', function () {
      const url = 'https://example.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsPathValidator.isRedirectPageActionsContext(url)).to.equal(true)
    })
    it('should return true for /ipns/ URL at Local Gateway', function () {
      const url = `${state.gwURL}ipns/docs.ipfs.io/?argTest#hashTest`
      expect(ipfsPathValidator.isRedirectPageActionsContext(url)).to.equal(true)
    })
    it('should return false for /ipfs/ URL at Local Gateway', function () {
      const url = `${state.gwURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
      expect(ipfsPathValidator.isRedirectPageActionsContext(url)).to.equal(false)
    })
    it('should return false for IPFS content loaded from IPFS API port', function () {
      const url = `${state.apiURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
      expect(ipfsPathValidator.isRedirectPageActionsContext(url)).to.equal(false)
    })
    it('should return true for URL at IPFS Gateway with Base32 CIDv1 in subdomain', function () {
      // context-actions are shown on publick gateways that use CID in subdomain as well
      const url = 'http://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy.ipfs.dweb.link/'
      expect(ipfsPathValidator.isRedirectPageActionsContext(url)).to.equal(true)
    })
    it('should return true for non-IPFS HTTP URL', function () {
      const url = 'http://en.wikipedia.org/wiki/Main_Page'
      expect(ipfsPathValidator.isRedirectPageActionsContext(url)).to.equal(true)
    })
    it('should return true for non-IPFS HTTPS URL', function () {
      const url = 'https://en.wikipedia.org/wiki/Main_Page'
      expect(ipfsPathValidator.isRedirectPageActionsContext(url)).to.equal(true)
    })
    it('should return false for non-HTTP URL', function () {
      const url = 'moz-extension://85076b5e-900c-428f-4bf6-e6c1a33042a7/blank-page.html'
      expect(ipfsPathValidator.isRedirectPageActionsContext(url)).to.equal(false)
    })
  })

  describe('resolveToPublicUrl', function () {
    it('should resolve URL with CID-in-subdomain to itself', async function () {
      const url = 'https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToPublicUrl(url)).to.equal(url)
    })
    it('should resolve URL with /ipfs/ path to the default public gateway', async function () {
      const url = 'https://example.com/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToPublicUrl(url)).to.equal(`${state.pubGwURL}ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest`)
    })
    it('should resolve /ipfs/ path to itself attached to the default public gateway', async function () {
      const path = '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToPublicUrl(path)).to.equal(`${state.pubGwURL}ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest`)
    })
    it('should resolve URL with /ipns/ path to the default public gateway', async function () {
      const url = 'https://example.com/ipns/docs.ipfs.io/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToPublicUrl(url)).to.equal(`${state.pubGwURL}ipns/docs.ipfs.io/?argTest#hashTest`)
    })
    it('should resolve /ipns/ path to itself at the default public gateway', async function () {
      const path = '/ipns/docs.ipfs.io/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToPublicUrl(path)).to.equal(`${state.pubGwURL}ipns/docs.ipfs.io/?argTest#hashTest`)
    })
    it('should resolve non-IPFS URL to itself (DNSLink websites)', async function () {
      const url = 'https://example.com/foo/bar/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToPublicUrl(url)).to.equal(url)
    })
    it('should resolve to null if input is an invalid path', async function () {
      const path = '/foo/bar/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToPublicUrl(path)).to.equal(null)
    })
    it('should resolve to null if input is an invalid URL', async function () {
      const url = 'example.com/foo/bar/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToPublicUrl(url)).to.equal(null)
    })
  })

  describe('resolveToShareableUrl (Copy Shareable Link)', function () {
    // default config: public gateways empty, so shareable links are native URIs
    let nativeValidator
    beforeEach(function () {
      const nativeState = Object.assign(initState(optionDefaults), { peerCount: 1 })
      nativeValidator = createIpfsPathValidator(() => nativeState, () => ipfs, dnslinkResolver)
    })
    it('copies a native ipfs:// URI for CID-in-subdomain', async function () {
      const url = 'https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(await nativeValidator.resolveToShareableUrl(url)).to.equal('ipfs://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest')
    })
    it('copies a native ipfs:// URI for an /ipfs/ path', async function () {
      const path = '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      expect(await nativeValidator.resolveToShareableUrl(path)).to.equal('ipfs://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest')
    })
    it('copies a native ipns:// URI for an /ipns/ path', async function () {
      const path = '/ipns/docs.ipfs.io/?argTest#hashTest'
      expect(await nativeValidator.resolveToShareableUrl(path)).to.equal('ipns://docs.ipfs.io/?argTest#hashTest')
    })
    it('copies a native ipns:// URI for an inlined DNSLink subdomain', async function () {
      const url = 'https://en-wikipedia--on--ipfs-org.ipns.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(await nativeValidator.resolveToShareableUrl(url)).to.equal('ipns://en.wikipedia-on-ipfs.org/wiki/Mars.html?argTest#hashTest')
    })
    // opted into public sharing; overrides set the gateway URLs + Use Subdomains
    const optedInValidator = (overrides) => {
      const state = Object.assign(initState({ ...optionDefaults, usePublicGatewaysForShare: true, ...overrides }), { peerCount: 1 })
      return createIpfsPathValidator(() => state, () => ipfs, dnslinkResolver)
    }
    const cidPath = '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
    const bothGateways = { publicGatewayUrl: 'https://ipfs.io', publicSubdomainGatewayUrl: 'https://dweb.link' }
    it('public share with Use Subdomains on uses the subdomain gateway', async function () {
      const v = optedInValidator({ ...bothGateways, useSubdomains: true })
      expect(await v.resolveToShareableUrl(cidPath)).to.equal('https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest')
    })
    it('public share with Use Subdomains off uses the path gateway', async function () {
      const v = optedInValidator({ ...bothGateways, useSubdomains: false })
      expect(await v.resolveToShareableUrl(cidPath)).to.equal('https://ipfs.io/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest')
    })
    it('public share falls back to the only configured gateway (path) with Use Subdomains on', async function () {
      const v = optedInValidator({ publicGatewayUrl: 'https://ipfs.io', publicSubdomainGatewayUrl: '', useSubdomains: true })
      expect(await v.resolveToShareableUrl(cidPath)).to.equal('https://ipfs.io/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest')
    })
    it('public share falls back to the only configured gateway (subdomain) with Use Subdomains off', async function () {
      const v = optedInValidator({ publicGatewayUrl: '', publicSubdomainGatewayUrl: 'https://dweb.link', useSubdomains: false })
      expect(await v.resolveToShareableUrl(cidPath)).to.equal('https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest')
    })
    it('public share of a DNSLink page keeps the FQDN with a subdomain gateway', async function () {
      const v = optedInValidator({ ...bothGateways, useSubdomains: true })
      const url = 'https://docs.ipfs.tech/concepts/'
      spoofCachedDnslink('docs.ipfs.tech', dnslinkResolver, '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa')
      expect(await v.resolveToShareableUrl(url)).to.equal('https://docs.ipfs.tech/concepts/')
    })
  })

  describe('resolveToPublicUrl (no public gateway configured)', function () {
    let nativeValidator
    beforeEach(function () {
      const nativeState = Object.assign(initState(optionDefaults), { peerCount: 1 })
      nativeValidator = createIpfsPathValidator(() => nativeState, () => ipfs, dnslinkResolver)
    })
    it('falls back to a native ipfs:// URI for CID-in-subdomain', async function () {
      const url = 'https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(await nativeValidator.resolveToPublicUrl(url)).to.equal('ipfs://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest')
    })
    it('falls back to a native ipfs:// URI for an /ipfs/ path', async function () {
      const path = '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      expect(await nativeValidator.resolveToPublicUrl(path)).to.equal('ipfs://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest')
    })
  })

  describe('resolveToPermalink (Copy Snapshot Link)', function () {
    const ipnsPointer = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
    // state (outer beforeEach) has public gateways set but the share toggle off
    it('copies an immutable native ipfs:// URI when the share toggle is off', async function () {
      const url = 'https://example.com/ipns/docs.ipfs.io/concepts/glossary/?argTest#hashTest'
      spoofIpfsResolve(ipfs, '/ipns/docs.ipfs.io', ipnsPointer)
      // native permalink normalizes the CIDv0 to a base32 CIDv1
      expect(await ipfsPathValidator.resolveToPermalink(url)).to.equal('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/concepts/glossary/?argTest#hashTest')
    })
    it('public permalink with Use Subdomains off uses the path gateway', async function () {
      const optedIn = Object.assign(
        initState({ ...optionDefaults, publicGatewayUrl: 'https://ipfs.io', publicSubdomainGatewayUrl: 'https://dweb.link', usePublicGatewaysForShare: true, useSubdomains: false }),
        { peerCount: 1 }
      )
      const validator = createIpfsPathValidator(() => optedIn, () => ipfs, dnslinkResolver)
      spoofIpfsResolve(ipfs, '/ipns/libp2p.io', ipnsPointer)
      expect(await validator.resolveToPermalink('/ipns/libp2p.io/?argTest#hashTest')).to.equal(`https://ipfs.io${ipnsPointer}/?argTest#hashTest`)
    })
    it('public permalink with Use Subdomains on uses the subdomain gateway', async function () {
      const optedIn = Object.assign(
        initState({ ...optionDefaults, publicGatewayUrl: 'https://ipfs.io', publicSubdomainGatewayUrl: 'https://dweb.link', usePublicGatewaysForShare: true, useSubdomains: true }),
        { peerCount: 1 }
      )
      const validator = createIpfsPathValidator(() => optedIn, () => ipfs, dnslinkResolver)
      spoofIpfsResolve(ipfs, '/ipns/libp2p.io', ipnsPointer)
      // immutable CIDv0 normalizes to base32 in the subdomain label
      expect(await validator.resolveToPermalink('/ipns/libp2p.io/?argTest#hashTest')).to.equal('https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/?argTest#hashTest')
    })
  })

  describe('resolveToIpfsPath', function () {
    it('should resolve URL with CID-in-subdomain to /ipfs/<cid> path', function () {
      const url = 'https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(ipfsPathValidator.resolveToIpfsPath(url)).to.equal('/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest')
    })
    it('should resolve URL with /ipfs/ path to the path itself', function () {
      const url = 'https://example.com/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      expect(ipfsPathValidator.resolveToIpfsPath(url)).to.equal('/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest')
    })
    it('should resolve /ipfs/ path to itself', function () {
      const path = '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      expect(ipfsPathValidator.resolveToIpfsPath(path)).to.equal(path)
    })
    it('should resolve URL with /ipns/ path to the path itself', function () {
      const url = 'https://example.com/ipns/docs.ipfs.io/?argTest#hashTest'
      expect(ipfsPathValidator.resolveToIpfsPath(url)).to.equal('/ipns/docs.ipfs.io/?argTest#hashTest')
    })
    it('should resolve /ipns/ path to itself', function () {
      const path = '/ipns/docs.ipfs.io/?argTest#hashTest'
      expect(ipfsPathValidator.resolveToIpfsPath(path)).to.equal(path)
    })
    it('should resolve URL of a DNSLink website to null if the value if DNSLink is not in cache', function () {
      const url = 'https://docs.ipfs.io/guides/concepts/dnslink/?argTest#hashTest'
      spoofCachedDnslink(new URL(url).hostname, dnslinkResolver, undefined)
      expect(ipfsPathValidator.resolveToIpfsPath(url)).to.equal(null)
    })
    it('should resolve URL of a DNSLink website to /ipns/<fqdn> path if DNSLink is in cache', function () {
      const url = 'https://docs.ipfs.io/guides/concepts/dnslink/?argTest#hashTest'
      const dnslinkValue = '/ipns/QmRV5iNhGoxBaAcbucMAW9WtVHbeehXhAdr5CZQDhL55Xk'
      spoofCachedDnslink(new URL(url).hostname, dnslinkResolver, dnslinkValue)
      expect(ipfsPathValidator.resolveToIpfsPath(url)).to.equal('/ipns/docs.ipfs.io/guides/concepts/dnslink/?argTest#hashTest')
    })
    it('should resolve to null if input is an invalid path', function () {
      const path = '/foo/bar/?argTest#hashTest'
      expect(ipfsPathValidator.resolveToIpfsPath(path)).to.equal(null)
    })
    it('should resolve to null if input is an invalid URL', function () {
      const url = 'example.com/foo/bar/?argTest#hashTest'
      expect(ipfsPathValidator.resolveToIpfsPath(url)).to.equal(null)
    })
  })

  describe('async resolveToImmutableIpfsPath', function () {
    it('should resolve URL with CID-in-subdomain to the same value as resolveToIpfsPath', async function () {
      const url = 'https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(url)).to.equal(ipfsPathValidator.resolveToIpfsPath(url))
    })
    it('should resolve URL with /ipfs/ path to the same value as resolveToIpfsPath', async function () {
      const url = 'https://example.com/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(url)).to.equal(ipfsPathValidator.resolveToIpfsPath(url))
    })
    it('should resolve /ipfs/ path to the same value as resolveToIpfsPath', async function () {
      const path = '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(path)).to.equal(ipfsPathValidator.resolveToIpfsPath(path))
    })
    it('should resolve URL with /ipns/ path to the immutable /ipfs/ path', async function () {
      const url = 'https://example.com/ipns/docs.ipfs.io/?argTest#hashTest'
      const ipnsPointer = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
      spoofIpfsResolve(ipfs, '/ipns/docs.ipfs.io', ipnsPointer)
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(url)).to.equal(ipnsPointer + '/?argTest#hashTest')
    })
    it('should resolve /ipns/ path to the immutable /ipfs/ one', async function () {
      const ipnsPointer = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
      spoofIpfsResolve(ipfs, '/ipns/libp2p.io', ipnsPointer)
      const path = '/ipns/libp2p.io/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(path)).to.equal(ipnsPointer + '/?argTest#hashTest')
    })
    it('should resolve URL of a DNSLink website to null if the value if DNSLink is not in cache', async function () {
      const url = 'https://docs.ipfs.io/guides/concepts/dnslink/?argTest#hashTest'
      spoofCachedDnslink(new URL(url).hostname, dnslinkResolver, undefined)
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(url)).to.equal(null)
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(url)).to.equal(ipfsPathValidator.resolveToIpfsPath(url))
    })
    it('should resolve URL of a DNSLink website to the immutable /ipfs/ address behind mutable /ipns/ DNSLink in cache', async function () {
      const url = 'https://docs.ipfs.io/guides/concepts/dnslink/?argTest#hashTest'
      // Use IPNS in DNSLINK to ensure resolveToImmutableIpfsPath does resursive resolv to immutable address
      const dnslinkValue = '/ipns/QmRV5iNhGoxBaAcbucMAW9WtVHbeehXhAdr5CZQDhL55Xk'
      const ipnsPointer = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
      const { hostname } = new URL(url)
      spoofCachedDnslink(hostname, dnslinkResolver, dnslinkValue)
      // We need to spoof IPNS lookup for /ipns/<fqdn> because value from DNSLink cache
      // may be out of date and resolveToImmutableIpfsPath does additional resolv
      // to return latest IPNS value
      spoofIpfsResolve(ipfs, `/ipns/${hostname}`, ipnsPointer)
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(url)).to.equal(ipnsPointer + '/guides/concepts/dnslink/?argTest#hashTest')
    })
    it('should resolve to null if input is an invalid path', async function () {
      const path = '/foo/bar/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(path)).to.equal(null)
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(path)).to.equal(ipfsPathValidator.resolveToIpfsPath(path))
    })
    it('should resolve to null if input is an invalid URL', async function () {
      const url = 'example.com/foo/bar/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(url)).to.equal(null)
      expect(await ipfsPathValidator.resolveToImmutableIpfsPath(url)).to.equal(ipfsPathValidator.resolveToIpfsPath(url))
    })
  })

  describe('async resolveToCid', function () {
    it('should resolve URL with CID-in-subdomain', async function () {
      const url = 'https://bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa.ipfs.dweb.link/wiki/Mars.html?argTest#hashTest'
      const expectedCid = 'bafkreig6ltd5dojmrhlsweuiaxt3ag2p5644wwcyjmqt6gajmbrbylke4m'
      spoofIpfsResolve(ipfs, '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html', '/ipfs/' + expectedCid)
      expect(await ipfsPathValidator.resolveToCid(url)).to.equal(expectedCid)
    })
    it('should resolve URL with /ipfs/ path', async function () {
      const url = 'https://example.com/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      const expectedCid = 'bafkreig6ltd5dojmrhlsweuiaxt3ag2p5644wwcyjmqt6gajmbrbylke4m'
      spoofIpfsResolve(ipfs, '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html', '/ipfs/' + expectedCid)
      expect(await ipfsPathValidator.resolveToCid(url)).to.equal(expectedCid)
    })
    it('should resolve /ipfs/ path', async function () {
      const path = '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html?argTest#hashTest'
      const expectedCid = 'bafkreig6ltd5dojmrhlsweuiaxt3ag2p5644wwcyjmqt6gajmbrbylke4m'
      spoofIpfsResolve(ipfs, '/ipfs/bafybeicgmdpvw4duutrmdxl4a7gc52sxyuk7nz5gby77afwdteh3jc5bqa/wiki/Mars.html', '/ipfs/' + expectedCid)
      expect(await ipfsPathValidator.resolveToCid(path)).to.equal(expectedCid)
    })
    it('should resolve URL with /ipns/ path', async function () {
      const url = 'https://example.com/ipns/docs.ipfs.io/foo/bar?argTest#hashTest'
      const expectedCid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
      spoofIpfsResolve(ipfs, '/ipns/docs.ipfs.io/foo/bar', `/ipfs/${expectedCid}`)
      expect(await ipfsPathValidator.resolveToCid(url)).to.equal(expectedCid)
    })
    it('should resolve /ipns/ path to the immutable /ipfs/ one', async function () {
      const path = '/ipns/libp2p.io/foo/bar?argTest#hashTest'
      const expectedCid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
      spoofIpfsResolve(ipfs, '/ipns/libp2p.io/foo/bar', `/ipfs/${expectedCid}`)
      expect(await ipfsPathValidator.resolveToCid(path)).to.equal(expectedCid)
    })
    it('should resolve URL of a DNSLink website to null if the value if DNSLink is not in cache', async function () {
      const url = 'https://docs.ipfs.io/guides/concepts/dnslink/?argTest#hashTest'
      spoofCachedDnslink(new URL(url).hostname, dnslinkResolver, undefined)
      expect(await ipfsPathValidator.resolveToCid(url)).to.equal(null)
    })
    it('should resolve URL of a DNSLink website if DNSLink is in cache', async function () {
      const url = 'https://docs.ipfs.io/guides/concepts/dnslink/?argTest#hashTest'
      // Use IPNS in DNSLINK to ensure resolveToImmutableIpfsPath does resursive resolv to immutable address
      const expectedCid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
      const dnslinkValue = '/ipns/QmRV5iNhGoxBaAcbucMAW9WtVHbeehXhAdr5CZQDhL55Xk'
      const { hostname } = new URL(url)
      spoofCachedDnslink(hostname, dnslinkResolver, dnslinkValue)
      // Note the DNSLink value is ignored, and /ipns/<fqdn> is passed to ipfs.resolv internally
      // This ensures the latest pointer is returned, instead of stale value from DNSLink cache
      spoofIpfsResolve(ipfs, '/ipns/docs.ipfs.io/guides/concepts/dnslink/', `/ipfs/${expectedCid}`)
      expect(await ipfsPathValidator.resolveToCid(url)).to.equal(expectedCid)
    })
    // TODO: remove when https://github.com/ipfs/js-ipfs/issues/1918 is addressed
    it('should resolve URL of a DNSLink website if DNSLink is in cache (js-ipfs fallback)', async function () {
      const url = 'https://docs.ipfs.io/guides/concepts/dnslink/?argTest#hashTest'
      // Use IPNS in DNSLINK to ensure resolveToImmutableIpfsPath does resursive resolv to immutable address
      const expectedCid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
      const dnslinkValue = '/ipns/QmRV5iNhGoxBaAcbucMAW9WtVHbeehXhAdr5CZQDhL55Xk'
      const { hostname } = new URL(url)
      spoofCachedDnslink(hostname, dnslinkResolver, dnslinkValue)
      // Note the DNSLink value is ignored, and /ipns/<fqdn> is passed to ipfs.resolv internally
      // This ensures the latest pointer is returned, instead of stale value from DNSLink cache
      // js-ipfs v0.34 does not support DNSLinks in ipfs.name.resolve: https://github.com/ipfs/js-ipfs/issues/1918
      const resolve = stub(ipfs, 'resolve')
      resolve.withArgs('/ipns/docs.ipfs.io/guides/concepts/dnslink/').throws(new Error('resolve non-IPFS names is not implemented'))
      // until it is implemented, we have a workaround that falls back to value from dnslink
      resolve.withArgs('/ipns/QmRV5iNhGoxBaAcbucMAW9WtVHbeehXhAdr5CZQDhL55Xk/guides/concepts/dnslink/').resolves(`/ipfs/${expectedCid}`)
      resolve.throws((arg) => new Error(`Unexpected stubbed call ipfs.resolve(${arg})`))
      expect(await ipfsPathValidator.resolveToCid(url)).to.equal(expectedCid)
    })
    it('should resolve to null if input is an invalid path', async function () {
      const path = '/foo/bar/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToCid(path)).to.equal(null)
    })
    it('should resolve to null if input is an invalid URL', async function () {
      const url = 'example.com/foo/bar/?argTest#hashTest'
      expect(await ipfsPathValidator.resolveToCid(url)).to.equal(null)
    })
  })
})
