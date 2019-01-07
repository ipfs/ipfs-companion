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
    const scopesKey = this._getScopesKey()
    const aclChangeKeys = Object.keys(changes).filter((key) => {
      return key !== scopesKey && key.startsWith(prefix)
    })

    if (!aclChangeKeys.length) return

    // Map { scope => Map { permission => allow } }
    this.emit('change', aclChangeKeys.reduce((aclChanges, key) => {
      return aclChanges.set(
        key.slice(prefix.length + ('.access'.length) + 1),
        new Map(JSON.parse(changes[key].newValue))
      )
    }, new Map()))
  }

  _getScopesKey () {
    return `${this._storageKeyPrefix}.scopes`
  }

  // Get the list of scopes stored in the acl
  async _getScopes () {
    const key = this._getScopesKey()
    return new Set(
      JSON.parse((await this._storage.local.get({ [key]: '[]' }))[key])
    )
  }

  async _addScope (scope) {
    const scopes = await this._getScopes()
    scopes.add(scope)

    const key = this._getScopesKey()
    await this._storage.local.set({ [key]: JSON.stringify(Array.from(scopes)) })
  }

  // ordered by longest first
  async _getMatchingScopes (scope) {
    const scopes = await this._getScopes()
    const origin = new URL(scope).origin

    return Array.from(scopes)
      .filter(s => {
        if (origin !== new URL(s).origin) return false
        return scope.startsWith(s)
      })
      .sort((a, b) => b.length - a.length)
  }

  _getAccessKey (scope) {
    return `${this._storageKeyPrefix}.access.${scope}`
  }

  // Get a Map of granted permissions for a given scope
  // e.g. Map { 'add' => true, 'object.new' => false }
  async _getAllAccess (scope) {
    const key = this._getAccessKey(scope)
    return new Map(
      JSON.parse((await this._storage.local.get({ [key]: '[]' }))[key])
    )
  }

  // Return current access rights to given permission.
  async getAccess (scope, permission) {
    if (!isScope(scope)) throw new TypeError('Invalid scope')
    if (!isString(permission)) throw new TypeError('Invalid permission')

    const matchingScopes = await this._getMatchingScopes(scope)

    let allow = null
    let matchingScope

    for (matchingScope of matchingScopes) {
      const allAccess = await this._getAllAccess(matchingScope)

      if (allAccess.has('*')) {
        allow = allAccess.get('*')
        break
      }

      if (allAccess.has(permission)) {
        allow = allAccess.get(permission)
        break
      }
    }

    return allow == null ? null : { scope: matchingScope, permissions: [permission], allow }
  }

  // Set access rights to given permissions.
  // 'permissions' can be an array of strings or a single string
  async setAccess (scope, permissions, allow) {
    permissions = Array.isArray(permissions) ? permissions : [permissions]
    if (!isScope(scope)) throw new TypeError('Invalid scope')
    if (!isStringArray(permissions)) throw new TypeError('Invalid permissions')
    if (!isBoolean(allow)) throw new TypeError('Invalid allow')

    return this._writeQ.add(async () => {
      const allAccess = await this._getAllAccess(scope)

      // Trying to set access for non-wildcard permission, when wildcard
      // permission is already granted?
      if (allAccess.has('*') && !permissions.includes('*')) {
        if (allAccess.get('*') === allow) {
          // Noop if requested access is the same as access for wildcard grant
          return { scope, permissions, allow }
        } else {
          // Fail if requested access is the different to access for wildcard grant
          throw new Error(`Illegal set access for '${permissions}' when wildcard exists`)
        }
      }

      // If setting a wildcard permission, remove existing grants
      if (permissions.includes('*')) {
        allAccess.clear()
      }

      permissions.forEach(permission => allAccess.set(permission, allow))

      const accessKey = this._getAccessKey(scope)
      await this._storage.local.set({ [accessKey]: JSON.stringify(Array.from(allAccess)) })

      await this._addScope(scope)

      return { scope, permissions, allow }
    })
  }

  // Map { scope => Map { permission => allow } }
  async getAcl () {
    const scopes = await this._getScopes()
    const acl = new Map()

    await Promise.all(Array.from(scopes).map(scope => {
      return (async () => {
        const allAccess = await this._getAllAccess(scope)
        acl.set(scope, allAccess)
      })()
    }))

    return acl
  }

  // Revoke access to the given permission
  // if permission is null, revoke all access
  async revokeAccess (scope, permission = null) {
    if (!isScope(scope)) throw new TypeError('Invalid scope')
    if (permission && !isString(permission)) throw new TypeError('Invalid permission')

    return this._writeQ.add(async () => {
      let allAccess

      if (permission) {
        allAccess = await this._getAllAccess(scope)
        if (!allAccess.has(permission)) return
        allAccess.delete(permission)
      } else {
        allAccess = new Map()
      }

      const key = this._getAccessKey(scope)
      await this._storage.local.set({ [key]: JSON.stringify(Array.from(allAccess)) })
    })
  }

  destroy () {
    this._storage.onChanged.removeListener(this._onStorageChange)
  }
}

module.exports = AccessControl

const isScope = (value) => {
  if (!isString(value)) return false

  let url

  try {
    url = new URL(value)
  } catch (_) {
    return false
  }

  return url.origin + url.pathname === value
}

const isString = (value) => Object.prototype.toString.call(value) === '[object String]'
const isStringArray = (value) => Array.isArray(value) && value.length && value.every(isString)
const isBoolean = (value) => value === true || value === false
