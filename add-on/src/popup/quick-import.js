'use strict'

import './quick-import.css'

import choo from 'choo'
import html from 'choo/html/index.js'
import { filesize } from 'filesize'
import all from 'it-all'
import browser from 'webextension-polyfill'
import * as externalApiClient from '../lib/ipfs-client/external.js'
import createIpfsCompanion from '../lib/ipfs-companion.js'
import { formatImportDirectory } from '../lib/ipfs-import.js'
import { dataTransferSource, fileListSource } from '../lib/quick-import-sources.js'
import logo from './logo.js'
import { POSSIBLE_NODE_TYPES } from '../lib/state.js'

document.title = browser.i18n.getMessage('quickImport_page_title')

const app = choo()

app.use(quickImportStore)
app.route('*', quickImportPage)
app.mount('#root')

function quickImportStore (state, emitter) {
  state.message = ''
  state.peerCount = ''
  state.ipfsNodeType = 'external'
  state.expandOptions = false
  state.openViaWebUI = true
  state.userChangedOpenViaWebUI = false
  state.importDir = ''
  state.userChangedImportDir = false

  function updateState ({ ipfsNodeType, peerCount, importDir, openViaWebUI }) {
    state.ipfsNodeType = ipfsNodeType
    state.peerCount = peerCount
    // This event will fire repeatedly,
    // we need to ensure we don't unset the user's preferences
    // when they change the options on this page
    if (!state.userChangedImportDir) {
      state.importDir = importDir
    }
    if (!state.userChangedOpenViaWebUI) {
      state.openViaWebUI = openViaWebUI
    }
  }

  let port

  emitter.on('DOMContentLoaded', async () => {
    // initialize connection to the background script which will trigger UI updates
    port = browser.runtime.connect({ name: 'browser-action-port' })
    port.onMessage.addListener(async (message) => {
      if (message.statusUpdate) {
        console.log('In browser action, received message from background:', message)
        updateState(message.statusUpdate)
        emitter.emit('render')
      }
    })
  })

  emitter.on('fileInputChange', event => processFiles(state, emitter, fileListSource(event.target.files)))
  emitter.on('folderInputChange', event => processFiles(state, emitter, fileListSource(event.target.files)))

  // update companion preference
  emitter.on('optionChange', ({ key, value }) => {
    browser.storage.local.set({ [key]: value })
  })

  // drag & drop anywhere; handle the event ourselves so dropped folders are
  // walked via FileSystemEntry instead of being flattened to loose files
  const stop = (event) => { event.stopPropagation(); event.preventDefault() }
  document.body.addEventListener('dragenter', stop)
  document.body.addEventListener('dragover', stop)
  document.body.addEventListener('drop', (event) => {
    stop(event)
    processFiles(state, emitter, dataTransferSource(event.dataTransfer))
  })
}

// Drain an async source of { path, file } entries into an array. Directory
// walking only reads listings here, not file contents, so this stays cheap
// even for large folders.
async function collectEntries (source) {
  const entries = []
  for await (const entry of source) {
    entries.push(entry)
  }
  return entries
}

async function processFiles (state, emitter, source) {
  const ipfsCompanion = await createIpfsCompanion(true)
  try {
    const entries = await collectEntries(source)
    if (!entries.length) {
      // Source may be empty in some rare cases
      // eg. when user drags something from proprietary browser context
      // We just ignore those UI interactions.
      throw new Error('found no valid sources, try selecting a local file instead')
    }
    console.log('importing files', entries)
    const {
      copyImportResultsToFiles,
      copyShareLink,
      preloadFilesAtPublicGateway,
      openFilesAtGateway,
      openFilesAtWebUI
    } = ipfsCompanion.ipfsImportHandler
    const importTab = await browser.tabs.getCurrent()
    const importDir = formatImportDirectory(state.importDir)
    const httpStreaming = ipfsCompanion.state.ipfsNodeType === 'external'

    const data = []
    let total = 0
    for (const { path, file } of entries) {
      data.push({
        path,
        content: (httpStreaming ? file : file.stream())
      })
      total += file.size
    }
    const humanTotal = filesize(total, { round: 2 })
    state.progress = `Importing ${humanTotal}... (keep this page open)`
    emitter.emit('render')

    const progress = (bytes) => {
      const percent = ((bytes / total) * 100).toFixed(0)
      state.progress = `Importing... (${percent}% of ${humanTotal})`
      emitter.emit('render')
    }
    const options = {
      progress,
      wrapWithDirectory: true,
      pin: false // we use MFS for implicit pinning instead
    }

    let ipfs
    if (httpStreaming) {
      // We create separate instance of http client running in the same page to
      // avoid serialization issues in Chromium
      // (https://bugs.chromium.org/p/chromium/issues/detail?id=112163) when
      // crossing process boundary, which enables streaming upload of big files
      // (4GB+) without buffering entire thing.
      ipfs = await externalApiClient.init(browser, ipfsCompanion.state)
      // Note: at the time of writing this it was possible to use SharedWorker,
      // but it felt brittle given Google's approach to browser extension APIs,
      // and this way seems to be more future-proof.
    } else {
      ipfs = ipfsCompanion.ipfs
    }
    // ipfs.add
    const results = await all(ipfs.addAll(data, options))

    // ipfs cp → MFS
    await copyImportResultsToFiles(results, importDir)
    state.progress = 'Completed'
    emitter.emit('render')
    console.log(`Successfully imported ${entries.length} files`)

    // copy shareable URL & preload
    copyShareLink(results)
    preloadFilesAtPublicGateway(results)

    // update preferred import dir if user specified one while importing
    if (state.userChangedImportDir) {
      emitter.emit('optionChange', { key: 'importDir', value: state.importDir })
    }
    // present result to the user using the best available way
    if (!state.openViaWebUI) {
      await openFilesAtGateway(importDir)
    } else {
      await openFilesAtWebUI(importDir)
    }

    // close import tab as it will be replaced with a new tab with imported content
    await browser.tabs.remove(importTab.id)
  } catch (err) {
    console.error('Failed to import files to IPFS', err)
    // keep import tab and display error message in it
    state.message = 'Unable to import to IPFS:'
    state.progress = `${err}`
    emitter.emit('render')
    ipfsCompanion.notify('notify_importErrorTitle', 'notify_inlineErrorMsg', `${err.message}`)
  }
}

