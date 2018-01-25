'use strict'

function injectScript (src, target, opts) {
  opts = opts || {}
  const doc = opts.document || document

  const scriptTag = doc.createElement('script')
  scriptTag.src = src
  scriptTag.onload = function () {
    this.parentNode.removeChild(this)
  }

  target = doc.head || doc.documentElement
  target.appendChild(scriptTag)
}

module.exports = injectScript
