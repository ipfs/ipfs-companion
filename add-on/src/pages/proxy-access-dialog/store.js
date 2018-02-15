'use strict'

function createProxyAccessDialogStore (i18n, runtime) {
  return function proxyAccessDialogStore (state, emitter) {
    state.origin = null
    state.permission = null
    state.loading = true
    state.remember = false

    const port = runtime.connect({ name: 'proxy-access-dialog' })

    const onMessage = (data) => {
      if (!data || !data.origin || !data.permission) return
      port.onMessage.removeListener(onMessage)

      state.origin = data.origin
      state.permission = data.permission
      state.loading = false

      emitter.emit('render')
    }

    port.onMessage.addListener(onMessage)

    emitter.on('allow', () => port.postMessage({ allow: true, remember: state.remember }))
    emitter.on('deny', () => port.postMessage({ allow: false, remember: state.remember }))

    emitter.on('rememberToggle', () => {
      state.remember = !state.remember
      emitter.emit('render')
    })
  }
}

module.exports = createProxyAccessDialogStore
