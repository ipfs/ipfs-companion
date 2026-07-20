'use strict'
import { expect } from 'chai'
import { URL } from 'url'
import { describe, it, beforeEach, afterEach } from 'vitest'
import {
  DNSLINK_UNDER_IPFS,
  IPNS_KEY_UNDER_IPFS,
  LOWERCASED_CIDV0,
  decodeDiagnosis,
  diagnoseAddress,
  encodeDiagnosis
} from '../../../add-on/src/lib/invalid-address.js'

const cidv0 = 'QmUVTKsrYJpaxUT7dr9FpKq6AoKHhEM7eG1ZHGL56haKLG'
const cidv0Lowercased = cidv0.toLowerCase()
const cidv1DagPb = 'bafybeic3m55e3k75my22xepbnga5m7gao5dzvtwpnyjkebjqir54dlngfu'
const cidv1DagCbor = 'bafyreie7q3iidccmpvszul7kudcvvuavuo7u6gzlbobczuk5nqk3b4akba'
const cidv1Raw = 'bafkreie7q3iidccmpvszul7kudcvvuavuo7u6gzlbobczuk5nqk3b4akba'
const cidv1Base58 = 'zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7'
const ipnsKeyBase36 = 'k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8'
const ipnsKeyBase32 = 'bafzaajaiaejcbtcmhu5gszgvfxzqhewzuxosjk6ovkbjrjmefiyfnabgutlgkxsc'

