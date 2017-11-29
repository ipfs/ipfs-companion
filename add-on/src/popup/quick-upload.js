'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const IpfsApi = require('ipfs-api')
const Buffer = IpfsApi().Buffer
const choo = require('choo')
const html = require('choo/html')

const app = choo()

app.use(quickUploadStore)
app.route('*', quickUploadPage)
app.mount('#root')

function quickUploadStore (state, emitter) {
  state.message = browser.i18n.getMessage('panel_quickUpload')

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

  return html`
    <div>
      <img src="../../icons/ipfs-logo-on.svg" id="icon"/>
      <p id="form">
        <span id="quickUploadMessage">${state.message}</span><br>
        <input type="file" id="quickUploadInput" onchange=${onFileInputChange} />
      </p>
    </div>
  `
}
