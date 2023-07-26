import browser from 'webextension-polyfill'

export interface IMessageHandler<T> {
  check: (message: T) => boolean
  handler: (message: T, sender?: browser.Runtime.MessageSender) => Promise<any>
}
