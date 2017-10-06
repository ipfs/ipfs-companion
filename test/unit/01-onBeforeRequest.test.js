'use strict'
/* eslint-env webextensions, mocha */
// eslint-disable-next-line no-unused-vars
/* globals sinon, initStates, optionDefaults, should, state, onBeforeRequest, readDnslinkFromTxtRecord */

var sandbox

const url2request = (string) => {
  return {url: string, type: 'main_frame'}
}

describe('onBeforeRequest', function () {
  beforeEach(() => {
    browser.flush()
    sandbox = sinon.sandbox.create()
    browser.storage.local.get.returns(Promise.resolve(optionDefaults))
    // reset states
    initStates(optionDefaults)
    // stub default state for most of tests
    // redirect by default -- makes test code shorter
    state.peerCount = 1
    state.redirect = true
    state.catchUnhandledProtocols = true
    state.gwURLString = 'http://127.0.0.1:8080'
  })

  afterEach(() => {
    sandbox.restore()
    browser.flush()
  })

  describe('request for a path matching /ipfs/{CIDv0}', function () {
    it('should be served from custom gateway if redirect is enabled', function () {
      const request = url2request('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      onBeforeRequest(request).redirectUrl.should.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should be left untouched if redirect is disabled', function () {
      state.redirect = false
      const request = url2request('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be left untouched if CID is invalid', function () {
      const request = url2request('https://ipfs.io/ipfs/notacid?argTest#hashTest')
      should.not.exist(onBeforeRequest(request))
    })
  })

  describe('request for a path matching /ipns/{path}', function () {
    it('should be served from custom gateway if {path} points to a FQDN with existing dnslink', function () {
      const request = url2request('https://ipfs.io/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
      // stub the existence of valid dnslink
      const fqdn = 'ipfs.git.sexy'
      // eslint-disable-next-line no-global-assign
      readDnslinkFromTxtRecord = sandbox.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
      // pretend API is online and we can do dns lookups with it
      state.peerCount = 1
      onBeforeRequest(request).redirectUrl.should.equal('http://127.0.0.1:8080/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
    })
    it('should be served from custom gateway if {path} starts with a valid CID', function () {
      const request = url2request('https://ipfs.io/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
      // eslint-disable-next-line no-global-assign
      readDnslinkFromTxtRecord = sandbox.stub().returns(false)
      onBeforeRequest(request).redirectUrl.should.equal('http://127.0.0.1:8080/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
    })
    it('should be left untouched if redirect is disabled', function () {
      state.redirect = false
      const request = url2request('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be left untouched if FQDN is not a real domain nor a valid CID', function () {
      const request = url2request('https://ipfs.io/ipns/notafqdnorcid?argTest#hashTest')
      // eslint-disable-next-line no-global-assign
      readDnslinkFromTxtRecord = sandbox.stub().returns(false)
      should.not.exist(onBeforeRequest(request))
    })
    it('should be left untouched if {path} points to a FQDN but API is offline', function () {
      const request = url2request('https://ipfs.io/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
      // stub the existence of valid dnslink in dnslink cache
      const fqdn = 'ipfs.git.sexy'
      // eslint-disable-next-line no-global-assign
      readDnslinkFromTxtRecord = sandbox.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
      // pretend API is offline and we can do dns lookups with it
      state.peerCount = 0
      should.not.exist(onBeforeRequest(request))
    })
  })

  describe('request made via "web+" handler from manifest.json/protocol_handlers', function () {
    it('should not be normalized if web+ipfs:/{CID}', function () {
      const request = url2request('https://ipfs.io/web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be normalized if web+ipfs://{CID}', function () {
      const request = url2request('https://ipfs.io/web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should not be normalized if web+ipns:/{foo}', function () {
      const request = url2request('https://ipfs.io/web%2Bipns%3A%2Fipfs.io%3FargTest%23hashTest')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be normalized if web+ipns://{foo}', function () {
      const request = url2request('https://ipfs.io/web%2Bipns%3A%2F%2Fipfs.io%3FargTest%23hashTest')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
    })
    it('should be normalized if web+dweb:/ipfs/{CID}', function () {
      const request = url2request('https://ipfs.io/web%2Bdweb%3A%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should not be normalized if web+dweb://ipfs/{CID}', function () {
      const request = url2request('https://ipfs.io/web%2Bdweb%3A%2F%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be normalized if web+dweb:/ipns/{foo}', function () {
      const request = url2request('https://ipfs.io/web%2Bdweb%3A%2Fipns/ipfs.io%3FargTest%23hashTest')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
    })
    it('should not be normalized if web+dweb://ipns/{foo}', function () {
      const request = url2request('https://ipfs.io/web%2Bdweb%3A%2F%2Fipns/ipfs.io%3FargTest%23hashTest')
      should.not.exist(onBeforeRequest(request))
    })
    it('should not be normalized if web+{foo}:/bar', function () {
      const request = url2request('https://ipfs.io/web%2Bfoo%3A%2Fbar%3FargTest%23hashTest')
      should.not.exist(onBeforeRequest(request))
    })
    it('should not be normalized if web+{foo}://bar', function () {
      const request = url2request('https://ipfs.io/web%2Bfoo%3A%2F%2Fbar%3FargTest%23hashTest')
      should.not.exist(onBeforeRequest(request))
    })
  })

  describe('catching unhandled custom protocol request', function () {
    it('should not be normalized if ipfs:/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be normalized if ipfs://{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should not be normalized if ipns:/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=ipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be normalized if ipns://{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=ipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest')
    })
    it('should be normalized if dweb:/ipfs/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash')
    })
    it('should not be normalized if dweb://ipfs/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be normalized if dweb:/ipns/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash')
    })
    it('should not be normalized if dweb://ipns/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
      should.not.exist(onBeforeRequest(request))
    })

    it('should not be normalized if web+ipfs:/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be normalized if web+ipfs://{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should not be normalized if web+ipns:/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be normalized if web+ipns://{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest')
    })
    it('should be normalized if web+dweb:/ipfs/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash')
    })
    it('should not be normalized if web+dweb://ipfs/{CID}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
      should.not.exist(onBeforeRequest(request))
    })
    it('should be normalized if web+dweb:/ipns/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
      onBeforeRequest(request).redirectUrl.should.equal('https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash')
    })
    it('should not be normalized if web+dweb://ipns/{foo}', function () {
      const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
      should.not.exist(onBeforeRequest(request))
    })

    it('should not be normalized if disabled in Preferences', function () {
      state.catchUnhandledProtocols = false
      const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
      should.not.exist(onBeforeRequest(request))
    })
    it('should not be normalized if CID is invalid', function () {
      state.catchUnhandledProtocols = false
      const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FnotARealIpfsPathWithCid%3FargTest%23hashTest&foo=bar')
      should.not.exist(onBeforeRequest(request))
    })
    it('should not be normalized if presence of %3A%2F is a false-positive', function () {
      state.catchUnhandledProtocols = false
      const request = url2request('https://duckduckgo.com/?q=foo%3A%2Fbar%3FargTest%23hashTest&foo=bar')
      should.not.exist(onBeforeRequest(request))
    })
    it('should not be normalized if request.type != main_frame', function () {
      const xhrRequest = {url: 'https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar', type: 'xmlhttprequest'}
      should.not.exist(onBeforeRequest(xhrRequest))
    })
  })
})
