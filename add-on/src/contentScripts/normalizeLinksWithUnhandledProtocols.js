'use strict'
/* eslint-env browser, webextensions */

/*
 * This content script detects IPFS-related protocols in `href` and `src`
 * attributes and replaces them with URL at the user-specified public HTTP gateway.
 * Note that if IPFS API is online, HTTP request will be redirected to custom gateway.
 *
 * For more background see: https://github.com/ipfs/ipfs-companion/issues/286
 *
 * Test page: http://bit.ly/2hXiuUz
 */

;(function (alreadyLoaded) {
  if (alreadyLoaded) {
    return
  }

  // Limit contentType to "text/plain" or "text/html"
  if (document.contentType !== undefined && document.contentType !== 'text/plain' && document.contentType !== 'text/html') {
    return
  }

  // prevent double init
  window.ipfsCompanionNormalizedUnhandledProtocols = true

  // XPath selects all elements that have `href` of `src` attribute starting with one of IPFS-related protocols
  const xpath = ".//*[starts-with(@href, 'ipfs://') or starts-with(@href, 'ipns://') or starts-with(@href, 'dweb:') " +
                " or starts-with(@src, 'ipfs://') or starts-with(@src, 'ipns://') or starts-with(@src, 'dweb:')]"

  const pubGwURL = window.ipfsCompanionPubGwURL

  function init () {
    // initial run
    normalizeTree(document.body)

    // listen for future DOM changes
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          for (const addedNode of mutation.addedNodes) {
            if (addedNode.nodeType === Node.ELEMENT_NODE) {
              setTimeout(() => normalizeTree(addedNode), 0)
            }
          }
        }
      })
    }).observe(document.body, {
      characterData: false,
      childList: true,
      subtree: true
    })
  }

  function normalizeElement (element) {
    if (element.href) {
      // console.log('normalizeElement.href: ' + element.href)
      element.href = normalizeAddress(element.href)
    } else if (element.src) {
      // console.log('normalizeElement.src: ' + element.src)
      element.src = normalizeAddress(element.src)
    }
  }

  // replaces unhandled protocol with a regular URL at a public gateway
  function normalizeAddress (addr) {
    return addr
      .replace(/^dweb:\//i, pubGwURL) // dweb:/ipfs/Qm → /ipfs/Qm
      .replace(/^ipfs:\/\//i, `${pubGwURL}ipfs/`) // ipfs://Qm → /ipfs/Qm
      .replace(/^ipns:\/\//i, `${pubGwURL}ipns/`) // ipns://Qm → /ipns/Qm
  }

  function normalizeTree (root) {
    const xpathResult = document.evaluate(xpath, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    let i = 0
    function continuation () {
      let node = null
      let counter = 0
      while ((node = xpathResult.snapshotItem(i++))) {
        const parent = node.parentNode
        // Skip if no longer in visible DOM
        if (!parent || !root.contains(node)) continue
        normalizeElement(node)
        if (++counter > 10) {
          return setTimeout(continuation, 0)
        }
      }
    }
    window.requestAnimationFrame(continuation)
  }

  init()
}(window.ipfsCompanionNormalizedUnhandledProtocols))
