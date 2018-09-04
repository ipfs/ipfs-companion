'use strict'

function createWelcomePageStore (i18n) {
  return function welcomePageStore (state, emitter) {
    emitter.on('DOMContentLoaded', async () => {
      emitter.emit('render')
    })
  }
}

module.exports = createWelcomePageStore
