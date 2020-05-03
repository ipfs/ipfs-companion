const { Resolution } = require('@unstoppabledomains/resolution')
const browser = require('webextension-polyfill')
// Main tool to resolve blockchain domains
const resolution = new Resolution({
  blockchain: {
    ens: { url: 'https://mainnet.infura.io/v3/7253dea473954208bede79ae26ae1225' },
    cns: { url: 'https://mainnet.infura.io/v3/7253dea473954208bede79ae26ae1225' }
  }
})

function domainResolution (request) {
  const url = new URL(request.url)
  const domain = url.hostname
  if (resolution.isSupportedDomain(domain)) {
    return resolution.ipfsHash(domain).then(hash => {
      const redirectUrl = `https://cloudflare-ipfs.com/ipfs/${hash}${url.pathname}`
      browser.tabs.update({ url: redirectUrl })
      return { cancel: true }
    })
  }
}

function parseGoogleSearch (requestDetails) {
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

exports.domainResolution = domainResolution
exports.parseGoogleSearch = parseGoogleSearch
