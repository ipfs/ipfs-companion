import { runtime } from 'webextension-polyfill'

class IpfsStatus {
  constructor() {
    this._isIpfsOnline = false
    this._peerCount = 0
    this._port = runtime.connect({ name: 'browser-action-port' })
    this._port.onMessage.addListener((msg) => this.listener(msg))
  }

  async listener(message) {
    if (message.statusUpdate) {
      this._webuiRootUrl = message.statusUpdate.webuiRootUrl
      this._peerCount = message.statusUpdate.peerCount
      this._isIpfsOnline = this._peerCount > -1
    }
  }

  get isIpfsOnline() {
    return this._isIpfsOnline;
  }

  get peerCount() {
    return this._peerCount;
  }

  get webuiRootUrl() {
    return this._webuiRootUrl;
  }
}

const ipfsStatus = new IpfsStatus()
export default ipfsStatus;
