var options = new Map() // key: optionName, value: defaultValue
options.set('publicGateways', 'ipfs.io gateway.ipfs.io ipfs.pics')
options.set('useCustomGateway', true)
options.set('customGatewayUrl', 'http://127.0.0.1:8080')
options.set('ipfsApiUrl', 'http://127.0.0.1:5001')

function saveOption (name) {
  let element = document.querySelector(`#${name}`)
  let change = {}
  switch (element.type) {
    case 'text':
    case 'url':
      change[name] = element.value
      break
    case 'checkbox':
      change[name] = element.checked
      break
    default:
      console.log('Unsupported option type: ' + element.type)
  }
  chrome.storage.local.set(change)
}

function readOption (name, defaultValue) {
  let element = document.querySelector(`#${name}`)
  chrome.storage.local.get(name, (storage) => {
    let oldValue = storage[name]
    switch (element.type) {
      case 'text':
      case 'url':
        element.value = oldValue || defaultValue
        break
      case 'checkbox':
        element.checked = typeof (oldValue) === 'boolean' ? oldValue : defaultValue
        break
      default:
        console.log('Unsupported option type: ' + element.type)
    }
  })
}

function saveOptions (e) {
  for (var option of options.keys()) {
    saveOption(option)
  }
}

function readOptions () {
  for (var [option, defaultValue] of options) {
    readOption(option, defaultValue)
  }
}

document.addEventListener('DOMContentLoaded', readOptions)
document.querySelector('form').addEventListener('submit', saveOptions)
