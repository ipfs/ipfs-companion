'use strict'
/* eslint-env browser */

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
    if (!acl.has(origin) || !acl.get(origin).has(permission)) return null
    return { origin, permission, allow: acl.get(origin).get(permission) }
  }

  async setAccess (origin, permission, allow) {
    if (!isOrigin(origin)) throw new TypeError('Invalid origin')
    if (!isString(permission)) throw new TypeError('Invalid permission')
    if (!isBoolean(allow)) throw new TypeError('Invalid allow')

    return this._writeQ.add(async () => {
      const access = { origin, permission, allow }
      const acl = await this.getAcl()

      if (!acl.has(origin)) {
        acl.set(origin, new Map())
      }

      acl.get(origin).set(permission, allow)

      await this._setAcl(acl)
      return access
    })
  }

  // { origin: { permission: allow } }
  async getAcl () {
    const acl = (await this._storage.local.get(this._key))[this._key]
    return new Map(acl ? JSON.parse(acl).map(entry => [entry[0], new Map(entry[1])]) : [])
  }

  _setAcl (acl) {
    acl = Array.from(acl).map(entry => [entry[0], Array.from(entry[1])])
    return this._storage.local.set({ [this._key]: JSON.stringify(acl) })
  }

  // Revoke access to the given permission
  // if permission is null, revoke all access
  async revokeAccess (origin, permission = null) {
    if (!isOrigin(origin)) throw new TypeError('Invalid origin')
    if (permission && !isString(permission)) throw new TypeError('Invalid permission')

    return this._writeQ.add(async () => {
      const acl = await this.getAcl()

      if (permission) {
        if (acl.has(origin)) {
          acl.get(origin).delete(permission)
        }
      } else {
        acl.set(origin, new Map())
      }

      return this._setAcl(acl)
    })
  }

  destroy () {
    this._storage.onChanged.removeListener(this._onStorageChange)
  }
}

module.exports = AccessControl

const isOrigin = (value) => {
  if (!isString(value)) return false

  let url

  try {
    url = new URL(value)
  } catch (_) {
    return false
  }

  return url.origin === value
}

const isString = (value) => Object.prototype.toString.call(value) === '[object String]'
const isBoolean = (value) => value === true || value === false
