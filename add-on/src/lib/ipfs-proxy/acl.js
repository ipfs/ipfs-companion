'use strict'

module.exports = function createAcl () {
  let acl = []

  return {
    // TODO: inspect persisted acl
    async getAccess (origin, permission) {
      return acl.find((a) => a.origin === origin && (a.permission === permission || a.permission === '*'))
    },

    // TODO: write to persisted acl if remember
    async setAccess (origin, permission, allow, remember) {
      if (permission === '*') {
        // If permission is blanket, then remove all stored permissions for this origin
        acl = acl.filter((a) => a.origin !== origin)
      } else {
        // Remove this permission if exists
        acl = acl.filter((a) => !(a.origin === origin && a.permission === permission))
      }

      // Now add this permission
      acl.push({ origin, permission, allow })

      return { origin, permission, allow }
    },

    async requestAccess (origin, permission) {
      const msg = `Allow ${origin} to access ipfs.${permission}?`

      // TODO: add checkbox to remember decision
      // TODO: add checkbox to allow all for this origin
      let allow

      try {
        allow = window.confirm(msg)
      } catch (err) {
        console.warn('Failed to confirm, possibly not supported in this environment', err)
        allow = false
      }

      return { allow, remember: false, blanket: false }
    }
  }
}
