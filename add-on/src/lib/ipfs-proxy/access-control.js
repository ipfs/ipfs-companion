'use strict'
/* eslint-env browser */

const EventEmitter = require('events')
const PQueue = require('p-queue')

class AccessControl extends EventEmitter {
  constructor (storage, storageKeyPrefix = 'ipfsProxyAcl') {
    super()
    this._storage = storage
    this._storageKeyPrefix = storageKeyPrefix
    this._onStorageChange = this._onStorageChange.bind(this)
    storage.onChanged.addListener(this._onStorageChange)
    this._writeQ = new PQueue({ concurrency: 1 })
  }

  async _onStorageChange (changes) {
    const prefix = this._storageKeyPrefix
    const aclChangeKeys = Object.keys(changes).filter((key) => key.startsWith(prefix))

    if (!aclChangeKeys.length) return

    // Map { origin => Map { permission => allow } }
    this.emit('change', aclChangeKeys.reduce((aclChanges, key) => {
      return aclChanges.set(key.slice(prefix.length + 1), new Map(changes[key].newValue))
    }, new Map()))
  }

  _getGrantsKey (origin) {
    return `${this._storageKeyPrefix}.${origin}`
  }

  // Get a Map of granted permissions for a given origin
  // e.g. Map { 'files.add' => true, 'object.new' => false }
  async _getGrants (origin) {
    const key = this._getGrantsKey(origin)
    return new Map((await this._storage.local.get({ [key]: [] }))[key])
  }

  async _setGrants (origin, grants) {
    const key = this._getGrantsKey(origin)
    return this._storage.local.set({ [key]: Array.from(grants) })
  }

  async getAccess (origin, permission) {
    if (!isOrigin(origin)) throw new TypeError('Invalid origin')
    if (!isString(permission)) throw new TypeError('Invalid permission')

    const grants = await this._getGrants(origin)

    return grants.has(permission)
      ? { origin, permission, allow: grants.get(permission) }
      : null
  }

  async setAccess (origin, permission, allow) {
    if (!isOrigin(origin)) throw new TypeError('Invalid origin')
    if (!isString(permission)) throw new TypeError('Invalid permission')
    if (!isBoolean(allow)) throw new TypeError('Invalid allow')

    return this._writeQ.add(async () => {
      const access = { origin, permission, allow }
      const grants = await this._getGrants(origin)

      grants.set(permission, allow)
      await this._setGrants(origin, grants)

      return access
    })
  }

  // Map { origin => Map { permission => allow } }
  async getAcl () {
    const data = await this._storage.local.get()
    const prefix = this._storageKeyPrefix

    return Object.keys(data)
      .reduce((acl, key) => {
        return key.startsWith(prefix)
          ? acl.set(key.slice(prefix.length + 1), new Map(data[key]))
          : acl
      }, new Map())
  }

  // Revoke access to the given permission
  // if permission is null, revoke all access
  async revokeAccess (origin, permission = null) {
    if (!isOrigin(origin)) throw new TypeError('Invalid origin')
    if (permission && !isString(permission)) throw new TypeError('Invalid permission')

    return this._writeQ.add(async () => {
      let grants

      if (permission) {
        grants = await this._getGrants(origin)
        if (!grants.has(permission)) return
        grants.delete(permission)
      } else {
        grants = new Map()
      }

      await this._setGrants(origin, grants)
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
