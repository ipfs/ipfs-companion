'use strict'
/* eslint-env browser, webextensions */

/*
 * This content script is responsible for performing the logic of replacing
 * plain text with IPFS addresses with clickable links.
 * Loosely based on https://github.com/mdn/webextensions-examples/blob/master/emoji-substitution/substitute.js
 * Note that this is a quick&dirty PoC and may slow down browsing experience.
 * Test page: http://bit.ly/2yuknPI
 * TODO: measure & improve performance
 */

;(function (alreadyLoaded) {
  if (alreadyLoaded) {
    return
  }

  // Limit contentType to "text/plain" or "text/html"
  if (document.contentType !== undefined && document.contentType !== 'text/plain' && document.contentType !== 'text/html') {
    return
  }

  // linkify lock
  window.ipfsCompanionLinkifiedDOM = true
  window.ipfsCompanionLinkifyValidationCache = new Map()

  const urlRE = /(?:\s+|^)(\/ip(?:f|n)s\/|dweb:\/ip(?:f|n)s\/|ipns:\/\/|ipfs:\/\/)([^\s+"<>:]+)/g

  // Chrome compatibility
  // var browser = browser || chrome

  // tags we will scan looking for un-hyperlinked IPFS addresses
  const allowedParents = [
    'abbr', 'acronym', 'address', 'applet', 'b', 'bdo', 'big', 'blockquote', 'body',
    'caption', 'center', 'cite', 'code', 'dd', 'del', 'div', 'dfn', 'dt', 'em',
    'fieldset', 'font', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'iframe',
    'ins', 'kdb', 'li', 'object', 'pre', 'p', 'q', 'samp', 'small', 'span', 'strike',
    's', 'strong', 'sub', 'sup', 'td', 'th', 'tt', 'u', 'var'
  ]

  const textNodeXpath = './/text()[' +
    "(contains(., '/ipfs/') or contains(., '/ipns/') or contains(., 'ipns:/') or contains(., 'ipfs:/')) and " +
    'not(ancestor::a) and not(ancestor::script) and not(ancestor::style) and ' +
    '(parent::' + allowedParents.join(' or parent::') + ') ' +
    ']'

  function init () {
    linkifyContainer(document.body)

    // body.appendChild(document.createTextNode('fooo /ipfs/QmTAsnXoWmLZQEpvyZscrReFzqxP3pvULfGVgpJuayrp1w bar'))
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          for (let addedNode of mutation.addedNodes) {
            if (addedNode.nodeType === Node.TEXT_NODE) {
              setTimeout(() => linkifyTextNode(addedNode), 0)
            } else {
              setTimeout(() => linkifyContainer(addedNode), 0)
            }
          }
        }
        if (mutation.type === 'characterData') {
          setTimeout(() => linkifyTextNode(mutation.target), 0)
        }
      })
    }).observe(document.body, {
      characterData: true,
      childList: true,
      subtree: true
    })
  }

  function linkifyContainer (container) {
    if (!container || !container.nodeType) {
      return
    }
    if (container.className && container.className.match && container.className.match(/\blinkifiedIpfsAddress\b/)) {
      // prevent infinite recursion
      return
    }
    const xpathResult = document.evaluate(textNodeXpath, container, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    let i = 0
    async function continuation () {
      let node = null
      let counter = 0
      while ((node = xpathResult.snapshotItem(i++))) {
        const parent = node.parentNode
        // Skip if no longer in visible DOM
        if (!parent || !container.contains(node)) continue
        // Skip already linkified nodes
        if (parent.className && parent.className.match(/\blinkifiedIpfsAddress\b/)) continue
        // Skip styled <pre> -- often highlighted by script.
        if (parent.tagName === 'PRE' && parent.className) continue
        // Skip forms, textareas
        if (parent.isContentEditable) continue
        await linkifyTextNode(node)
        if (++counter > 10) {
          return setTimeout(continuation, 0)
        }
      }
    }
    setTimeout(continuation, 0)
  }

  function textToIpfsResource (match) {
    let root = match[1]
    let path = match[2]

    // skip trailing dots and commas
    path = path.replace(/[.,]*$/, '')

    // convert various protocol variants to regular URL at the public gateway
    if (root === 'ipfs://') {
      root = '/ipfs/'
    } else if (root === 'ipns://') {
      root = '/ipns/'
    } else if (root === 'dweb:/ipfs/') {
      root = '/ipfs/'
    } else if (root === 'dweb:/ipns/') {
      root = '/ipns/'
    }
    return validIpfsResource(root + path)
  }

  async function validIpfsResource (path) {
    // validation is expensive, caching result improved performance
    // on page that have multiple copies of the same path
    if (window.ipfsCompanionLinkifyValidationCache.has(path)) {
      return window.ipfsCompanionLinkifyValidationCache.get(path)
    }
    try {
      // Callback wrapped in promise -- Chrome compatibility
      const checkResult = await browser.runtime.sendMessage({pubGwUrlForIpfsOrIpnsPath: path})
      window.ipfsCompanionLinkifyValidationCache.set(path, checkResult.pubGwUrlForIpfsOrIpnsPath)
    } catch (error) {
      window.ipfsCompanionLinkifyValidationCache.set(path, null)
      console.error('pubGwUrlForIpfsOrIpnsPath.error for ' + path, error)
    }
    return window.ipfsCompanionLinkifyValidationCache.get(path)
  }

  async function linkifyTextNode (node) {
    let link
    let match
    const txt = node.textContent
    let span = null
    let point = 0
    while ((match = urlRE.exec(txt))) {
      link = await textToIpfsResource(match)
      if (span == null) {
          // Create a span to hold the new text with links in it.
        span = document.createElement('span')
        span.className = 'linkifiedIpfsAddress'
      }
      const replaceLength = match[0].length
      if (link) {
        // put in text up to the link
        span.appendChild(document.createTextNode(txt.substring(point, match.index)))
        // create a link and put it in the span
        const a = document.createElement('a')
        a.className = 'linkifiedIpfsAddress'
        a.appendChild(document.createTextNode(match[0]))
        a.setAttribute('href', link)
        span.appendChild(a)
      } else {
        // wrap text in span to exclude it from future processing
        span.appendChild(document.createTextNode(match[0]))
      }
        // track insertion point
      point = match.index + replaceLength
    }
    if (span) {
      // take the text after the last link
      span.appendChild(document.createTextNode(txt.substring(point, txt.length)))
      // replace the original text with the new span
      try {
        node.parentNode.replaceChild(span, node)
      } catch (e) {
        console.error(e)
        // console.log(node)
      }
    }
  }

  init()
}(window.ipfsCompanionLinkifiedDOM))
