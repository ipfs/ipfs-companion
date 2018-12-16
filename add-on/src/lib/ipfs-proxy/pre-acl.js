// This are the functions that DO NOT require an allow/deny decision by the user.
// All other IPFS functions require authorization.
const ACL_WHITELIST = Object.freeze(require('./acl-whitelist.json'))

// Creates a "pre" function that is called prior to calling a real function
// on the IPFS instance. It will throw if access is denied, and ask the user if
// no access decision has been made yet.
function createPreAcl (permission, getState, getScope, accessControl, requestAccess) {
  return async (...args) => {
    // Check if all access to the IPFS node is disabled
    if (!getState().ipfsProxy) throw new Error('User disabled access to API proxy in IPFS Companion')

    // No need to verify access if permission is on the whitelist
    if (inNoAclPromptWhitelist(permission)) return args

    const scope = await getScope()
    const access = await getAccessWithPrompt(accessControl, requestAccess, scope, permission)

    if (!access.allow) {
      throw createProxyAclError(scope, permission)
    }

    return args
  }
}

function inNoAclPromptWhitelist (permission) {
  return ACL_WHITELIST.includes(permission)
}

async function getAccessWithPrompt (accessControl, requestAccess, scope, permission) {
  let access = await accessControl.getAccess(scope, permission)
  if (!access) {
    const { allow, wildcard } = await requestAccess(scope, permission)
    access = await accessControl.setAccess(scope, wildcard ? '*' : permission, allow)
  }
  return access
}

// Standardized error thrown when a command is not on the ACL_WHITELIST
// TODO: return errors following conventions from https://github.com/ipfs/js-ipfs/pull/1746
function createProxyAclError (scope, permission) {
  const err = new Error(`User denied access to selected commands over IPFS proxy: ${permission}`)
  const permissions = Array.isArray(permission) ? permission : [permission]
  err.output = {
    payload: {
      // Error follows convention from https://github.com/ipfs/js-ipfs/pull/1746/files
      code: 'ERR_IPFS_PROXY_ACCESS_DENIED',
      permissions,
      scope,
      // TODO: remove below after deprecation period ends with Q1
      get isIpfsProxyAclError () {
        console.warn("[ipfs-companion] reading .isIpfsProxyAclError from Ipfs Proxy errors is deprecated, use '.code' instead")
        return true
      },
      get permission () {
        if (!this.permissions || !this.permissions.length) return undefined
        console.warn("[ipfs-companion] reading .permission from Ipfs Proxy errors is deprecated, use '.permissions' instead")
        return this.permissions[0]
      }
    }
  }
  return err
}

module.exports = {
  createPreAcl,
  createProxyAclError,
  inNoAclPromptWhitelist,
  ACL_WHITELIST
}
