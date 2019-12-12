'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')

const { redirectOptOutHint } = require('./ipfs-request')

function createIpfsImportHandler (getState, getIpfs, ipfsPathValidator, runtime, copier) {
  const ipfsImportHandler = {
    formatImportDirectory (path) {
      path = path.replace(/\/$|$/, '/')
      path = path.replace(/(\/)\/+/g, '$1')

      // needed to handle date symbols in the import directory
      const now = new Date()
      const dateSymbols = [/%Y/g, /%M/g, /%D/g, /%h/g, /%m/g, /%s/g]
      const symbolReplacements = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0'))
      dateSymbols.forEach((symbol, i) => { path = path.replace(symbol, symbolReplacements[i]) })
      return path
    },
    // TODO: feature detect and push to client type specific modules.
    getIpfsPathAndNativeAddress (hash) {
      const state = getState()
      const path = `/ipfs/${hash}`
      if (runtime.hasNativeProtocolHandler) {
        return { path, url: `ipfs://${hash}` }
      } else {
        // open at public GW (will be redirected to local elsewhere, if enabled)
        const url = new URL(path, state.pubGwURLString).toString()
        return { path, url: url }
      }
    },
    async openFilesAtGateway ({ result, openRootInNewTab = false }) {
      for (const file of result) {
        if (file && file.hash) {
          const { url } = this.getIpfsPathAndNativeAddress(file.hash)
          if (openRootInNewTab && (result.length === 1 || file.path === '' || file.path === file.hash)) {
            await browser.tabs.create({
              url: url
            })
          }
        }
      }
      return result
    },
    async openFilesAtWebUI (dir) {
      const state = getState()
      await browser.tabs.create({
        url: `${state.webuiRootUrl}#/files${dir}`
      })
    },
    async importFiles (data, options, importDir) {
      const ipfs = getIpfs()
      // files are first `add`ed to IPFS
      // and then copied to an MFS directory
      // to ensure that CIDs for any created file
      // remain the same for ipfs-companion and Web UI
      const result = await ipfs.add(data, options)
      // cp will fail if directory does not exist
      await ipfs.files.mkdir(`${importDir}`, { parents: true })
      // remove directory from files API import files
      let files = result.filter(file => (file.path !== ''))
      files = files.map(file => (ipfs.files.cp(`/ipfs/${file.hash}`, `${importDir}${file.path}`)))
      await Promise.all(files)

      return result
    },
    preloadAtPublicGateway (path) {
      const state = getState()
      if (!state.preloadAtPublicGateway) return
      // asynchronous HTTP HEAD request preloads triggers content without downloading it
      return new Promise((resolve, reject) => {
        const http = new XMLHttpRequest()
        // Make sure preload request is excluded from global redirect
        const preloadUrl = ipfsPathValidator.resolveToPublicUrl(`${path}#${redirectOptOutHint}`, state.pubGwURLString)
        http.open('HEAD', preloadUrl)
        http.onreadystatechange = function () {
          if (this.readyState === this.DONE) {
            console.info(`[ipfs-companion] preloadAtPublicGateway(${path}):`, this.statusText)
            if (this.status === 200) {
              resolve(this.statusText)
            } else {
              reject(new Error(this.statusText))
            }
          }
        }
        http.send()
      })
    },
    async copyShareLink (files) {
      if (!files || !copier) return
      const root = files.find(file => file.path === '')
      if (!root) return
      let path
      if (files.length === 2) {
        // share path to a single file in a dir
        const file = files.find(file => file.path !== '')
        path = `/ipfs/${root.hash}/${file.path}`
      } else {
        // share wrapping dir
        path = `/ipfs/${root.hash}/`
      }
      const state = getState()
      const url = ipfsPathValidator.resolveToPublicUrl(path, state.pubGwURLString)
      await copier.copyTextToClipboard(url)
    },
    async preloadFilesAtPublicGateway (files) {
      files.forEach(file => {
        if (file && file.hash) {
          const { path } = this.getIpfsPathAndNativeAddress(file.hash)
          this.preloadAtPublicGateway(path)
          console.info('[ipfs-companion] successfully stored', file)
        }
      })
    }
  }
  return ipfsImportHandler
}

module.exports = createIpfsImportHandler
