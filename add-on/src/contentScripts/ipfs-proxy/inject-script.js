'use strict'

function injectScript (code, opts) {
  opts = opts || {}
  const doc = opts.document || document

  const scriptTag = document.createElement('script')
  scriptTag.innerHTML = code

  const target = opts.target || doc.head || doc.documentElement
  target.appendChild(scriptTag)
  scriptTag.parentNode.removeChild(scriptTag)
}

module.exports = injectScript
