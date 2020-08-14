'use strict'
/* eslint-env browser, webextensions */
const CID = require('cids')

const Tar = require('it-tar')
const pipe = require('it-pipe')
const all = require('it-all')
const concat = require('it-concat')

const debug = require('debug')
const log = debug('ipfs-companion:precache')
log.error = debug('ipfs-companion:precache:error')

// Web UI release that should be precached
// WARNING: do not remove this constant, as its used in package.json
const webuiCid = 'Qmexhq2sBHnXQbvyP2GfUdbnY7HCagH2Mw5vUNSBn2nxip' // v2.7.2
module.exports.precachedWebuiCid = webuiCid

const PRECACHE_ARCHIVES = [
  { tarPath: '/dist/precache/webui.tar', cid: webuiCid }
]

/**
 * Adds important assets such as Web UI to the local js-ipfs-repo.
 * This ensures they load instantly, even in offline environments.
 */
module.exports.precache = async (ipfs) => {
  for (const { cid, tarPath } of PRECACHE_ARCHIVES) {
    if (!await inRepo(ipfs, cid)) {
      try {
        const { body } = await fetch(tarPath)
        log(`importing ${tarPath} to js-ipfs-repo`)
        await importTar(ipfs, body.getReader(), cid)
        log(`${tarPath} successfully cached under CID ${cid}`)
      } catch (err) {
        if (err.message === 'Error in body stream') {
          // This error means .tar is missing from the extension bundle:
          // It is the case in Firefox, due to https://github.com/ipfs-shipyard/ipfs-webui/issues/959
          log(`unable to find/read ${tarPath}, skipping`)
          continue
        }
        log.error(`error while processing ${tarPath}`, err)
      }
    } else {
      log(`${cid} already in local repo, skipping import`)
    }
  }
}

async function inRepo (ipfs, cid) {
  for await (const ref of ipfs.refs.local()) {
    if (ref.err) return false
    if (ref.ref === cid) return true
  }
  return false
}

async function importTar (ipfs, tarReader, expectedCid) {
  const files = []

  await pipe(
    streamTar(tarReader),
    Tar.extract(),
    async (source) => {
      for await (const entry of source) {
        // we care only about files, directories will be created implicitly
        if (entry.header.type !== 'file') continue
        files.push({
          path: entry.header.name.replace(`${expectedCid}/`, ''),
          content: (await concat(entry.body)).slice() // conversion: BufferList → Buffer
        })
      }
    }
  )

  const { version, multibaseName } = new CID(expectedCid)
  const opts = {
    cidVersion: version,
    wrapWithDirectory: true,
    pin: false,
    preload: false
  }
  const results = await all(ipfs.addAll(files, opts))

  const root = results.find(e => e.cid.toString(multibaseName) === expectedCid)
  if (!root) {
    throw new Error('imported CID does not match expected one')
  }
}

async function * streamTar (reader) {
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  } finally {
    // Firefox only? https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/releaseLock
    if (typeof reader.releaseLock === 'function') reader.releaseLock()
  }
}
