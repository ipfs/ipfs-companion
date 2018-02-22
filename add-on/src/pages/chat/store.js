'use strict'

const cbor = require('cbor')
const TOPIC = 'ipfs-companion:chat'

function createChatStore (i18n, runtime, storage) {
  return function chatStore (state, emitter) {
    state.id = null
    state.name = 'anonymous coward'
    state.text = ''
    state.messages = []
    state.posting = false
    state.subscribed = false
    state.error = null
    let ipfs

    const onMessage = async (msg) => {
      const exists = state.messages.some(m => m.seqno.equals(msg.seqno))
      if (exists) return

      try {
        msg.seqno = Buffer.from(msg.seqno)
        msg.data = await cbor.decodeFirst(msg.data)
      } catch (err) {
        return console.warn('Invalid message data', err)
      }

      state.messages = [msg].concat(state.messages).slice(0, 1000)
      emitter.emit('render')
    }

    emitter.on('DOMContentLoaded', async () => {
      ipfs = (await runtime.getBackgroundPage()).ipfsCompanion.ipfs

      try {
        await ipfs.pubsub.subscribe(TOPIC, onMessage)
        state.subscribed = true
      } catch (err) {
        console.error('Failed to subscribe', err)
        state.subscribed = false
        state.error = err
      }

      try {
        state.id = await ipfs.id()
      } catch (err) {
        console.error('Failed to get node ID')
      }

      const { chatName } = await storage.local.get({ chatName: 'anonymous coward' })
      state.name = chatName

      emitter.emit('render')
    })

    emitter.on('nameChange', (chatName) => {
      storage.local.set({ chatName })
      state.name = chatName
      emitter.emit('render')
    })

    emitter.on('textChange', (text) => {
      state.text = text
      emitter.emit('render')
    })

    emitter.on('postMessage', async () => {
      if (!ipfs || !state.subscribed) return
      if (!state.text) return

      state.posting = true
      emitter.emit('render')

      try {
        const { name, text } = state
        const data = cbor.encode({ name, text })
        await ipfs.pubsub.publish(TOPIC, data)
        state.text = ''
      } catch (err) {
        console.error('Failed to publish', err)
        state.error = err
      }

      state.posting = false
      emitter.emit('render')
    })

    window.addEventListener('unload', () => ipfs && ipfs.pubsub.unsubscribe(TOPIC, onMessage))
  }
}

module.exports = createChatStore
