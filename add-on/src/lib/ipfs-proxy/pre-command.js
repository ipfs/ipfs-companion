// Some API commands are too sensitive to be exposed to dapps on every website
// We follow a safe security practice of denying everything and allowing access
// to a pre-approved list of known APIs. This way if a new API is added
// it will be blocked by default, until it is explicitly enabled below.
const COMMAND_WHITELIST = Object.freeze(require('./command-whitelist.json'))

// Creates a "pre" function that is called prior to calling a real function
// on the IPFS instance. It will throw if access is denied
// due to API not being whitelisted of arguments not being supported
function createPreCommand (permission) {
  return async (...args) => {
    if (!inCommandWhitelist(permission)) {
      throw createCommandWhitelistError(permission)
    }
    if (['add', 'files.add'].includes(permission)) {
      // Fail fast: nocopy does not work over proxy
      if (args.some(arg => typeof arg === 'object' && arg.nocopy)) {
        throw new Error(`ipfs.${permission} with 'nocopy' flag is not supported by IPFS Proxy`)
      }
    }
    return args
  }
}

function inCommandWhitelist (permission) {
  // Fail fast if API or namespace is not explicitly whitelisted
  const permRoot = permission.split('.')[0]
  return COMMAND_WHITELIST.includes(permRoot) || COMMAND_WHITELIST.includes(permission)
}

// Standardized error thrown when a command is not on the COMMAND_WHITELIST
// TODO: return errors following conventions from https://github.com/ipfs/js-ipfs/pull/1746
function createCommandWhitelistError (permission) {
  const permissions = Array.isArray(permission) ? permission : [permission]
  console.warn(`[ipfs-companion] Access to '${permission}' commands over window.ipfs is blocked. If you feel it should be allowed, open an issue at https://github.com/ipfs-shipyard/ipfs-companion/issues/new`)
  const err = new Error(`Access to '${permission}' commands over IPFS Proxy is globally blocked`)
  err.output = {
    payload: {
      // Error follows convention from https://github.com/ipfs/js-ipfs/pull/1746/files
      code: 'ERR_IPFS_PROXY_ACCESS_DENIED',
      permissions,
      // TODO: remove below after deprecation period ends with Q1
      get isIpfsProxyWhitelistError () {
        console.warn("[ipfs-companion] reading .isIpfsProxyWhitelistError from Ipfs Proxy errors is deprecated, use '.code' instead")
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
  createPreCommand,
  createCommandWhitelistError,
  inCommandWhitelist,
  COMMAND_WHITELIST
}
