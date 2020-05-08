const { Resolution } = require('@unstoppabledomains/resolution')
const browser = require('webextension-polyfill')
// Main tool to resolve blockchain domains
const resolution = new Resolution({
  blockchain: {
    ens: false,
    cns: { url: 'https://mainnet.infura.io/v3/7253dea473954208bede79ae26ae1225' }
  }
})

function createUnstoppableDomainsController (getState) {
  const loadingPageURL = browser.extension.getURL('dist/pages/unstoppableDomains/loading.html')
  const enableOptionPageURL = browser.extension.getURL('dist/pages/unstoppableDomains/enableUnstoppableOption.html')

  const rules = {
    segmentMinLength: 2,
    labelLength: 63,
    domainLength: 253,
    domainSegment: /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    tldSegment: /^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/
  }

  function isValidDNSHostname (hostname) {
    if (!hostname || hostname.length > rules.domainLength) return false
    const labels = hostname.split('.')
    if (labels.length < rules.segmentMinLength) {
      return false
    }
    return labels.every((label, i) => {
      if (i < labels.length - 1) {
        return rules.domainSegment.test(label) && label.length <= rules.labelLength
      }
      return rules.tldSegment.test(label)
    })
  }

  return {
    isSupportedDomain (request) {
      const url = new URL(request.url)
      const domain = url.hostname
      return resolution.isSupportedDomain(domain)
    },

    domainResolution (request, ipfsPathValidator) {
      var state = getState()
      if (!state.supportUnstoppableDomains) {
        browser.tabs.update({ url: enableOptionPageURL })
        return { cancel: true }
      }
      const url = new URL(request.url)
      const domain = url.hostname
      console.log('trying to redirect to loading while hash is generating?', loadingPageURL)
      browser.tabs.update({ url: loadingPageURL })
      console.log('oinside hte redirect...')
      return resolution.ipfsHash(domain).then(hash => {
        const redirectUrl = ipfsPathValidator.resolveToPublicUrl(`/ipfs/${hash}${url.pathname}`)
        browser.tabs.update({ url: redirectUrl })
        return { cancel: true }
      }).catch(err => {
        console.log('capture error!', err.code)
        const errorPageURL = loadingPageURL + `?error=${err.code}&domain=${domain}`
        browser.tabs.update({ url: errorPageURL })
      })
    },
    isSearchEngine (request) {
      const url = new URL(request.url)
      console.log(url)
      const params = url.searchParams.get('q')
      console.log(params)
      if (params) return true
      return false
    },
    parseSearchEngine (requestDetails) {
      const url = new URL(requestDetails.url)
      const params = url.searchParams.get('q').trim().toLowerCase()
      const q = new URL(url.protocol + '//' + params)
      if (
        !q.hostname ||
        !isValidDNSHostname(q.hostname) ||
        !resolution.isSupportedDomain(q.hostname) ||
        url.pathname !== '/search'
      ) {
        return
      }
      browser.tabs.update({ url: q.toString() })
      return { cancel: true }
    }
  }
}

exports.createUnstoppableDomainsController = createUnstoppableDomainsController
