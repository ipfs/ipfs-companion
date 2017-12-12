'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const choo = require('choo')
const html = require('choo/html')
const logo = require('./logo')

require('./quick-upload.css')

const app = choo()

app.use(quickUploadStore)
app.route('*', quickUploadPage)
app.mount('#root')

function quickUploadStore (state, emitter) {
  state.message = ''
  state.peerCount = ''
  state.filesCount = ''
  state.repoSize = ''
  state.ipfsNodeType = 'external'

  function updateState ({ipfsNodeType, peerCount, repoStats = {}}) {
    state.ipfsNodeType = ipfsNodeType
    state.peerCount = peerCount
    state.filesCount = repoStats.NumObjects || ''
    const repoSizeInMB = ((repoStats.RepoSize || 0) / 1000000)
    state.repoSize = `${repoSizeInMB}MB`
  }

  let port

  emitter.on('DOMContentLoaded', async () => {
    // initialize connection to the background script which will trigger UI updates
    port = browser.runtime.connect({name: 'browser-action-port'})
    port.onMessage.addListener(async (message) => {
      if (message.statusUpdate) {
        console.log('In browser action, received message from background:', message)
        updateState(message.statusUpdate)
        emitter.emit('render')
      }
    })
  })

  emitter.on('fileInputChange', async (event) => {
    const file = event.target.files[0]
    try {
      const { ipfsCompanion } = await browser.runtime.getBackgroundPage()

      const buffer = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(Buffer.from(reader.result))
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
      })

      await ipfsCompanion.ipfsAddAndShow(buffer)

      // close upload tab as it will be replaced with a new tab with uploaded content
      const tab = await browser.tabs.getCurrent()
      browser.tabs.remove(tab.id)
    } catch (err) {
      console.error('Unable to perform quick upload', err)
      // keep upload tab and display error message in it
      state.message = `Unable to upload to IPFS API: ${err}`
      emitter.emit('render')
    }
  })
}

function quickUploadPage (state, emit) {
  const onFileInputChange = (e) => emit('fileInputChange', e)
  const {filesCount, peerCount} = state
  return html`
    <div class="avenir pt5" style="background: linear-gradient(to top, #041727 0%,#043b55 100%); height:100%;">
      <div class="mw8 center pa3 white">
        <header class="flex items-center">
          ${logo({
            size: 80,
            path: '../../icons',
            heartbeat: false
          })}
          <div class="pl3">
            <h1 class="f2 fw5 ma0">${browser.i18n.getMessage('panel_quickUpload')}</h1>
            <p class="f3 fw2 lh-copy ma0 light-gray">Currently sharing <strong class="fw6">${filesCount}</strong> files with <strong strong class="fw6">${peerCount}</strong> IPFS peers</p>
          </div>
        </header>

        <div class='pv6 mv5' style="padding-left:100px; border:solid 2px #6ACAD1">
          <input class="dn" type="file" id="quickUploadInput" onchange=${onFileInputChange} />
          <label class="f3 link dim br1 ph4 pv3 mb2 dib white" style="background: #6ACAD1" for="quickUploadInput">
            Pick a file
          </label>
          <span class='f3'>
            <emph class='underline pl3 pr2 moon-gray'>or</emph> drop it here to share
          </span>
          <p class='f4'>${state.message}</p>
        </div>

      </div>
    </div>
  `
}
