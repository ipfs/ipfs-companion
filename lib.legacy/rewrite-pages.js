'use strict'

const events = require('sdk/system/events')
const protocols = require('./protocols.js')
const gw = require('./gateways.js')

const {Ci} = require('chrome')

// TODO: svg text elements?
const ELEMENT_WHITELIST = `p span div body aside section blockquote li dt dd article header footer figure td th
  ins del i em u s b dfn abbr small strong`.split(/\s+/)

/*
  current approach: iterate over adjacent text nodes and prefix-match plain IPFS URIs, then extend match forward until whitespace is found

  potential alternative to investigate: using DOM Ranges
*/
function processTextNode (node) {
  let parent = node.parentNode
  if (!parent || parent.namespaceURI !== 'http://www.w3.org/1999/xhtml' || parent.isContentEditable || ELEMENT_WHITELIST.indexOf(parent.localName) === -1) {
    return
  }
  // don't create links inside links
  let ancestor = parent.closest('a')
  if (ancestor && ancestor.namespaceURI === 'http://www.w3.org/1999/xhtml') {
    return
  }

  let re = /(?:\/ip(f|n)s\/|fs:|ipns:|ipfs:)\S+/g

  let text = node.data

  // only match once, we slice up the text node which will trigger further mutations anyway
  let match
  let toReplace = node
  let offset

  for (;;) {
    match = re.exec(text)
    if (!match) {
      return
    }
    offset = match.index
    // JS regex doesn't support lookbehind, do it manually
    if (offset > 0 && !/\s/.test(text[offset - 1])) {
      continue
    }
    break
  }

  let doc = node.ownerDocument
  let frag = doc.createDocumentFragment()

  let url = match[0]
  let lastMatch = re.lastIndex

  // preceding non-link text
  if (offset > 0) {
    frag.appendChild(doc.createTextNode(text.substring(0, offset)))
  }

  let a = doc.createElementNS('http://www.w3.org/1999/xhtml', 'a')
  frag.appendChild(a)
  a.appendChild(doc.createTextNode(url))

  let brs = []
  let toRemove = []

  // slip-forward to deal with text split over multiple text nodes
  // TODO: in theory we also should do a look-behind if we happen to get a partial mutation from the parser
  while (lastMatch === text.length) {
    node = node.nextSibling
    if (!node) {
      break
    }

    if (node.nodeType === 1 && (node.localName === 'br' || node.localName === 'wbr')) {
      brs.push(node)
      if (brs.length > 1) {
        // two consecutive newlines -> new paragraph and not just a forced linebreak
        break
      }

      continue
    }

    if (node.nodeType === 3) {
      re = /^\S+/
      match = re.exec(text)
      if (!match) {
        break
      }
      text = node.data
      for (let br of brs) {
        a.appendChild(br)
      }
      brs = []
      toRemove.push(node)

      let urlPart = match[0]
      lastMatch = urlPart.length

      url += urlPart
      a.appendChild(doc.createTextNode(urlPart))
      continue
    }

    break
  }

  toRemove.forEach((e) => {
    e.remove()
  })

  a.href = protocols.rewrite(url)

  // trailing non-link text
  frag.appendChild(doc.createTextNode(text.substring(lastMatch)))
  parent.replaceChild(frag, toReplace)

  return a
}

function processElement (element) {
  if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
    return
  }
  if (element.localName === 'a' && element.hasAttribute('href')) {
    // .href resolves relative to base domain, .getAttribute may return relative urls e.g. /ipfs/...
    let orig = element.getAttribute('href')
    let rewritten = protocols.rewrite(orig)
    if (rewritten && orig !== rewritten) {
      element.href = rewritten
    }
  }
}

function mutationCallback (records) {
  for (let r of records) {
    if (r.type === 'childList') {
      for (let added of r.addedNodes) {
        if (added.nodeType === 3) { // Node.TEXT_NODE
          // console.log("added T", added.localname)
          processTextNode(added)
        }
        if (added.nodeType === 1) { // Node.ELEMENT
          // console.log("added E", added)
          processElement(added)
        }
      }
    }
    if (r.type === 'characterData') {
      // console.log("changed T", r.target)
      processTextNode(r.target)
    }
  }
}

const SCHEME_WHITELIST = 'resource http https ftp ipfs fs ipns'.split(' ')

const documentObserver = function (event) {
  let {subject, type} = event

  if (type !== 'content-document-global-created') {
    return
  }
  if (!(subject instanceof Ci.nsIDOMWindow)) {
    return
  }

  let window = subject
  let document = window.document

  let uri = document.documentURIObject

  // don't touch chrome/about documents
  // alternative approach: check for non-system principal
  if (!uri || SCHEME_WHITELIST.indexOf(uri.scheme) === -1) {
    return
  }

  /*
  // approach A
  // tree walk on load -> might lead to a long processing pause on large docs

  let docLoaded = function() {
    let obs = new window.MutationObserver(mutationCallback)
    obs.observe(document, {characterData: true, subtree: true, childList: true})
    let walker = document.createTreeWalker(document.documentElement, window.NodeFilter.SHOW_TEXT)
    let next
    while(walker.nextNode()) {
      let replaced = processTextNode(walker.currentNode)
      if(replaced) {
        walker.currentNode = replaced
      }
    }
    document.removeEventListener("DOMContentLoaded", docLoaded)
  }

  document.addEventListener("DOMContentLoaded", docLoaded)
  */

  // approach B
  // incremental, process text as it arrives from the parser
  let obs = new window.MutationObserver(mutationCallback)
  obs.observe(document, {
    characterData: true,
    subtree: true,
    childList: true
  })
}

gw.onPreferencesChange(() => {
  if (gw.linkify) {
    events.on('content-document-global-created', documentObserver)
  } else {
    events.off('content-document-global-created', documentObserver)
  }
})
