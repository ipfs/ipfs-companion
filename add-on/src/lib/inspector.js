'use strict'

import browser from 'webextension-polyfill'
import { findValueForContext } from './context-menus.js'
import { pathAtHttpGateway } from './ipfs-path.js'

export default function createInspector (notify, ipfsPathValidator, getState) {
  return {
    async viewOnGateway (context, contextType) {
      const url = await findValueForContext(context, contextType)
      const ipfsPath = ipfsPathValidator.resolveToIpfsPath(url)
      const { pubGwURLString, gwURLString } = getState()
      // fall back to the local gateway when no public gateway is configured
      // (a browser tab can't open a native ipfs:// URI)
      const gatewayUrl = pathAtHttpGateway(ipfsPath, pubGwURLString || gwURLString)
      await browser.tabs.create({ url: gatewayUrl })
    }
    // TODO: view in WebUI's Files
    // TODO: view in WebUI's IPLD Explorer
  }
}
