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
  'files.cp': srcDestPre,
  'files.mkdir': srcPre,
  'files.stat': srcPre,
  'files.rm': srcPre,
  'files.read': srcPre,
  'files.write': srcPre,
  'files.mv': srcDestPre,
  'files.flush': optionalSrcPre,
  'files.ls': optionalSrcPre
}

// Scope a src/dest tuple to the app path
function srcDestPre (getScope, rootPath) {
  return async (...args) => {
    const appPath = await getAppPath(getScope, rootPath)
    args[0][0] = appPath + safePath(args[0][0])
    args[0][1] = appPath + safePath(args[0][1])
    return args
  }
}

// Scope a src path to the app path
function srcPre (getScope, rootPath) {
  return async (...args) => {
    const appPath = await getAppPath(getScope, rootPath)
    args[0] = appPath + safePath(args[0])
    return args
  }
}

// Scope an optional src path to the app path
function optionalSrcPre (getScope, rootPath) {
  return async (...args) => {
    const appPath = await getAppPath(getScope, rootPath)
    if (Object.prototype.toString.call(args[0]) === '[object String]') {
      args[0] = appPath + safePath(args[0])
    }
    return args
  }
}

// Get the app path for a scope, prefixed with rootPath
const getAppPath = async (getScope, rootPath) => rootPath + scopeToPath(await getScope())

// Turn http://ipfs.io/ipfs/QmUmaEnH1uMmvckMZbh3yShaasvELPW4ZLPWnB4entMTEn
// into /http/ipfs.io/ipfs/QmUmaEnH1uMmvckMZbh3yShaasvELPW4ZLPWnB4entMTEn
const scopeToPath = (scope) => ('/' + scope).replace(/\/\//g, '/')

// Make a path "safe" by resolving any directory traversal segments relative to
// '/'. Allows us to then prefix the app path without worrying about the user
// breaking out of their jail.
const safePath = (path) => Path.resolve('/', path)
