const { ReloaderBase } = require('./reloaderBase')

class WebUiReloader extends ReloaderBase {
  validation ({ url }) {
    const bundled = !url.startsWith('http') && url.includes('/webui/index.html#/')
    const ipns = url.includes('/webui.ipfs.io/#/')
    return bundled || ipns
  }

  message ({ url }) {
    return `reloading webui at ${url}`
  }
}

module.exports = {
  WebUiReloader
}
