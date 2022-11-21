'use strict'

import browser from 'webextension-polyfill'
import { findValueForContext } from './context-menus.js'
import { pathAtHttpGateway } from './ipfs-path.js'

export default function createInspector (notify, ipfsPathValidator, getState) {
  return {
    async viewOnGateway (context, contextType) {
      const url = await findValueForContext(context, contextType)
      const ipfsPath = ipfsPathValidator.resolveToIpfsPath(url)
      const gateway = getState().pubGwURLString
      const gatewayUrl = pathAtHttpGateway(ipfsPath, gateway)
      await browser.tabs.create({ url: gatewayUrl })
    }
    // TODO: view in WebUI's Files
    // TODO: view in WebUI's IPLD Explorer
  }
}
