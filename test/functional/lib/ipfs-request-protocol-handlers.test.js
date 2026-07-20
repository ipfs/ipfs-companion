'use strict'
import { expect } from 'chai'
import Sinon from 'sinon'
import { afterAll as after, beforeAll as before, beforeEach, describe, it } from 'vitest'
import browser from 'sinon-chrome'
import { URL } from 'url'
import isManifestV3 from '../../helpers/is-mv3-testing-enabled.js'
import createDnslinkResolver from '../../../add-on/src/lib/dnslink.js'
import { createIpfsPathValidator } from '../../../add-on/src/lib/ipfs-path.js'
import { createRequestModifier } from '../../../add-on/src/lib/ipfs-request.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { initState } from '../../../add-on/src/lib/state.js'
import { ensureCallRedirected, ensureRequestUntouched } from '../../helpers/mv3-test-helper.js'

const testTabId = 20
const url2request = (string) => {
  return { url: string, type: 'main_frame', tabId: testTabId }
}

// The explainer shown instead of silently fixing up an address, or forwarding
// one to a gateway that can only answer with an error.
const invalidAddressPage = (params) =>
  `chrome-extension://testid/dist/landing-pages/invalid-address/index.html#${new URLSearchParams(params).toString()}`

/**
 * The explainer is a verdict on one address, so it must reach the user by
 * navigating the tab and must NEVER become a declarativeNetRequest rule. A rule
 * matches by pattern and would go on to serve this verdict to unrelated URLs on
 * the same host, which once turned a single bad address into a redirect for
 * every later search. Asserting no rule is installed is the regression guard.
 */
const ensureInvalidAddressPageShown = ({ resp, page }) => {
  if (isManifestV3) {
    Sinon.assert.notCalled(browser.declarativeNetRequest.updateDynamicRules)
    Sinon.assert.calledWith(browser.tabs.update, testTabId, { active: true, url: page })
  } else {
    expect(resp.redirectUrl).to.equal(page)
  }
}

const lowercasedCidv0 = 'QmUVTKsrYJpaxUT7dr9FpKq6AoKHhEM7eG1ZHGL56haKLG'.toLowerCase()
const ipnsKey = 'k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8'

