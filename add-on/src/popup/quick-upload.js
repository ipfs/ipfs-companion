'use strict'
/* eslint-env browser, webextensions */
const Buffer = window.IpfsApi().Buffer
const quickUploadInput = document.getElementById('quickUploadInput')
const quickUploadMessage = document.getElementById('quickUploadMessage')

async function onQuickUploadInputChange (event) {
  const file = event.target.files[0]
  try {
    const bg = await browser.runtime.getBackgroundPage()
    let reader = new FileReader()
    reader.onloadend = () => {
      const buffer = Buffer.from(reader.result)
      bg.ipfs.files.add(buffer, (err, result) => {
        if (err || !result) {
          // keep upload tab and display error message in it
          quickUploadMessage.innerText = `Unable to upload to IPFS API: ${err}`
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
}

function initUpload () {
  quickUploadInput.onchange = onQuickUploadInputChange
  quickUploadInput.click()
}

document.addEventListener('DOMContentLoaded', initUpload)
