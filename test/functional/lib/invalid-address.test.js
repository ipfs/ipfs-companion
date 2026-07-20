'use strict'
import { expect } from 'chai'
import { bases } from 'multiformats/basics'
import { CID } from 'multiformats/cid'
import { URL } from 'url'
import { describe, it, beforeEach, afterEach } from 'vitest'
import {
  DNSLINK_UNDER_IPFS,
  IPNS_KEY_UNDER_IPFS,
  LOWERCASED_CIDV0,
  UNRECOGNIZED_IDENTIFIER,
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
// an Ed25519 peer id: a valid IPNS name that parses as neither CID nor hostname
const peerIdEd25519 = '12D3KooWBhtnMSDgQqKM6oJn7WgvDPWvVCNTBSHMk4tXHoWDKQyi'

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

      // parses as neither a CID nor a hostname, so it reaches a later branch
      // than the other keys do
      it('flags a bare Ed25519 peer id', function () {
        expect(diagnoseAddress(`/ipfs/${peerIdEd25519}`)).to.deep.equal({
          reason: IPNS_KEY_UNDER_IPFS,
          address: `ipfs://${peerIdEd25519}`,
          suggestedPath: `/ipns/${peerIdEd25519}`
        })
      })
    })

    // https://github.com/ipfs/ipfs-companion/issues/1133
    describe('an identifier of no recognizable shape', function () {
      const unrecognized = {
        'a bare word under /ipfs/': '/ipfs/example',
        'a typo in a CIDv0': '/ipfs/QmNotARealCidAtAll',
        'a truncated CIDv1': `/ipfs/${cidv1DagPb.slice(0, 28)}`,
        'a word with punctuation': '/ipfs/foo-bar',
        'a sub-path on nonsense': '/ipfs/example/index.html'
      }

      for (const [name, path] of Object.entries(unrecognized)) {
        it(`flags ${name}`, function () {
          expect(diagnoseAddress(path).reason).to.equal(UNRECOGNIZED_IDENTIFIER)
        })
      }

      it('offers no suggestion, because we cannot guess what was meant', function () {
        expect(diagnoseAddress('/ipfs/example').suggestedPath).to.equal(null)
      })

      it('shows the address back unchanged', function () {
        expect(diagnoseAddress('/ipfs/example/a?b=c#d').address).to.equal('ipfs://example/a?b=c#d')
      })

      // an identifier has no spaces, so anything that does is prose someone
      // searched for rather than an address they meant to open
      describe('prose rather than an identifier', function () {
        const prose = {
          'a space': '/ipfs/how does it work',
          'a plus, which is a space in a query string': '/ipfs/+how+does+it+work',
          'a trailing sentence': '/ipfs/example.com+is+broken',
          'a tab': '/ipfs/two\twords',
          // `ipfs:// language:js` in a code search arrives like this, and it
          // would survive a check that trimmed before looking for whitespace
          'a leading plus against the scheme': '/ipfs/+language:js',
          'surrounding spaces': '/ipfs/ example '
        }

        for (const [name, path] of Object.entries(prose)) {
          it(`ignores ${name}`, function () {
            expect(diagnoseAddress(path)).to.equal(null)
          })
        }
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
        'a CID under /ipns/': `/ipns/${cidv0}`,
        // valid IPNS names that no CID or hostname check recognizes; flagging
        // these would break addresses that work today
        'an Ed25519 peer id under /ipns/': `/ipns/${peerIdEd25519}`,
        'a base32 IPNS key under /ipns/': `/ipns/${ipnsKeyBase32}`,
        'a DNSLink hostname with a sub-path under /ipns/': '/ipns/docs.ipfs.tech/some/page.html',
        // An IPNS name has no rule tight enough to judge it by. DNSLink records
        // live on all of these, and each resolves at a gateway today, so /ipns/
        // is left out of the unrecognized check entirely.
        'an inlined DNSLink label': '/ipns/en-wikipedia--on--ipfs-org',
        'a single-label intranet name': '/ipns/intranet',
        'a hostname with an underscore label': '/ipns/my_site.example.com',
        'a hostname with a trailing dot': '/ipns/example.com.',
        'an unresolvable word under /ipns/': '/ipns/example'
      }

      for (const [name, path] of Object.entries(untouched)) {
        it(`ignores ${name}`, function () {
          expect(diagnoseAddress(path)).to.equal(null)
        })
      }

      // A gateway takes a CID in any multibase, so every base multiformats
      // ships is checked rather than a hand-picked few. Picking favourites is
      // how base256emoji got missed: its rocket prefix is two UTF-16 units, so
      // a composed decoder could never dispatch it.
      describe('a CID in every multibase', function () {
        for (const [name, base] of Object.entries(bases)) {
          const cid = CID.parse(cidv1DagPb).toString(base)

          // base64 and base64pad include '/' in their alphabet, so such a CID
          // is not one path segment and a gateway would not see it either
          const it_ = /[/?#]/.test(cid) ? it.skip : it
          it_(`ignores a dag-pb CID in ${name}`, function () {
            expect(diagnoseAddress(`/ipfs/${cid}`)).to.equal(null)
          })
        }
      })
    })

    // nothing here is an ipfs:// or ipns:// address, so there is no address to
    // pass judgement on and the caller's normal handling stands
    describe('input that is not an address at all', function () {
      const ignored = {
        'an empty string': '',
        'a null path': null,
        'an undefined path': undefined,
        'a path in another namespace': '/foo/bar',
        'a namespace with no root': '/ipfs/',
        'a bare namespace': '/ipns'
      }

      for (const [name, path] of Object.entries(ignored)) {
        it(`ignores ${name}`, function () {
          expect(diagnoseAddress(path)).to.equal(null)
        })
      }
    })

    // these look CIDv0-ish without being a CIDv0 that lost its case, so the
    // page must not claim lowercasing is what went wrong
    describe('a near miss on a lowercased CIDv0', function () {
      const nearMisses = {
        // one character short of a CIDv0
        'a length that is one short': `/ipfs/${cidv0Lowercased.slice(0, -1)}`,
        // '0' is not in the base58btc alphabet, so this was never a CIDv0
        'a character base58btc excludes': `/ipfs/qm0${cidv0Lowercased.slice(3)}`,
        'the right length but the wrong prefix': `/ipfs/zz${cidv0Lowercased.slice(2)}`
      }

      for (const [name, path] of Object.entries(nearMisses)) {
        it(`reports ${name} as unrecognized, not lowercased`, function () {
          expect(diagnoseAddress(path).reason).to.equal(UNRECOGNIZED_IDENTIFIER)
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
