// This are the function that DO NOT require an allow/deny decision by the user.
// All other IPFS functions require authorization.
const ACL_WHITELIST = Object.freeze(require('./acl-whitelist.json'))

// Creates a "pre" function that is called prior to calling a real function
// on the IPFS instance. It will throw if access is denied, and ask the user if
// no access decision has been made yet.
function createPreAcl (getState, accessControl, origin, permission) {
  return async (...args) => {
    // Check if all access to the IPFS node is disabled
    if (!getState().ipfsProxy) throw new Error('User disabled access to IPFS')

    // No need to verify access if permission is on the whitelist
    if (ACL_WHITELIST.includes(permission)) return args

    let access = await accessControl.getAccess(origin, permission)

    if (!access) {
      const { allow, blanket, remember } = await requestAccess(origin, permission)
      access = await accessControl.setAccess(origin, blanket ? '*' : permission, allow, remember)
    }

    if (!access.allow) throw new Error(`User denied access to ${permission}`)

    return args
  }
}

module.exports = createPreAcl

async function requestAccess (origin, permission) {
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
