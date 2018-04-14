'use strict'
/* eslint-env browser */

/**
 * An Error that indicates API access was somehow denied by the user
 * @type {IpfsApiAccessError}
 * @example
 *   try {
 *     await ipfs.files.add(Buffer.from('seed'))
 *   } catch (err) {
 *     if (err instanceof window.ipfs.types.IpfsApiAccessError) {
 *       // API access was denied by the user
 *     }
 *   }
 */
class IpfsApiAccessError extends Error {
  constructor (message, permission, scope) {
    super(message)
    this.permission = permission
    this.scope = scope
  }
}

module.exports = IpfsApiAccessError
