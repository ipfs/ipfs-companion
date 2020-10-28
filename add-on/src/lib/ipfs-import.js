'use strict'
/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:import')
log.error = debug('ipfs-companion:import:error')

const browser = require('webextension-polyfill')

const { redirectOptOutHint } = require('./ipfs-request')

module.exports.createIpfsImportHandler = (getState, getIpfs, ipfsPathValidator, runtime, copier) => {
  const { resolveToPublicUrl } = ipfsPathValidator
  const ipfsImportHandler = {
    getIpfsPathAndNativeAddress (cid) {
      const state = getState()
      const path = `/ipfs/${cid}`
      if (runtime.hasNativeProtocolHandler) {
        return { path, url: `ipfs://${cid}` }
      } else {
        // open at public GW (will be redirected to local elsewhere, if enabled)
        const url = new URL(path, state.pubGwURLString).toString()
        return { path, url }
      }
    },

    async openFilesAtGateway (mfsPath) {
      const ipfs = getIpfs()
      const { cid } = await ipfs.files.stat(mfsPath)
      const { url } = ipfsImportHandler.getIpfsPathAndNativeAddress(cid)
      await browser.tabs.create({ url })
    },

    async openFilesAtWebUI (mfsPath) {
      const state = getState()
      await browser.tabs.create({
        url: `${state.webuiRootUrl}#/files${mfsPath}`
      })
    },

    async copyImportResultsToFiles (results, importDir) {
      const ipfs = getIpfs()
      // cp will fail if directory does not exist
      await ipfs.files.mkdir(importDir, { parents: true })
      // remove directory from files API import files
      const files = results.filter(file => (file.path !== ''))
      for (const file of files) {
        await ipfs.files.cp(`/ipfs/${file.cid}`, `${importDir}${file.path}`)
      }
      log(`created import dir at ${importDir}`)
    },

    async copyShareLink (files) {
      if (!files || !copier) return
      const root = files.find(file => file.path === '')
      if (!root) return
      let path
      if (files.length === 2) {
        // share path to a single file in a dir
        const file = files.find(file => file.path !== '')
        path = `/ipfs/${root.cid}/${file.path}`
      } else {
        // share wrapping dir
        path = `/ipfs/${root.cid}/`
      }
      const url = resolveToPublicUrl(path)
      await copier.copyTextToClipboard(url)
    },

    async preloadFilesAtPublicGateway (files) {
      const state = getState()
      if (!state.preloadAtPublicGateway) return
      for (const file of files) {
        if (file && file.cid) {
          const { path } = ipfsImportHandler.getIpfsPathAndNativeAddress(file.cid)
          const preloadUrl = resolveToPublicUrl(`${path}#${redirectOptOutHint}`)
          try {
            await fetch(preloadUrl, { method: 'HEAD' })
            log('successfully preloaded', file)
          } catch (err) {
            log.error('preload failed', err)
          }
        }
      }
    }
  }
  return ipfsImportHandler
}

module.exports.formatImportDirectory = (path) => {
  path = path.replace(/\/$|$/, '/')
  path = path.replace(/(\/)\/+/g, '$1')

  // needed to handle date symbols in the import directory
  const now = new Date()
  const dateSymbols = [/%Y/g, /%M/g, /%D/g, /%h/g, /%m/g, /%s/g]
  const symbolReplacements = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0'))
  dateSymbols.forEach((symbol, i) => { path = path.replace(symbol, symbolReplacements[i]) })
  return path
}