const nodeTypes = ['external']

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
      redirectSubresources: true,
      dnslinkLookup: false, // dnslink test suite is in ipfs-request-dnslink.test.js
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

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if ipfs://{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/dweb\\.link\\/ipfs\\/\\?uri\\=ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23',
              destination: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#\\1'
            }
          })
        })
        it('should not be normalized if ipns:/{fqdn}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=ipns%3A%2Fipfs.io%3FargTest%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if ipns://{fqdn}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=ipns%3A%2F%2Fipfs.io%3FargTest%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipns/ipfs.io?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/dweb\\.link\\/ipfs\\/\\?uri\\=ipns%3A%2F%2Fipfs\\.io%3FargTest%23',
              destination: 'https://ipfs.io/ipns/ipfs.io?argTest#\\1'
            }
          })
        })
        // a DNSLink name under ipfs:// used to be corrected in silence, which
        // let the wrong form spread: https://github.com/ipfs/ipfs-companion/issues/1316
        it('should explain the mistake if ipfs://{fqdn}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=ipfs%3A%2F%2Fipfs.io%3FargTest%23hashTest')
          const page = invalidAddressPage({
            reason: 'dnslink-under-ipfs',
            address: 'ipfs://ipfs.io?argTest#hashTest',
            suggestedAddress: 'ipns://ipfs.io?argTest#hashTest',
            suggestedUrl: 'https://ipfs.io/ipns/ipfs.io?argTest#hashTest'
          })

          ensureInvalidAddressPageShown({
            resp: await modifyRequest.onBeforeRequest(request),
            page
          })
        })
        it('should be normalized if dweb:/ipfs/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=dweb%3A%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/dweb\\.link\\/ipfs\\/\\?uri\\=dweb%3A%2Fipfs\\/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23',
              destination: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#\\1'
            }
          })
        })
        it('should not be normalized if dweb://ipfs/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=dweb%3A%2F%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if dweb:/ipns/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=dweb%3A%2Fipns/ipfs.io%3FargTest%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipns/ipfs.io?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/dweb\\.link\\/ipfs\\/\\?uri\\=dweb%3A%2Fipns\\/ipfs\\.io%3FargTest%23',
              destination: 'https://ipfs.io/ipns/ipfs.io?argTest#\\1'
            }
          })
        })
        it('should not be normalized if dweb://ipns/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=dweb%3A%2F%2Fipns/ipfs.io%3FargTest%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })

        // web+ prefixed versions (Firefox < 59 and Chrome)
        it('should not be normalized if web+ipfs:/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if web+ipfs://{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/dweb\\.link\\/ipfs\\/\\?uri\\=web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23',
              destination: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#\\1'
            }
          })
        })
        it('should not be normalized if web+ipns:/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bipns%3A%2Fipfs.io%3FargTest%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if web+ipns://{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bipns%3A%2F%2Fipfs.io%3FargTest%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipns/ipfs.io?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/dweb\\.link\\/ipfs\\/\\?uri\\=web%2Bipns%3A%2F%2Fipfs\\.io%3FargTest%23',
              destination: 'https://ipfs.io/ipns/ipfs.io?argTest#\\1'
            }
          })
        })
        it('should be normalized if web+dweb:/ipfs/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bdweb%3A%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/dweb\\.link\\/ipfs\\/\\?uri\\=web%2Bdweb%3A%2Fipfs\\/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23',
              destination: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#\\1'
            }
          })
        })
        it('should not be normalized if web+dweb://ipfs/{CID}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bdweb%3A%2F%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if web+dweb:/ipns/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bdweb%3A%2Fipns/ipfs.io%3FargTest%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipns/ipfs.io?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/dweb\\.link\\/ipfs\\/\\?uri\\=web%2Bdweb%3A%2Fipns\\/ipfs\\.io%3FargTest%23',
              destination: 'https://ipfs.io/ipns/ipfs.io?argTest#\\1'
            }
          })
        })
        it('should not be normalized if web+dweb://ipns/{foo}', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bdweb%3A%2F%2Fipns/ipfs.io%3FargTest%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should not be normalized if web+{foo}:/bar', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bfoo%3A%2Fbar%3FargTest%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should not be normalized if web+{foo}://bar', async function () {
          const request = url2request('https://dweb.link/ipfs/?uri=web%2Bfoo%3A%2F%2Fbar%3FargTest%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
      })

      describe('catching unhandled custom protocol request', function () {
        it('should not be normalized if ipfs:/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if ipfs://{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/duckduckgo\\.com\\/\\?q\\=ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest\\&foo\\=bar',
              destination: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest\\1'
            }
          })
        })
        it('should not be normalized if ipns:/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if ipns://{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/duckduckgo\\.com\\/\\?q\\=ipns%3A%2F%2Fipns\\.io%2Findex\\.html%3Farg%3Dfoo%26bar%3Dbuzz%23',
              destination: 'https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#\\1'
            }
          })
        })
        it('should explain the mistake if ipfs://{fqdn}', async function () {
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          const page = invalidAddressPage({
            reason: 'dnslink-under-ipfs',
            address: 'ipfs://ipns.io/index.html?arg=foo&bar=buzz#hashTest',
            suggestedAddress: 'ipns://ipns.io/index.html?arg=foo&bar=buzz#hashTest',
            suggestedUrl: 'https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest'
          })

          ensureInvalidAddressPageShown({
            resp: await modifyRequest.onBeforeRequest(request),
            page
          })
        })
        it('should be normalized if dweb:/ipfs/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/duckduckgo\\.com\\/\\?q\\=dweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash\\&ia\\=software',
              destination: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash\\1'
            }
          })
        })
        it('should not be normalized if dweb://ipfs/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if dweb:/ipns/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/duckduckgo\\.com\\/\\?q\\=dweb%3A%2Fipns%2Fipfs\\.io%2Findex\\.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash\\&ia\\=web',
              destination: 'https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash\\1'
            }
          })
        })
        it('should not be normalized if dweb://ipns/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })

        it('should not be normalized if web+ipfs:/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if web+ipfs://{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/duckduckgo\\.com\\/\\?q\\=web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest\\&foo\\=bar',
              destination: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest\\1'
            }
          })
        })
        it('should not be normalized if web+ipns:/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if web+ipns://{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/duckduckgo\\.com\\/\\?q\\=web%2Bipns%3A%2F%2Fipns\\.io%2Findex\\.html%3Farg%3Dfoo%26bar%3Dbuzz%23',
              destination: 'https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#\\1'
            }
          })
        })
        it('should be normalized if web+dweb:/ipfs/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/duckduckgo\\.com\\/\\?q\\=web%2Bdweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash\\&ia\\=software',
              destination: 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash\\1'
            }
          })
        })
        it('should not be normalized if web+dweb://ipfs/{CID}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should be normalized if web+dweb:/ipns/{foo}', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/duckduckgo\\.com\\/\\?q\\=web%2Bdweb%3A%2Fipns%2Fipfs\\.io%2Findex\\.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash\\&ia\\=web',
              destination: 'https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash\\1'
            }
          })
        })
        it('should not be normalized if web+dweb://ipns/{foo}2', async function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })

        it('should not be normalized if disabled in Preferences', async function () {
          state.catchUnhandledProtocols = false
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should not be normalized if CID is invalid', async function () {
          state.catchUnhandledProtocols = false
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FnotARealIpfsPathWithCid%3FargTest%23hashTest&foo=bar')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should not be normalized if presence of %3A%2F is a false-positive', async function () {
          state.catchUnhandledProtocols = false
          const request = url2request('https://duckduckgo.com/?q=foo%3A%2Fbar%3FargTest%23hashTest&foo=bar')

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        })
        it('should not be normalized if request.type != main_frame', async function () {
          const mediaRequest = { url: 'https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar', type: 'media' }

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(mediaRequest))
        })
      })

      describe('explaining an address that cannot be opened as written', function () {
        it('should explain an IPNS key addressed with ipfs://', async function () {
          const request = url2request(`https://duckduckgo.com/?q=ipfs%3A%2F%2F${ipnsKey}`)
          const page = invalidAddressPage({
            reason: 'ipns-key-under-ipfs',
            address: `ipfs://${ipnsKey}`,
            suggestedAddress: `ipns://${ipnsKey}`,
            suggestedUrl: `https://ipfs.io/ipns/${ipnsKey}`
          })

          ensureInvalidAddressPageShown({
            resp: await modifyRequest.onBeforeRequest(request),
            page
          })
        })

        // the browser lowercases the authority before we ever see the request,
        // and base58btc cannot survive that: https://github.com/ipfs/ipfs-companion/issues/1006
        it('should explain a CIDv0 the browser lowercased under ipfs://', async function () {
          const request = url2request(`https://duckduckgo.com/?q=ipfs%3A%2F%2F${lowercasedCidv0}`)
          const page = invalidAddressPage({
            reason: 'lowercased-cidv0',
            address: `ipfs://${lowercasedCidv0}`
          })

          ensureInvalidAddressPageShown({
            resp: await modifyRequest.onBeforeRequest(request),
            page
          })
        })

        it('should explain a CIDv0 the browser lowercased under ipns://', async function () {
          const request = url2request(`https://duckduckgo.com/?q=ipns%3A%2F%2F${lowercasedCidv0}`)
          const page = invalidAddressPage({
            reason: 'lowercased-cidv0',
            address: `ipns://${lowercasedCidv0}`
          })

          ensureInvalidAddressPageShown({
            resp: await modifyRequest.onBeforeRequest(request),
            page
          })
        })

        // a CID that is merely unfamiliar must still reach the gateway: a
        // base58btc CIDv1 with a dotted sub-path looks like a hostname to a
        // naive check, and breaking it would be worse than showing nothing
        it('should send an unusual but valid CID to the gateway untouched', async function () {
          const cid = 'zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7'
          const request = url2request(`https://duckduckgo.com/?q=ipfs%3A%2F%2F${cid}%2Fdir%2Findex.html`)

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: `https://ipfs.io/ipfs/${cid}/dir/index.html`,
            MV3Expectation: {
              origin: `^https?\\:\\/\\/duckduckgo\\.com\\/\\?q\\=ipfs%3A%2F%2F${cid}%2Fdir%2F`,
              destination: `https://ipfs.io/ipfs/${cid}/dir/\\1`
            }
          })
        })

        it('should not explain anything if disabled in Preferences', async function () {
          state.catchUnhandledProtocols = false
          const request = url2request(`https://duckduckgo.com/?q=ipfs%3A%2F%2F${lowercasedCidv0}`)

          ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
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
