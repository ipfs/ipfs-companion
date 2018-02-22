// This are the functions that DO NOT require an allow/deny decision by the user.
// All other IPFS functions require authorization.
const ACL_WHITELIST = Object.freeze(require('./acl-whitelist.json'))

// TEMPORARY blacklist of MFS functions that are automatically denied access
// https://github.com/ipfs-shipyard/ipfs-companion/issues/330#issuecomment-367651787
const MFS_BLACKLIST = Object.freeze([
  'files.cp',
  'files.mkdir',
  'files.stat',
  'files.rm',
  'files.read',
  'files.write',
  'files.mv',
  'files.flush',
  'files.ls'
])

// Creates a "pre" function that is called prior to calling a real function
// on the IPFS instance. It will throw if access is denied, and ask the user if
// no access decision has been made yet.
function createPreAcl (getState, accessControl, getScope, permission, requestAccess) {
  return async (...args) => {
    // Check if all access to the IPFS node is disabled
    if (!getState().ipfsProxy) throw new Error('User disabled access to IPFS')

    if (MFS_BLACKLIST.includes(permission)) {
      throw new Error('MFS functions are temporarily disabled')
    }

    // No need to verify access if permission is on the whitelist
    if (ACL_WHITELIST.includes(permission)) return args

    const scope = await getScope()
    let access = await accessControl.getAccess(scope, permission)

    if (!access) {
      const { allow, wildcard } = await requestAccess(scope, permission)
      access = await accessControl.setAccess(scope, wildcard ? '*' : permission, allow)
    }

    if (!access.allow) throw new Error(`User denied access to ${permission}`)

    return args
  }
}

module.exports = createPreAcl
