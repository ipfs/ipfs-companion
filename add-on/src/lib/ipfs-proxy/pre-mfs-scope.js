const Path = require('path')
const DEFAULT_ROOT_PATH = '/dapps'

// Creates a "pre" function that is called prior to calling a real function
// on the IPFS instance. It modifies the arguments to MFS functions to scope
// file access to a directory designated to the web page
function createPreMfsScope (fnName, getScope, rootPath = DEFAULT_ROOT_PATH) {
  return MfsPre[fnName] ? MfsPre[fnName](getScope, rootPath) : null
}

module.exports = createPreMfsScope

const MfsPre = {
  'files.cp': createSrcDestPre,
  'files.mkdir': createSrcPre,
  'files.stat': createSrcPre,
  'files.rm' (getScope, rootPath) {
    const srcPre = createSrcPre(getScope, rootPath)
    return (...args) => { // Do not allow rm app root
      if (isRoot(args[0])) throw new Error('cannot delete root')
      return srcPre(...args)
    }
  },
  'files.read': createSrcPre,
  'files.write' (getScope, rootPath) {
    const srcPre = createSrcPre(getScope, rootPath)
    return (...args) => { // Do not allow write to app root
      if (isRoot(args[0])) throw new Error('/ was not a file')
      return srcPre(...args)
    }
  },
  'files.mv': createSrcDestPre,
  'files.flush': createOptionalSrcPre,
  'files.ls': createOptionalSrcPre
}

// Scope a src/dest tuple to the app path
function createSrcDestPre (getScope, rootPath) {
  return async (...args) => {
    const appPath = getAppPath(await getScope(), rootPath)
    args[0][0] = Path.join(appPath, safePath(args[0][0]))
    args[0][1] = Path.join(appPath, safePath(args[0][1]))
    return args
  }
}

// Scope a src path to the app path
function createSrcPre (getScope, rootPath) {
  return async (...args) => {
    const appPath = getAppPath(await getScope(), rootPath)
    args[0] = Path.join(appPath, safePath(args[0]))
    return args
  }
}

// Scope an optional src path to the app path
function createOptionalSrcPre (getScope, rootPath) {
  return async (...args) => {
    const appPath = getAppPath(await getScope(), rootPath)

    if (Object.prototype.toString.call(args[0]) === '[object String]') {
      args[0] = Path.join(appPath, safePath(args[0]))
    } else {
      switch (args.length) {
        case 0: return [appPath]          // e.g. ipfs.files.ls()
        case 1: return [appPath, args[0]] // e.g. ipfs.files.ls(options)
        case 2: return [appPath, args[1]] // e.g. ipfs.files.ls(null, options)
      }
    }
    return args
  }
}

// Get the app path for a scope, prefixed with rootPath
const getAppPath = (scope, rootPath) => rootPath + scopeToPath(scope)

// Turn http://ipfs.io/ipfs/QmUmaEnH1uMmvckMZbh3yShaasvELPW4ZLPWnB4entMTEn
// into /http:/ipfs.io/ipfs/QmUmaEnH1uMmvckMZbh3yShaasvELPW4ZLPWnB4entMTEn
const scopeToPath = (scope) => ('/' + scope).replace(/\/\//g, '/')

// Make a path "safe" by resolving any directory traversal segments relative to
// '/'. Allows us to then prefix the app path without worrying about the user
// breaking out of their jail.
const safePath = (path) => Path.resolve('/', path)

const isRoot = (path) => Path.resolve('/', path) === '/'
