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
      const bg = await browser.runtime.getBackgroundPage()
      let reader = new FileReader()
      reader.onloadend = () => {
        const buffer = Buffer.from(reader.result)
        bg.ipfs.add(buffer, (err, result) => {
          if (err || !result) {
            // keep upload tab and display error message in it
            state.message = `Unable to upload to IPFS API: ${err}`
            emitter.emit('render')
          } else {
            // close upload tab as it will be replaced with a new tab with uploaded content
            browser.tabs.getCurrent().then(tab => {
              browser.tabs.remove(tab.id)
            })
          }
          // execute handler
          return bg.uploadResultHandler(err, result)
        })
      }
      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error(`Unable to perform quick upload due to ${error}`)
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