function quickImportOptions (state, emit) {
  const onExpandOptions = (e) => { state.expandOptions = true; emit('render') }
  const onDirectoryChange = (e) => { state.userChangedImportDir = true; state.importDir = e.target.value }
  const onOpenViaWebUIChange = (e) => { state.userChangedOpenViaWebUI = true; state.openViaWebUI = e.target.checked }
  const displayOpenWebUI = POSSIBLE_NODE_TYPES.includes(state.ipfsNodeType)

  if (state.expandOptions) {
    return html`
      <div id='quickImportOptions' class='sans-serif mt3 f6 lh-copy light-gray no-user-select'>
        ${displayOpenWebUI
        ? html`<label for='openViaWebUI' class='flex items-center db relative mt1 pointer'>
          <input id='openViaWebUI' type='checkbox' onchange=${onOpenViaWebUIChange} checked=${state.openViaWebUI} />
          <span class='mark db flex items-center relative mr2 br2'></span>
          ${browser.i18n.getMessage('quickImport_options_openViaWebUI')}
        </label>`
        : null}
        <label for='importDir' class='flex items-center db relative mt1 pointer'>
          ${browser.i18n.getMessage('quickImport_options_importDir')}
          <span class='mark db flex items-center relative mr2 br2'></span>
          <input id='importDir' class='w-40 bg-transparent aqua monospace br1 ba b--aqua pa2' type='text' oninput=${onDirectoryChange} value=${state.importDir} />
        </label>
      </div>
    `
  }
  return html`
    <button class='mt3 f6 lh-copy link bn bg-transparent moon-gray dib pa0 pointer' style='color: #6ACAD1' onclick=${onExpandOptions}>
      ${browser.i18n.getMessage('quickImport_options_show')} »
    </button>
  `
}

function quickImportPage (state, emit) {
  const onFileInputChange = (e) => emit('fileInputChange', e)
  const onFolderInputChange = (e) => emit('folderInputChange', e)
  const { peerCount } = state

  return html`
    <div class="montserrat pt5" style="background: linear-gradient(to top, #041727 0%,#043b55 100%); height:100%;">
      <div class="mw8 center pa3 white">
        <header class="flex items-center no-user-select">
  ${logo({
    size: 80,
    path: '../../icons',
    heartbeat: false
  })}
          <div class="pl3">
            <h1 class="f2 fw5 ma0">
              ${browser.i18n.getMessage('quickImport_head_peers')}
            </h1>
            <p class="f3 fw2 lh-copy ma0 light-gray">
              ${browser.i18n.getMessage('quickImport_subhead_peers', [peerCount])}
            </p>
          </div>
        </header>
        <div class='db relative mt5 hover-inner-shadow' style="border:solid 2px #6ACAD1">
          <div class='dt' style='height: 300px; width: 100%'>
            <div class='dtc v-mid tc'>
              <label class="f3 dim br1 ph4 pv3 dib navy pointer" style="background: #6ACAD1">
                ${browser.i18n.getMessage('quickImport_pick_file_button')}
                <input class="clip" type="file" id="quickImportInput" multiple onchange=${onFileInputChange} />
              </label>
              <label class="f3 dim br1 ph4 pv3 dib navy pointer ml3" style="background: #6ACAD1">
                ${browser.i18n.getMessage('quickImport_pick_folder_button')}
                <input class="clip" type="file" id="quickImportFolderInput" webkitdirectory multiple onchange=${onFolderInputChange} />
              </label>
              <p class='f3 mt4 mb0'>
                <emph class='underline pr2 moon-gray'>
                  ${browser.i18n.getMessage('quickImport_or')}
                </emph>
                ${browser.i18n.getMessage('quickImport_drop_it_here')}
              </p>
              <p class='f4 db'>${state.message}<span class='code db absolute fr pv2'>${state.progress}</span></p>
            </div>
          </div>
        </div>
        ${quickImportOptions(state, emit)}
      </div>
    </div>
  `
}