describe('invalid-address.js', function () {
  beforeEach(function () {
    global.URL = URL
  })

  afterEach(function () {
    delete global.URL
  })

  describe('diagnoseAddress', function () {
    describe('a mutable pointer addressed with ipfs://', function () {
      it('flags a DNSLink hostname', function () {
        expect(diagnoseAddress('/ipfs/example.com')).to.deep.equal({
          reason: DNSLINK_UNDER_IPFS,
          address: 'ipfs://example.com',
          suggestedPath: '/ipns/example.com'
        })
      })

      it('keeps the sub-path, query and hash in the suggestion', function () {
        expect(diagnoseAddress('/ipfs/docs.ipfs.tech/some/page.html?a=b#frag')).to.deep.equal({
          reason: DNSLINK_UNDER_IPFS,
          address: 'ipfs://docs.ipfs.tech/some/page.html?a=b#frag',
          suggestedPath: '/ipns/docs.ipfs.tech/some/page.html?a=b#frag'
        })
      })

      it('flags a base36 IPNS key', function () {
        expect(diagnoseAddress(`/ipfs/${ipnsKeyBase36}`)).to.deep.equal({
          reason: IPNS_KEY_UNDER_IPFS,
          address: `ipfs://${ipnsKeyBase36}`,
          suggestedPath: `/ipns/${ipnsKeyBase36}`
        })
      })

      it('flags a base32 IPNS key', function () {
        expect(diagnoseAddress(`/ipfs/${ipnsKeyBase32}`).reason).to.equal(IPNS_KEY_UNDER_IPFS)
      })
    })

    describe('a CIDv0 the browser lowercased', function () {
      // https://github.com/ipfs/ipfs-companion/issues/1006
      it('flags it under /ipfs/', function () {
        expect(diagnoseAddress(`/ipfs/${cidv0Lowercased}`)).to.deep.equal({
          reason: LOWERCASED_CIDV0,
          address: `ipfs://${cidv0Lowercased}`,
          suggestedPath: null
        })
      })

      // is-ipfs accepts any string as an IPNS name, so without this check the
      // damaged CID is forwarded to a gateway that can only return an error
      it('flags it under /ipns/, which is otherwise treated as a valid path', function () {
        expect(diagnoseAddress(`/ipns/${cidv0Lowercased}`).reason).to.equal(LOWERCASED_CIDV0)
      })

      it('offers no suggestion, because the original cannot be recovered', function () {
        expect(diagnoseAddress(`/ipfs/${cidv0Lowercased}`).suggestedPath).to.equal(null)
      })
    })

    describe('addresses that work today are left alone', function () {
      const untouched = {
        'an intact CIDv0': `/ipfs/${cidv0}`,
        'a CIDv0 with a sub-path containing dots': `/ipfs/${cidv0}/dir/index.html`,
        'a base32 CIDv1': `/ipfs/${cidv1DagPb}`,
        'a raw-codec CIDv1': `/ipfs/${cidv1Raw}`,
        'a dag-cbor CIDv1': `/ipfs/${cidv1DagCbor}`,
        'a dag-cbor CIDv1 with a dotted sub-path': `/ipfs/${cidv1DagCbor}/a.json`,
        'a base58btc CIDv1': `/ipfs/${cidv1Base58}`,
        'a base58btc CIDv1 with a dotted sub-path': `/ipfs/${cidv1Base58}/a.html`,
        'a DNSLink hostname under /ipns/': '/ipns/example.com',
        'an IPNS key under /ipns/': `/ipns/${ipnsKeyBase36}`,
        'a CID under /ipns/': `/ipns/${cidv0}`
      }

      for (const [name, path] of Object.entries(untouched)) {
        it(`ignores ${name}`, function () {
          expect(diagnoseAddress(path)).to.equal(null)
        })
      }
    })

    describe('anything we cannot classify', function () {
      const ignored = {
        'an empty string': '',
        'a null path': null,
        'an undefined path': undefined,
        'a path in another namespace': '/foo/bar',
        'a bare word': '/ipfs/notARealIpfsPathWithCid',
        'a namespace with no root': '/ipfs/',
        // one character short of a CIDv0, so we cannot claim to know what it was
        'a near-miss on the CIDv0 length': `/ipfs/${cidv0Lowercased.slice(0, -1)}`,
        // '0' is not in the base58btc alphabet, so this was never a CIDv0
        'a lowercase string with a character base58btc excludes': `/ipfs/qm0${cidv0Lowercased.slice(3)}`
      }

      for (const [name, path] of Object.entries(ignored)) {
        it(`ignores ${name}`, function () {
          expect(diagnoseAddress(path)).to.equal(null)
        })
      }
    })
  })

  describe('encodeDiagnosis / decodeDiagnosis', function () {
    it('round-trips a diagnosis', function () {
      const fragment = encodeDiagnosis({
        reason: DNSLINK_UNDER_IPFS,
        address: 'ipfs://example.com',
        suggestedAddress: 'ipns://example.com',
        suggestedUrl: 'https://ipfs.io/ipns/example.com'
      })

      expect(decodeDiagnosis(`#${fragment}`)).to.deep.equal({
        reason: DNSLINK_UNDER_IPFS,
        address: 'ipfs://example.com',
        suggestedAddress: 'ipns://example.com',
        suggestedUrl: 'https://ipfs.io/ipns/example.com'
      })
    })

    it('round-trips an address containing query, hash and ampersands', function () {
      const address = 'ipfs://example.com/a?x=1&y=2#frag'
      const fragment = encodeDiagnosis({ reason: DNSLINK_UNDER_IPFS, address })

      expect(decodeDiagnosis(`#${fragment}`).address).to.equal(address)
    })

    it('round-trips a diagnosis with no suggestion', function () {
      const fragment = encodeDiagnosis({
        reason: LOWERCASED_CIDV0,
        address: `ipfs://${cidv0Lowercased}`
      })

      expect(decodeDiagnosis(`#${fragment}`)).to.deep.equal({
        reason: LOWERCASED_CIDV0,
        address: `ipfs://${cidv0Lowercased}`,
        suggestedAddress: '',
        suggestedUrl: null
      })
    })

    // the page is web_accessible, so any site can open it with a fragment of
    // its choosing and nothing read back out may be trusted
    describe('rejects a fragment we did not write', function () {
      it('rejects an unknown reason', function () {
        expect(decodeDiagnosis('#reason=made-up&address=ipfs://example.com')).to.equal(null)
      })

      it('rejects a missing reason', function () {
        expect(decodeDiagnosis('#address=ipfs://example.com')).to.equal(null)
      })

      it('rejects an empty hash', function () {
        expect(decodeDiagnosis('')).to.equal(null)
      })

      it('rejects a null hash', function () {
        expect(decodeDiagnosis(null)).to.equal(null)
      })

      for (const scheme of ['javascript:alert(1)', 'data:text/html,<script>x</script>', 'file:///etc/passwd', 'not a url']) {
        it(`drops a continue target of ${scheme.split(':')[0]}`, function () {
          const fragment = `reason=${DNSLINK_UNDER_IPFS}&address=x&suggestedAddress=${encodeURIComponent('ipns://example.com')}&suggestedUrl=${encodeURIComponent(scheme)}`

          expect(decodeDiagnosis(`#${fragment}`).suggestedUrl).to.equal(null)
        })
      }

      it('keeps an http continue target that serves the address shown', function () {
        const fragment = `reason=${DNSLINK_UNDER_IPFS}&address=x&suggestedAddress=${encodeURIComponent('ipns://example.com')}&suggestedUrl=${encodeURIComponent('http://127.0.0.1:8080/ipns/example.com')}`

        expect(decodeDiagnosis(`#${fragment}`).suggestedUrl).to.equal('http://127.0.0.1:8080/ipns/example.com')
      })

      // otherwise a crafted fragment could print a trustworthy "correct address"
      // beside a button leading somewhere else entirely
      it('drops a continue target that does not serve the address shown', function () {
        const fragment = `reason=${DNSLINK_UNDER_IPFS}&address=x&suggestedAddress=${encodeURIComponent('ipns://example.com')}&suggestedUrl=${encodeURIComponent('https://evil.example/ipns/attacker.test')}`

        const decoded = decodeDiagnosis(`#${fragment}`)
        expect(decoded.suggestedAddress).to.equal('ipns://example.com')
        expect(decoded.suggestedUrl).to.equal(null)
      })

      it('drops a continue target when no address is shown beside it', function () {
        const fragment = `reason=${DNSLINK_UNDER_IPFS}&address=x&suggestedUrl=${encodeURIComponent('https://evil.example/ipns/example.com')}`

        expect(decodeDiagnosis(`#${fragment}`).suggestedUrl).to.equal(null)
      })

      it('drops a continue target that swaps the namespace', function () {
        const fragment = `reason=${DNSLINK_UNDER_IPFS}&address=x&suggestedAddress=${encodeURIComponent('ipns://example.com')}&suggestedUrl=${encodeURIComponent('https://ipfs.io/ipfs/example.com')}`

        expect(decodeDiagnosis(`#${fragment}`).suggestedUrl).to.equal(null)
      })
    })
  })
})
