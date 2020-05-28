'use strict'
/* eslint-env browser, webextensions */
const pull = require('pull-stream/pull')
const drain = require('pull-stream/sinks/drain')
const toStream = require('it-to-stream')
const tar = require('tar-stream')
const CID = require('cids')

const debug = require('debug')
const log = debug('ipfs-companion:precache')
log.error = debug('ipfs-companion:precache:error')

// Web UI release that should be precached
// WARNING: do not remove this constant, as its used in package.json
const webuiCid = 'bafybeigkbbjnltbd4ewfj7elajsbnjwinyk6tiilczkqsibf3o7dcr6nn4' // v2.9.0
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
      await importTar(ipfs, tarPath, cid)
    } else {
      log(`${cid} already in local repo, skipping import`)
    }
  }
}

async function inRepo (ipfs, cid) {
  return new Promise((resolve, reject) => {
    let local = false
    pull(
      ipfs.refs.localPullStream(),
      drain(block => {
        if (block.ref === cid) {
          local = true
          return false // abort stream
        }
      }, () => resolve(local))
    )
  })
}

async function importTar (ipfs, tarPath, expectedCid) {
  const stream = toStream.readable(streamTar(tarPath))
  // TODO: HTTP 404 means precache is disabled in the current runtime
  // (eg. in Firefox, due to https://github.com/ipfs-shipyard/ipfs-webui/issues/959)
  const untarAndAdd = tar.extract()

  const files = []

  untarAndAdd.on('entry', (header, stream, next) => {
    // header is the tar header
    // stream is the content body (might be an empty stream)
    // call next when you are done with this entry

    if (header.type !== 'file') {
      // skip non-files
      stream.on('end', next)
      stream.resume() // drain stream
      return
    }

    files.push(new Promise((resolve, reject) => {
      let chunks = []
      stream.on('data', data => chunks.push(data))
      stream.on('end', () => {
        resolve({ path: header.name, content: Buffer.concat(chunks) })
        chunks = null
        next()
      })
    }))
  })

  untarAndAdd.on('finish', async () => {
    const { version } = new CID(expectedCid)
    const opts = { cidVersion: version, pin: false, preload: false }
    const results = await ipfs.add(await Promise.all(files), opts)
    const root = results.find(e => e.hash === expectedCid)
    if (root) {
      log(`${tarPath} successfully precached`, root)
    } else {
      log.error('imported CID does not match expected one (requires new release with updated package.json)')
    }
  })

  log(`importing ${tarPath} to js-ipfs-repo`)
  stream.pipe(untarAndAdd)
}

async function * streamTar (repoPath) {
  const response = await fetch(repoPath)
  const reader = response.body.getReader()
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
