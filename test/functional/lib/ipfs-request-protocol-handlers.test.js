'use strict'
import { describe, it, before, beforeEach, after } from 'mocha'
import { expect } from 'chai'
import { URL } from 'url'
import browser from 'sinon-chrome'
import { initState } from '../../../add-on/src/lib/state.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { createRequestModifier } from '../../../add-on/src/lib/ipfs-request.js'
import createDnslinkResolver from '../../../add-on/src/lib/dnslink.js'
import { createIpfsPathValidator } from '../../../add-on/src/lib/ipfs-path.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'

const url2request = (string) => {
  return { url: string, type: 'main_frame' }
}

const nodeTypes = ['external', 'embedded']

describe('modifyRequest.onBeforeRequest:', function () {
  let state, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
    global.URL = URL
    global.browser = browser
    browser.runtime.id = 'testid'
  })

  beforeEach(async function () {
    state = Object.assign(initState(optionDefaults), {
      ipfsNodeType: 'external',
      peerCount: 1,
      redirect: true,
      dnslinkPolicy: false, // dnslink test suite is in ipfs-request-dnslink.test.js
      catchUnhandledProtocols: true,
      gwURLString: 'http://127.0.0.1:8080',
      pubGwURLString: 'https://ipfs.io'
    })
    const getState = () => state
    const getIpfs = () => {}
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  // tests in which results should be the same for all node types
  nodeTypes.forEach(function (nodeType) {
    beforeEach(function () {
      state.ipfsNodeType = nodeType
    })
    describe(`with ${nodeType} node:`, function () {
      describe('request made via redirect-based protocol handler from manifest.json/protocol_handlers', function () {
        // Note: requests done with custom protocol handler are always  normalized to public gateway
        // (if external node is enabled, redirect will happen in next iteration of modifyRequest)
        beforeEach(function () {
          // ..however to make tests easier we disable redirect from public to custom gateway
          // (with this modifyRequest will return undefined for invalid URIs)
          state.redirect = false
        })

        // without web+ prefix (Firefox > 59: https://github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-356301174)
        it('should not be normalized if ipfs:/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if ipfs://{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if ipns:/{fqdn}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=ipns%3A%2Fipfs.io%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if ipns://{fqdn}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=ipns%3A%2F%2Fipfs.io%3FargTest%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
        })
        it('should be normalized if ipfs://{fqdn}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=ipfs%3A%2F%2Fipfs.io%3FargTest%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
        })
        it('should be normalized if dweb:/ipfs/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=dweb%3A%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if dweb://ipfs/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=dweb%3A%2F%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if dweb:/ipns/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=dweb%3A%2Fipns/ipfs.io%3FargTest%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
        })
        it('should not be normalized if dweb://ipns/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=dweb%3A%2F%2Fipns/ipfs.io%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })

        // web+ prefixed versions (Firefox < 59 and Chrome)
        it('should not be normalized if web+ipfs:/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+ipfs://{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if web+ipns:/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bipns%3A%2Fipfs.io%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+ipns://{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bipns%3A%2F%2Fipfs.io%3FargTest%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
        })
        it('should be normalized if web+dweb:/ipfs/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bdweb%3A%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if web+dweb://ipfs/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bdweb%3A%2F%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+dweb:/ipns/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bdweb%3A%2Fipns/ipfs.io%3FargTest%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
        })
        it('should not be normalized if web+dweb://ipns/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bdweb%3A%2F%2Fipns/ipfs.io%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if web+{foo}:/bar', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bfoo%3A%2Fbar%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if web+{foo}://bar', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bfoo%3A%2F%2Fbar%3FargTest%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
      })

      describe('catching unhandled custom protocol request', function () {
        it('should not be normalized if ipfs:/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if ipfs://{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if ipns:/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if ipns://{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest')
        })
        it('should be normalized if ipfs://{fqdn}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest')
        })
        it('should be normalized if dweb:/ipfs/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash')
        })
        it('should not be normalized if dweb://ipfs/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if dweb:/ipns/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash')
        })
        it('should not be normalized if dweb://ipns/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })

        it('should not be normalized if web+ipfs:/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+ipfs://{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if web+ipns:/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+ipns://{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest')
        })
        it('should be normalized if web+dweb:/ipfs/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash')
        })
        it('should not be normalized if web+dweb://ipfs/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+dweb:/ipns/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
          expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash')
        })
        it('should not be normalized if web+dweb://ipns/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })

        it('should not be normalized if disabled in Preferences', async function () {
          state.catchUnhandledProtocols = false
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if CID is invalid', async function () {
          state.catchUnhandledProtocols = false
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FnotARealIpfsPathWithCid%3FargTest%23hashTest&foo=bar')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if presence of %3A%2F is a false-positive', async function () {
          state.catchUnhandledProtocols = false
          const request = url2request('https://duckduckgo.com/?q=foo%3A%2Fbar%3FargTest%23hashTest&foo=bar')
          expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if request.type != main_frame', async function () {
          const mediaRequest = { url: 'https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar', type: 'media' }
          expect(await modifyRequest.onBeforeRequest(mediaRequest)).to.equal(undefined)
        })
      })
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
