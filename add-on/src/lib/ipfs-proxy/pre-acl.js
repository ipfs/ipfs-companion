// This are the functions that DO NOT require an allow/deny decision by the user.
// All other IPFS functions require authorization.
const ACL_WHITELIST = Object.freeze(require('./acl-whitelist.json'))

// Creates a "pre" function that is called prior to calling a real function
// on the IPFS instance. It will throw if access is denied, and ask the user if
// no access decision has been made yet.
function createPreAcl (permission, getState, getScope, accessControl, requestAccess) {
  return async (...args) => {
    // Check if all access to the IPFS node is disabled
    if (!getState().ipfsProxy) throw new Error('User disabled access to IPFS')

    // No need to verify access if permission is on the whitelist
    if (ACL_WHITELIST.includes(permission)) return args

    const scope = await getScope()
    let access = await accessControl.getAccess(scope, permission)

    if (!access) {
      const { allow, wildcard } = await requestAccess(scope, permission)
      access = await accessControl.setAccess(scope, wildcard ? '*' : permission, allow)
    }

    if (!access.allow) {
      const err = new Error(`User denied access to ${permission}`)
      err.output = { payload: { isIpfsProxyAclError: true, permission, scope } }
      throw err
    }

    return args
  }
}

module.exports = createPreAcl
