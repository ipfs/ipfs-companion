'use strict'
/* eslint-env browser, webextensions */

import debug from 'debug'
const log = debug('ipfs-companion:precache')
log.error = debug('ipfs-companion:precache:error')

/**
 * Adds important assets such as Web UI to the local js-ipfs-repo.
 * This ensures they load instantly, even in offline environments.
 */
export async function precache (ipfs, state) {
  const roots = []
  // find out the content path of webui, and add it to precache list
  try {
    let cid, name
    if (state.useLatestWebUI) { // resolve DNSLink
      cid = await ipfs.resolve('/ipns/webui.ipfs.io', { recursive: true })
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
