'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const choo = require('choo')
const html = require('choo/html')
const logo = require('./logo')
const drop = require('drag-and-drop-files')
const fileReaderPullStream = require('pull-file-reader')

document.title = browser.i18n.getMessage('panel_quickUpload')

const app = choo()

app.use(quickUploadStore)
app.route('*', quickUploadPage)
app.mount('#root')

function quickUploadStore (state, emitter) {
  state.message = ''
  state.peerCount = ''
  state.ipfsNodeType = 'external'
  state.expandOptions = false
  state.wrapWithDirectory = true
  state.openViaWebUI = true
  state.uploadDir = ''
  state.userChangedUploadDir = false

  function updateState ({ ipfsNodeType, peerCount, uploadDir }) {
    state.ipfsNodeType = ipfsNodeType
    state.peerCount = peerCount
    if (!state.userChangedUploadDir) {
      state.uploadDir = uploadDir
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
  try {
    if (!files.length) {
      // File list may be empty in some rare cases
      // eg. when user drags something from proprietary browser context
      // We just ignore those UI interactions.
      throw new Error('found no valid sources, try selecting a local file instead')
    }
    const { ipfsCompanion } = await browser.runtime.getBackgroundPage()
    const uploadTab = await browser.tabs.getCurrent()
    const streams = files2streams(files)
    emitter.emit('render')
    const wrapFlag = (state.wrapWithDirectory || streams.length > 1)
    const options = {
      wrapWithDirectory: wrapFlag
    }
    state.progress = `Importing ${streams.length} files...`
    const uploadDir = formatUploadDirectory(state.uploadDir)
    let result
    try {
      // files are first `add`ed to IPFS
      // and then copied to an MFS directory
      // to ensure that CIDs for any created file
      // remain the same for ipfs-companion and Web UI
      result = await ipfsCompanion.ipfs.add(streams, options)
      // This is just an additional safety check, as in past combination
      // of specific go-ipfs/js-ipfs-http-client versions
      // produced silent errors in form of partial responses:
      // https://github.com/ipfs-shipyard/ipfs-companion/issues/480
      const partialResponse = result.length !== streams.length + (options.wrapWithDirectory ? 1 : 0)
      if (partialResponse) {
        throw new Error('Result of ipfs.add call is missing entries. This may be due to a bug in HTTP API similar to https://github.com/ipfs/go-ipfs/issues/5168')
      }

      // cp will fail if directory does not exist
      await ipfsCompanion.ipfs.files.mkdir(`${uploadDir}`, { parents: true })

      const files = result.map(result => (ipfsCompanion.ipfs.files.cp(`/ipfs/${result.hash}`, `${uploadDir}${result.path}`)))
      await Promise.all(files)
    } catch (err) {
      console.error('Failed to import files to IPFS', err)
      ipfsCompanion.notify('notify_uploadErrorTitle', 'notify_inlineErrorMsg', `${err.message}`)
      throw err
    }
    state.progress = 'Completed'
    emitter.emit('render')
    console.log(`Successfully imported ${streams.length} files`)

    // open web UI at proper directory
    // unless and embedded node is in use (no access to web UI)
    // in which case, open resource.
    if (state.ipfsNodeType === 'embedded' || !state.openViaWebUI) {
      await ipfsCompanion.uploadResultHandler({ result, openRootInNewTab: true })
    } else {
      await ipfsCompanion.openWebUiAtDirectory(uploadDir)
    }
    // close upload tab as it will be replaced with a new tab with uploaded content
    await browser.tabs.remove(uploadTab.id)
  } catch (err) {
    console.error('Unable to perform import', err)
    // keep upload tab and display error message in it
    state.message = 'Unable to import to IPFS:'
    state.progress = `${err}`
    emitter.emit('render')
  }
}

/* disabled in favor of fileReaderPullStream
function file2buffer (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(Buffer.from(reader.result))
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
} */

function formatUploadDirectory (path) {
  path = path.replace(/\/$|$/, '/')
  // needed to handle date symbols in the import directory
  const now = new Date()
  const dateSymbols = [/%Y/g, /%M/g, /%D/g, /%h/g, /%m/g, /%s/g]
  const symbolReplacements = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()]
  dateSymbols.forEach((symbol, i) => { path = path.replace(symbol, symbolReplacements[i]) })
  return path
}

function files2streams (files) {
  const streams = []
  for (const file of files) {
    if (!file.type && file.size === 0) {
      // UX fail-safe:
      // at the moment drag&drop of an empty file without an extension
      // looks the same as dropping a directory
      throw new Error(`unable to add "${file.name}", directories and empty files are not supported`)
    }
    const fileStream = fileReaderPullStream(file, { chunkSize: 32 * 1024 * 1024 })
    streams.push({
      path: file.name,
      content: fileStream
    })
  }
  return streams
}

function quickUploadOptions (state, emit) {
  const onExpandOptions = (e) => { state.expandOptions = true; emit('render') }
  const onWrapWithDirectoryChange = (e) => { state.wrapWithDirectory = e.target.checked }
  const onDirectoryChange = (e) => { state.userChangedUploadDir = true; state.uploadDir = e.target.value }
  const onOpenViaWebUIChange = (e) => { state.openViaWebUI = e.target.checked }
  const displayOpenWebUI = state.ipfsNodeType !== 'embedded'

  if (state.expandOptions) {
    return html`
      <div id='quickUploadOptions' class='sans-serif mt3 f6 lh-copy light-gray no-user-select'>
        <label for='wrapWithDirectory' class='flex items-center db relative mt1 pointer'>
          <input id='wrapWithDirectory' type='checkbox' onchange=${onWrapWithDirectoryChange} checked=${state.wrapWithDirectory} />
          <span class='mark db flex items-center relative mr2 br2'></span>
          ${browser.i18n.getMessage('quickUpload_options_wrapWithDirectory')}
        </label>
        ${displayOpenWebUI ? html`<label for='openViaWebUI' class='flex items-center db relative mt1 pointer'>
          <input id='openViaWebUI' type='checkbox' onchange=${onOpenViaWebUIChange} checked=${state.openViaWebUI} />
          <span class='mark db flex items-center relative mr2 br2'></span>
          ${browser.i18n.getMessage('quickUpload_options_openViaWebUI')}
        </label>` : null}
        <label for='uploadDir' class='flex items-center db relative mt1 pointer'>
          ${browser.i18n.getMessage('quickUpload_options_uploadDir')}
          <span class='mark db flex items-center relative mr2 br2'></span>
          <input id='uploadDir' class='w-40' type='text' oninput=${onDirectoryChange} value=${state.uploadDir} />
        </label>
      </div>
    `
  }
  return html`
    <button class='mt3 f6 lh-copy link bn bg-transparent moon-gray dib pa0 pointer' style='color: #6ACAD1' onclick=${onExpandOptions}>
      ${browser.i18n.getMessage('quickUpload_options_show')} »
    </button>
  `
}

function quickUploadPage (state, emit) {
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
              ${browser.i18n.getMessage('panel_quickUpload')}
            </h1>
            <p class="f3 fw2 lh-copy ma0 light-gray">
              ${browser.i18n.getMessage('quickUpload_subhead_peers', [peerCount])}
            </p>
          </div>
        </header>
        <label for="quickUploadInput" class='db relative mt5 hover-inner-shadow pointer' style="border:solid 2px #6ACAD1">
          <input class="db pointer w-100 h-100 top-0 o-0" type="file" id="quickUploadInput" multiple onchange=${onFileInputChange} />
          <div class='dt dim' style='padding-left: 100px; height: 300px'>
            <div class='dtc v-mid'>
              <span class="f3 link dim br1 ph4 pv3 dib white" style="background: #6ACAD1">
                ${browser.i18n.getMessage('quickUpload_pick_file_button')}
              </span>
              <span class='f3'>
                <emph class='underline pl3 pr2 moon-gray'>
                  ${browser.i18n.getMessage('quickUpload_or')}
                </emph>
                ${browser.i18n.getMessage('quickUpload_drop_it_here')}
              </span>
              <p class='f4 db'>${state.message}<span class='code db absolute fr pv2'>${state.progress}</span></p>
            </div>
          </div>
        </label>
        ${quickUploadOptions(state, emit)}
      </div>
    </div>
  `
}
