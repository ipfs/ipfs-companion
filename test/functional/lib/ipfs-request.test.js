'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const sinon = require('sinon')
const { expect } = require('chai')
const { URL } = require('url')
const { initState } = require('../../../add-on/src/lib/state')
const { createRequestModifier } = require('../../../add-on/src/lib/ipfs-request')
const createDnsLink = require('../../../add-on/src/lib/dns-link')
const { createIpfsPathValidator } = require('../../../add-on/src/lib/ipfs-path')
const { optionDefaults } = require('../../../add-on/src/lib/options')

const url2request = (string) => {
  return {url: string, type: 'main_frame'}
}

describe('modifyRequest', function () {
  let state, dnsLink, ipfsPathValidator, modifyRequest

  before(() => {
    global.URL = URL
  })

  beforeEach(() => {
    state = Object.assign(initState(optionDefaults), {
      peerCount: 1,
      redirect: true,
      catchUnhandledProtocols: true,
      gwURLString: 'http://localhost:8080'
    })
    const getState = () => state
    dnsLink = createDnsLink(getState)
    ipfsPathValidator = createIpfsPathValidator(getState, dnsLink)
    modifyRequest = createRequestModifier(getState, dnsLink, ipfsPathValidator)
  })

  describe('request for a path matching /ipfs/{CIDv0}', function () {
    it('should be served from custom gateway if redirect is enabled', function () {
      const request = url2request('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      expect(modifyRequest(request).redirectUrl).to.equal('http://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should be left untouched if redirect is disabled', function () {
      state.redirect = false
      const request = url2request('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be left untouched if CID is invalid', function () {
      const request = url2request('https://ipfs.io/ipfs/notacid?argTest#hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
  })

  describe('request for a path matching /ipns/{path}', function () {
    it('should be served from custom gateway if {path} points to a FQDN with existing dnslink', function () {
      const request = url2request('https://ipfs.io/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
      // stub the existence of valid dnslink
      const fqdn = 'ipfs.git.sexy'
      dnsLink.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
      // pretend API is online and we can do dns lookups with it
      state.peerCount = 1
      expect(modifyRequest(request).redirectUrl).to.equal('http://localhost:8080/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
    })
    it('should be served from custom gateway if {path} starts with a valid CID', function () {
      const request = url2request('https://ipfs.io/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
      dnsLink.readDnslinkFromTxtRecord = sinon.stub().returns(false)
      expect(modifyRequest(request).redirectUrl).to.equal('http://localhost:8080/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
    })
    it('should be left untouched if redirect is disabled', function () {
      state.redirect = false
      const request = url2request('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be left untouched if FQDN is not a real domain nor a valid CID', function () {
      const request = url2request('https://ipfs.io/ipns/notafqdnorcid?argTest#hashTest')
      dnsLink.readDnslinkFromTxtRecord = sinon.stub().returns(false)
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be left untouched if {path} points to a FQDN but API is offline', function () {
      const request = url2request('https://ipfs.io/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
      // stub the existence of valid dnslink in dnslink cache
      const fqdn = 'ipfs.git.sexy'
      dnsLink.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
      // pretend API is offline and we can do dns lookups with it
      state.peerCount = 0
      expect(modifyRequest(request)).to.equal(undefined)
    })
  })

  describe('request made via "web+" handler from manifest.json/protocol_handlers', function () {
    it('should not be normalized if web+ipfs:/{CID}', function () {
      const request = url2request('https://ipfs.io/web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be normalized if web+ipfs://{CID}', function () {
      const request = url2request('https://ipfs.io/web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should not be normalized if web+ipns:/{foo}', function () {
      const request = url2request('https://ipfs.io/web%2Bipns%3A%2Fipfs.io%3FargTest%23hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be normalized if web+ipns://{foo}', function () {
      const request = url2request('https://ipfs.io/web%2Bipns%3A%2F%2Fipfs.io%3FargTest%23hashTest')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
    })
    it('should be normalized if web+dweb:/ipfs/{CID}', function () {
      const request = url2request('https://ipfs.io/web%2Bdweb%3A%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should not be normalized if web+dweb://ipfs/{CID}', function () {
      const request = url2request('https://ipfs.io/web%2Bdweb%3A%2F%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be normalized if web+dweb:/ipns/{foo}', function () {
      const request = url2request('https://ipfs.io/web%2Bdweb%3A%2Fipns/ipfs.io%3FargTest%23hashTest')
      expect(modifyRequest(request).redirectUrl).equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
    })
    it('should not be normalized if web+dweb://ipns/{foo}', function () {
      const request = url2request('https://ipfs.io/web%2Bdweb%3A%2F%2Fipns/ipfs.io%3FargTest%23hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should not be normalized if web+{foo}:/bar', function () {
      const request = url2request('https://ipfs.io/web%2Bfoo%3A%2Fbar%3FargTest%23hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should not be normalized if web+{foo}://bar', function () {
      const request = url2request('https://ipfs.io/web%2Bfoo%3A%2F%2Fbar%3FargTest%23hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
  })

  describe('catching unhandled custom protocol request', function () {
    it('should not be normalized if ipfs:/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be normalized if ipfs://{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should not be normalized if ipns:/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=ipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be normalized if ipns://{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=ipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest')
    })
    it('should be normalized if dweb:/ipfs/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash')
    })
    it('should not be normalized if dweb://ipfs/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be normalized if dweb:/ipns/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash')
    })
    it('should not be normalized if dweb://ipns/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
      expect(modifyRequest(request)).to.equal(undefined)
    })

    it('should not be normalized if web+ipfs:/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be normalized if web+ipfs://{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should not be normalized if web+ipns:/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be normalized if web+ipns://{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest')
    })
    it('should be normalized if web+dweb:/ipfs/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash')
    })
    it('should not be normalized if web+dweb://ipfs/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be normalized if web+dweb:/ipns/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
      expect(modifyRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash')
    })
    it('should not be normalized if web+dweb://ipns/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
      expect(modifyRequest(request)).to.equal(undefined)
    })

    it('should not be normalized if disabled in Preferences', function () {
      state.catchUnhandledProtocols = false
      const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should not be normalized if CID is invalid', function () {
      state.catchUnhandledProtocols = false
      const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FnotARealIpfsPathWithCid%3FargTest%23hashTest&foo=bar')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should not be normalized if presence of %3A%2F is a false-positive', function () {
      state.catchUnhandledProtocols = false
      const request = url2request('https://duckduckgo.com/?q=foo%3A%2Fbar%3FargTest%23hashTest&foo=bar')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should not be normalized if request.type != main_frame', function () {
      const xhrRequest = {url: 'https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar', type: 'xmlhttprequest'}
      expect(modifyRequest(xhrRequest)).to.equal(undefined)
    })
  })

  describe('request for IPFS path at a localhost', function () {
    // we do not touch local requests, as it may interfere with other nodes running at the same machine
    // or could produce false-positives such as redirection from 127.0.0.1:5001/ipfs/path to localhost:8080/ipfs/path
    it('should be left untouched if 127.0.0.1 is used', function () {
      state.redirect = false
      const request = url2request('http://127.0.0.1:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
      expect(modifyRequest(request)).to.equal(undefined)
    })
    it('should be left untouched if localhost is used', function () {
      // https://github.com/ipfs/ipfs-companion/issues/291
      state.redirect = false
      const request = url2request('http://localhost:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
      expect(modifyRequest(request)).to.equal(undefined)
    })
  })

  after(() => {
    delete global.URL
  })
})
