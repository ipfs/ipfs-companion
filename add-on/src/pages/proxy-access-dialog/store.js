'use strict'

export default function createProxyAccessDialogStore (_i18n, runtime) {
  return function proxyAccessDialogStore (state, emitter) {
    state.scope = null
    state.permissions = null
    state.loading = true
    state.wildcard = false

    const port = runtime.connect({ name: 'proxy-access-dialog' })

    const onMessage = (data) => {
      if (!data || !data.scope || !data.permissions) return
      port.onMessage.removeListener(onMessage)

      state.scope = data.scope
      state.permissions = data.permissions
      state.loading = false

      emitter.emit('render')
    }

    port.onMessage.addListener(onMessage)

    emitter.on('allow', () => port.postMessage({ allow: true, wildcard: state.wildcard }))
    emitter.on('deny', () => port.postMessage({ allow: false, wildcard: state.wildcard }))

    emitter.on('wildcardToggle', () => {
      state.wildcard = !state.wildcard
      emitter.emit('render')
    })
  }
}
