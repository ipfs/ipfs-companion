import browser from 'webextension-polyfill'
import debug from 'debug'

type listenerCb = (info: browser.Menus.OnClickData, tab: browser.Tabs.Tab | undefined) => void

/**
 * ContextMenus is a wrapper around browser.contextMenus API.
 */
export class ContextMenus {
  private readonly contextMenuListeners = new Map<browser.Menus.OnClickData['menuItemId'], listenerCb[]>()
  private readonly log: debug.Debugger & { error?: debug.Debugger }

  constructor () {
    this.log = debug('ipfs-companion:contextMenus')
    this.log.error = debug('ipfs-companion:contextMenus:error')
    this.contextMenuListeners = new Map()
    this.init()
  }

  /**
   * init is called once on extension startup
   */
  init (): void {
    browser.contextMenus.onClicked.addListener((info, tab) => {
      const { menuItemId } = info
      if (this.contextMenuListeners.has(menuItemId)) {
        this.contextMenuListeners.get(menuItemId)?.forEach(cb => cb(info, tab))
      }
    })
    this.log('ContextMenus Listeners ready')
  }

  /**
   * This method queues the listener function for given menuItemId.
   *
   * @param menuItemId
   * @param cb
   */
  queueListener (menuItemId: string, cb: listenerCb): void {
    if (this.contextMenuListeners.has(menuItemId)) {
      this.contextMenuListeners.get(menuItemId)?.push(cb)
    } else {
      this.contextMenuListeners.set(menuItemId, [cb])
    }
    this.log(`ContextMenus Listener queued for ${menuItemId}`)
  }

  /**
   * This method creates a context menu item and maps the listener function to it.
   *
   * @param options
   * @param cb
   */
  create (options: browser.Menus.CreateCreatePropertiesType, cb?: listenerCb): void {
    try {
      browser.contextMenus.create(options)
    } catch (err) {
      this.log.error?.('ContextMenus.create failed', err)
    }
    if (cb != null) {
      if (options?.id != null) {
        this.queueListener(options.id, cb)
      } else {
        throw new Error('ContextMenus.create callback requires options.id')
      }
    }
  }
}
