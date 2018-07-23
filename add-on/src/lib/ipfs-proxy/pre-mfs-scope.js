// Use path-browserify for consistent behavior between browser and tests on Windows
const Path = require('path-browserify')
const IsIpfs = require('is-ipfs')
const DEFAULT_ROOT_PATH = '/dapps'

// Creates a "pre" function that is called prior to calling a real function
// on the IPFS instance. It modifies the arguments to MFS functions to scope
// file access to a directory designated to the web page
function createPreMfsScope (fnName, getScope, getIpfs, rootPath = DEFAULT_ROOT_PATH) {
  return MfsPre[fnName] ? MfsPre[fnName](getScope, getIpfs, rootPath) : null
}

module.exports = createPreMfsScope

const MfsPre = {
  'files.cp': createSrcDestPre,
  'files.mkdir': createSrcPre,
  'files.stat': createSrcPre,
  'files.rm' (getScope, getIpfs, rootPath) {
    const srcPre = createSrcPre(getScope, getIpfs, rootPath)
    // Do not allow rm app root
    // Need to explicitly deny because it's ok to rm -rf /a/path that's not /
    return (...args) => {
      if (isRoot(args[0])) throw new Error('cannot delete root')
      return srcPre(...args)
    }
  },
  'files.read': createSrcPre,
  'files.write' (getScope, getIpfs, rootPath) {
    const srcPre = createSrcPre(getScope, getIpfs, rootPath)
    // Do not allow write to app root
    // Need to explicitly deny because app path might not exist yet
    return (...args) => {
      if (isRoot(args[0])) throw new Error('/ was not a file')
      return srcPre(...args)
    }
  },
  'files.mv': createSrcDestPre,
  'files.flush': createOptionalSrcPre,
  'files.ls': createOptionalSrcPre
}

// Scope a src/dest tuple to the app path
function createSrcDestPre (getScope, getIpfs, rootPath) {
  return async (...args) => {
    // console.log('createSrcDestPre.args.before: ' + JSON.stringify(args))
    const appPath = await getAppPath(getScope, getIpfs, rootPath)
    // console.log('createSrcDestPre.appPath:     ', appPath)
    args = prefixSrcDestArgs(appPath, args)
    // console.log('createSrcDestPre.args.after:  ' + JSON.stringify(args))
    return args
  }
}

// Prefix src and dest args where applicable
function prefixSrcDestArgs (prefix, args) {
  const prefixedArgs = []
  const destPosition = destinationPosition(args)
  for (let i = 0; i < args.length; i++) {
    const item = args[i]
    if (typeof item === 'string') {
      const isDestination = (i === destPosition)
      prefixedArgs[i] = safePathPrefix(prefix, item, isDestination)
    } else if (Array.isArray(item)) {
      // The syntax recently changed to remove passing an array,
      // but we allow for both versions until js-ipfs-api is updated to remove
      // support for it
      console.warn('[ipfs-companion] use of array in ipfs.files.cp|mv is deprecated, see https://github.com/ipfs/interface-ipfs-core/blob/master/SPEC/FILES.md#filescp')
      prefixedArgs[i] = prefixSrcDestArgs(prefix, item)
    } else {
      // {options} or callback, passing as-is
      prefixedArgs[i] = item
    }
  }
  return prefixedArgs
}

// Find the last string argument and save as the position of destination path
function destinationPosition (args) {
  let destPosition
  for (let i = 0; i < args.length; i++) {
    if (typeof args[i] === 'string') {
      destPosition = i
    }
  }
  return destPosition
}

// Add a prefix to a path in a safe way
function safePathPrefix (prefix, path, isDestination) {
  const realPath = safePath(path)
  if (!isDestination && IsIpfs.ipfsPath(realPath)) {
    // we don't prefix valid /ipfs/ paths in source paths
    // (those are public and immutable, so safe as-is)
    return realPath
  }
  return Path.join(prefix, realPath)
}

// Scope a src path to the app path
function createSrcPre (getScope, getIpfs, rootPath) {
  return async (...args) => {
    const appPath = await getAppPath(getScope, getIpfs, rootPath)
    args[0] = Path.join(appPath, safePath(args[0]))
    return args
  }
}

// Scope an optional src path to the app path
function createOptionalSrcPre (getScope, getIpfs, rootPath) {
  return async (...args) => {
    const appPath = await getAppPath(getScope, getIpfs, rootPath)

    if (Object.prototype.toString.call(args[0]) === '[object String]') {
      args[0] = Path.join(appPath, safePath(args[0]))
    } else {
      switch (args.length) {
        case 0: return [appPath] // e.g. ipfs.files.ls()
        case 1: return [appPath, args[0]] // e.g. ipfs.files.ls(options)
        case 2: return [appPath, args[1]] // e.g. ipfs.files.ls(null, options)
        default: throw new Error('Unexpected number of arguments')
      }
    }
    return args
  }
}

// Get the app path (create if not exists) for a scope, prefixed with rootPath
const getAppPath = async (getScope, getIpfs, rootPath) => {
  const appPath = rootPath + scopeToPath(await getScope())
  await getIpfs().files.mkdir(appPath, { parents: true })
  return appPath
}

// Turn http://ipfs.io/ipfs/QmUmaEnH1uMmvckMZbh3yShaasvELPW4ZLPWnB4entMTEn
// into /http/ipfs.io/ipfs/QmUmaEnH1uMmvckMZbh3yShaasvELPW4ZLPWnB4entMTEn
const scopeToPath = (scope) => {
  return ('/' + scope)
    .replace(/\/\//g, '/')
    .split('/')
    // Special case for protocol in scope, remove : from the end
    .map((seg, i) => i === 1 && seg.endsWith(':') ? seg.slice(0, -1) : seg)
    .map(encodeURIComponent)
    .join('/')
}

// Make a path "safe" by resolving any directory traversal segments relative to
// '/'. Allows us to then prefix the app path without worrying about the user
// breaking out of their jail.
const safePath = (path) => Path.resolve('/', path)

const isRoot = (path) => Path.resolve('/', path) === '/'
