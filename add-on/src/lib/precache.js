'use strict'
/* eslint-env browser, webextensions */
// const CID = require('cids')

// const Tar = require('it-tar')
// const pipe = require('it-pipe')
// const all = require('it-all')
// const concat = require('it-concat')

const debug = require('debug')
const log = debug('ipfs-companion:precache')
log.error = debug('ipfs-companion:precache:error')

/**
 * Adds important assets such as Web UI to the local js-ipfs-repo.
 * This ensures they load instantly, even in offline environments.
 */
module.exports.precache = async (ipfs, state) => {
  const roots = []
  // find out the content path of webui, and add it to precache list
  try {
    let cid, name
    if (state.useLatestWebUI) { // resolve DNSLink
      cid = await ipfs.dns('webui.ipfs.io', { recursive: true })
      name = 'latest webui from DNSLink at webui.ipfs.io'
    } else { // find out safelisted path behind <api-port>/webui
      cid = new URL((await fetch(`${state.apiURLString}webui`)).url).pathname
      name = `stable webui hardcoded at ${state.apiURLString}webui`
    }
    roots.push({
      nodeType: 'external',
      name,
      cid
    })
  } catch (e) {
    log.error('unable to find webui content path for precache', e)
  }

  // precache each root
  for (const { name, cid, nodeType } of roots) {
    if (state.ipfsNodeType !== nodeType) continue
    if (await inRepo(ipfs, cid)) {
      log(`${name} (${cid}) already in local repo, skipping import`)
      continue
    }
    log(`importing ${name} (${cid}) to local ipfs repo`)

    // prefetch over IPFS
    try {
      for await (const ref of ipfs.refs(cid, { recursive: true })) {
        if (ref.err) {
          log.error(`error while preloading ${name} (${cid})`, ref.err)
          continue
        }
      }
      log(`${name} successfully cached under CID ${cid}`)
    } catch (err) {
      log.error(`error while processing ${name}`, err)
    }
  }
}

async function inRepo (ipfs, cid) {
  // dag.get in offline mode will throw block is not present in local repo
  // (we also have timeout as a failsafe)
  try {
    await ipfs.dag.get(cid, { offline: true, timeout: 5000 })
    return true
  } catch (_) {
    return false
  }
}

// Downloads CID from a public gateway
// (alternative to ipfs.refs -r)
/*
async function preloadOverHTTP (log, ipfs, state, cid) {
  const url = `${state.pubGwURLString}api/v0/get?arg=${cid}&archive=true`
  try {
    log(`importing ${url} (${cid}) to local ipfs repo`)
    const { body } = await fetch(url)
    await importTar(ipfs, body.getReader(), cid)
    log(`successfully fetched TAR from ${url} and cached under CID ${cid}`)
  } catch (err) {
    log.error(`error while processing ${url}`, err)
  }
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
    throw new Error(`imported CID (${root}) does not match expected one: ${expectedCid}`)
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
*/
