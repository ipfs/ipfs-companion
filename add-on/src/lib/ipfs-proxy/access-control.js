'use strict'

const EventEmitter = require('events')
const PQueue = require('p-queue')

class AccessControl extends EventEmitter {
  constructor (storage, key = 'ipfsProxyAcl') {
    super()
    this._storage = storage
    this._key = key
    this._onStorageChange = this._onStorageChange.bind(this)
    storage.onChanged.addListener(this._onStorageChange)
    this._writeQ = new PQueue({ concurrency: 1 })
  }

  async _onStorageChange (changes) {
    const isAclChange = Object.keys(changes).some((key) => key === this._key)
    if (!isAclChange) return
    const acl = await this.getAcl()
    this.emit('change', acl)
  }

  async getAccess (origin, permission) {
    const acl = await this.getAcl()
    if (acl[origin] == null || acl[origin][permission] == null) return null
    return { origin, permission, allow: acl[origin][permission] }
  }

  async setAccess (origin, permission, allow) {
    return this._writeQ.add(async () => {
      const access = { origin, permission, allow }
      const acl = await this.getAcl()

      acl[origin] = acl[origin] || {}
      acl[origin][permission] = allow

      await this._setAcl(acl)
      return access
    })
  }

  // { origin: { permission: allow } }
  async getAcl () {
    const acl = (await this._storage.local.get(this._key))[this._key]
    return acl ? JSON.parse(acl) : {}
  }

  _setAcl (acl) {
    return this._storage.local.set({ [this._key]: JSON.stringify(acl) })
  }

  // Revoke access to the given permission
  // if permission is null, revoke all access
  async revokeAccess (origin, permission = null) {
    return this._writeQ.add(async () => {
      const acl = await this.getAcl()

      if (permission) {
        delete acl[origin][permission]
      } else {
        acl[origin] = {}
      }

      return this._setAcl(acl)
    })
  }

  destroy () {
    this._storage.onChanged.removeListener(this._onStorageChange)
  }
}

module.exports = AccessControl
