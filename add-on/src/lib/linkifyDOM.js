'use strict'
/* eslint-env browser, webextensions */

/*
 * This content script is responsible for performing the logic of replacing
 * plain text with IPFS addresses with clickable links.
 * Loosely based on https://github.com/mdn/webextensions-examples/blob/master/emoji-substitution/substitute.js
 * Note that this is a quick&dirty PoC and may slow down browsing experience.
 * TODO: measure & improve performance
 */

;(function (alreadyLinkified) {
  if (alreadyLinkified) {
    return
  }

  // linkify lock
  window.ipfsLinkifiedDOM = true

  const urlRE = /\s+(?:\/ip(f|n)s\/|fs:|ipns:|ipfs:)[^\s+"<>]+/g

  // tags we will scan looking for un-hyperlinked IPFS addresses
  const allowedParents = [
    'abbr', 'acronym', 'address', 'applet', 'b', 'bdo', 'big', 'blockquote', 'body',
    'caption', 'center', 'cite', 'code', 'dd', 'del', 'div', 'dfn', 'dt', 'em',
    'fieldset', 'font', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'iframe',
    'ins', 'kdb', 'li', 'object', 'pre', 'p', 'q', 'samp', 'small', 'span', 'strike',
    's', 'strong', 'sub', 'sup', 'td', 'th', 'tt', 'u', 'var'
  ]

  const textNodeXpath = '//text()[(parent::' + allowedParents.join(' or parent::') + ') and ' +
                  "(contains(., 'ipfs') or contains(., 'ipns')) ]"

  linkifyContainer(document.body)

  // body.appendChild(document.createTextNode('fooo /ipfs/QmTAsnXoWmLZQEpvyZscrReFzqxP3pvULfGVgpJuayrp1w bar'))
  new MutationObserver(function (mutations) {
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        for (let addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.TEXT_NODE) {
            linkifyTextNode(addedNode)
          } else {
            linkifyContainer(addedNode)
          }
        }
      }
      if (mutation.type === 'characterData') {
        linkifyTextNode(mutation.target)
      }
    }
  }).observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true
  })

  function linkifyContainer (container) {
    if (!container.nodeType) {
      return
    }
    if (container.className && container.className.match(/\blinkifiedIpfsAddress\b/)) {
      // prevent infinite recursion
      return
    }
    const xpathResult = document.evaluate(textNodeXpath, container, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null)
    let i = 0
    function continuation () {
      let node = null
      let counter = 0
      while ((node = xpathResult.snapshotItem(i++))) {
        const parent = node.parentNode
        if (!parent) continue
        // Skip styled <pre> -- often highlighted by script.
        if (parent.tagName === 'PRE' && parent.className) continue
        // Skip forms, textareas
        if (parent.isContentEditable) continue
        linkifyTextNode(node)
        if (++counter > 50) {
          return setTimeout(continuation, 0)
        }
      }
    }
    setTimeout(continuation, 0)
  }

  function normalizeHref (href) {
    console.log(href)
    // convert various variants to regular URL at the public gateway
    if (href.startsWith('ipfs:')) {
      href = href.replace('ipfs:', '/ipfs/')
    }
    if (href.startsWith('ipns:')) {
      href = href.replace('ipns:', '/ipns/')
    }
    if (href.startsWith('fs:')) {
      href = href.replace('fs:', '')
    }
    href = 'https://ipfs.io/' + href // for now just point to public gw, we will switch to custom protocol when https://github.com/ipfs/ipfs-companion/issues/164 is closed
    href = href.replace(/([^:]\/)\/+/g, '$1') // remove redundant slashes
    return href
  }

  function linkifyTextNode (node) {
    let link
    let match
    const txt = node.textContent
    let span = null
    let point = 0
    while ((match = urlRE.exec(txt))) {
      if (span == null) {
        // Create a span to hold the new text with links in it.
        span = document.createElement('span')
        span.className = 'linkifiedIpfsAddress'
      }
      // get the link without trailing dots and commas
      link = match[0].replace(/[.,]*$/, '')
      const replaceLength = link.length
      // put in text up to the link
      span.appendChild(document.createTextNode(txt.substring(point, match.index)))
      // create a link and put it in the span
      const a = document.createElement('a')
      a.className = 'linkifiedIpfsAddress'
      a.appendChild(document.createTextNode(link))
      a.setAttribute('href', normalizeHref(link.trim()))
      span.appendChild(a)
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
        console.log(node)
      }
    }
  }
}(window.ipfsLinkifiedDOM))
