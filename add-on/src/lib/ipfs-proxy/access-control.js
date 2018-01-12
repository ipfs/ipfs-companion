'use strict'

const browser = require('webextension-polyfill')
const EventEmitter = require('events')

class AccessControl extends EventEmitter {
  constructor (storage = browser.storage) {
    super()
    this._storage = storage
    this._onStorageChange = this._onStorageChange.bind(this)
    storage.onChanged.addListener(this._onStorageChange)
  }

  async _onStorageChange (changes) {
    const isAclChange = Object.keys(changes).some((key) => key === 'ipfsProxyAcl')
    if (!isAclChange) return
    const acl = await this.getAcl()
    this.emit('change', acl)
  }

  async getAccess (origin, permission) {
    const acl = await this.getAcl()
    return (acl[origin] || []).find((a) => a.permission === permission || a.permission === '*')
  }

  async setAccess (origin, permission, allow) {
    const access = { permission, allow }
    const acl = await this.getAcl()

    if (permission === '*') {
      // If grant permission is blanket, then remove all stored grants for this origin
      acl[origin] = [access]
    } else {
      // Remove this grant if exists, and add the new one
      acl[origin] = (acl[origin] || []).filter((a) => a.permission !== permission).concat(access)
    }

    await this._setAcl(acl)
    return access
  }

  async requestAccess (origin, permission) {
    const msg = `Allow ${origin} to access ipfs.${permission}?`

    // TODO: add checkbox to allow all for this origin
    let allow

    try {
      allow = window.confirm(msg)
    } catch (err) {
      console.warn('Failed to confirm, possibly not supported in this environment', err)
      allow = false
    }

    return { allow, blanket: false }
  }

  async getAcl () {
    const acl = (await this._storage.local.get('ipfsProxyAcl')).ipfsProxyAcl
    return acl ? JSON.parse(acl) : {}
  }

  _setAcl (acl) {
    return this._storage.local.set({ ipfsProxyAcl: JSON.stringify(acl) })
  }

  // Revoke access to the given permission
  // if permission is null, revoke all access
  async revokeAccess (origin, permission = null) {
    const acl = await this.getAcl()

    if (permission) {
      acl[origin] = acl[origin].filter((access) => access.permission !== permission)
    } else {
      acl[origin] = []
    }

    return this._setAcl(acl)
  }

  destroy () {
    this._storage.onChanged.removeListener(this._onStorageChange)
  }
}

module.exports = AccessControl
