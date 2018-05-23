// Some APIs are too sensitive to be exposed to dapps on every website
// We follow a safe security practice of denying everything and allowing access
// to a pre-approved list of known APIs. This way if a new API is added
// it will be blocked by default, until it is explicitly enabled below.
const API_WHITELIST = Object.freeze(require('./api-whitelist.json'))

// Creates a "pre" function that is called prior to calling a real function
// on the IPFS instance. It will throw if access is denied due to API not being whitelisted
function createPreApiWhitelist (permission) {
  return async (...args) => {
    // Fail fast if API or namespace is not explicitly whitelisted
    const permRoot = permission.split('.')[0]
    if (!(API_WHITELIST.includes(permRoot) || API_WHITELIST.includes(permission))) {
      console.log(`[ipfs-companion] Access to ${permission} API over window.ipfs is blocked. If you feel it should be allowed, open an issue at https://github.com/ipfs-shipyard/ipfs-companion/issues/new`)
      const err = new Error(`Access to ${permission} API is globally blocked for window.ipfs`)
      err.output = { payload: { isIpfsProxyWhitelistError: true, permission } }
      throw err
    }

    return args
  }
}

module.exports = createPreApiWhitelist
