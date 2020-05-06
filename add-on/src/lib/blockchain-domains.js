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
    domainResolution (request) {
      var state = getState()
      console.log(state)
      if (!state.supportUnstoppableDomains) {
        console.log({ loadingPageURL, enableOptionPageURL })
        browser.tabs.update({ url: enableOptionPageURL })
        return { cancel: true }
      }
      const url = new URL(request.url)
      const domain = url.hostname
      console.log('domain = ', domain)
      if (resolution.isSupportedDomain(domain)) {
        console.log('trying to redirect to loading while hash is generating?', loadingPageURL)
        browser.tabs.update({ url: loadingPageURL })
        console.log('oinside hte redirect...')
        return resolution.ipfsHash(domain).then(hash => {
          const redirectUrl = `https://cloudflare-ipfs.com/ipfs/${hash}${url.pathname}`
          browser.tabs.update({ url: redirectUrl })
          return { cancel: true }
        })
      }
    },

    parseGoogleSearch (requestDetails) {
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

// exports.domainResolution = domainResolution
// exports.parseGoogleSearch = parseGoogleSearch
exports.createUnstoppableDomainsController = createUnstoppableDomainsController
