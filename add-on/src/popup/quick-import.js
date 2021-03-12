'use strict'
/* eslint-env browser, webextensions */

require('./quick-import.css')

const browser = require('webextension-polyfill')
const choo = require('choo')
const html = require('choo/html')
const logo = require('./logo')
const externalApiClient = require('../lib/ipfs-client/external')
const { formatImportDirectory } = require('../lib/ipfs-import')
const all = require('it-all')
const drop = require('drag-and-drop-files')
const filesize = require('filesize')

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

  emitter.on('fileInputChange', event => processFiles(state, emitter, event.target.files))

  // drag & drop anywhere
  drop(document.body, files => processFiles(state, emitter, files))
}

async function processFiles (state, emitter, files) {
  console.log('Processing files', files)
  const { ipfsCompanion } = await browser.runtime.getBackgroundPage()
  try {
    console.log('importing files', files)
    if (!files.length) {
      // File list may be empty in some rare cases
      // eg. when user drags something from proprietary browser context
      // We just ignore those UI interactions.
      throw new Error('found no valid sources, try selecting a local file instead')
    }
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
    for (const file of files) {
      data.push({
        path: file.name,
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
      // We create separate instance of http client running in thie same page to
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
    console.log(`Successfully imported ${files.length} files`)

    // copy shareable URL & preload
    copyShareLink(results)
    preloadFilesAtPublicGateway(results)

    // present result to the user using the beast available way
    if (!state.openViaWebUI || state.ipfsNodeType.startsWith('embedded')) {
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
  const displayOpenWebUI = state.ipfsNodeType !== 'embedded'

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
        <label for="quickImportInput" class='db relative mt5 hover-inner-shadow pointer' style="border:solid 2px #6ACAD1">
          <input class="db pointer w-100 h-100 top-0 o-0" type="file" id="quickImportInput" multiple onchange=${onFileInputChange} />
          <div class='dt dim' style='padding-left: 100px; height: 300px'>
            <div class='dtc v-mid'>
              <span class="f3 dim br1 ph4 pv3 dib navy" style="background: #6ACAD1">
                ${browser.i18n.getMessage('quickImport_pick_file_button')}
              </span>
              <span class='f3'>
                <emph class='underline pl3 pr2 moon-gray'>
                  ${browser.i18n.getMessage('quickImport_or')}
                </emph>
                ${browser.i18n.getMessage('quickImport_drop_it_here')}
              </span>
              <p class='f4 db'>${state.message}<span class='code db absolute fr pv2'>${state.progress}</span></p>
            </div>
          </div>
        </label>
        ${quickImportOptions(state, emit)}
      </div>
    </div>
  `
}
