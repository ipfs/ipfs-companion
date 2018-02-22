'use strict'

const html = require('choo/html')

function createChatPage (i18n) {
  return function chatPage (state, emit) {
    const onNameChange = (e) => emit('nameChange', e.target.value)
    const onTextChange = (e) => emit('textChange', e.target.value)
    const onTextKeyDown = (e) => {
      if (e.which === 13 || e.keyCode === 13) {
        emit('postMessage')
      }
    }
    const onSendClick = () => emit('postMessage')

    const { name, text, messages, subscribed, posting, error } = state

    return html`
      <div class="sans-serif">
        <header class="pv3 ph2 ph3-l bg-navy cf mb3">
          <a href="https://multiformats.io/" title="ipfs.io">
            <img src="https://ipfs.io/images/ipfs-logo.svg" class="v-mid" style="height:50px">
          </a>
          <h1 class="aqua fw2 montserrat dib ma0 pv2 ph1 v-mid fr f3 lh-copy">Chat</h1>
        </header>
        <div class="mw8 center">
          <div class="mb3">
            <label for="name" class="db pb2 w-100 fw2 tracked ttu f5 teal">Name</label>
            <input id="name" type="text" class="f6 db w-100 ph1 pv2 ba border-gray-muted monospace" value=${name} oninput=${onNameChange} />
          </div>
          <div class="mb3">
            <label for="text" class="db pb2 w-100 fw2 tracked ttu f5 teal">Message</label>
            <textarea id="text" class="f6 db w-100 ph1 pv2 ba border-gray-muted monospace" rows="2" oninput=${onTextChange} onkeydown=${onTextKeyDown}>${text}</textarea>
          </div>
          <div class="mb4 tr">
            ${posting || !subscribed
              ? button({ text: 'Send', disabled: true })
              : button({ text: 'Send', onClick: onSendClick, color: 'aqua' })
            }
          </div>
          ${error ? html`<div>${error.message}</div>` : null}
          ${messages.map(msg => html`
            <div class="mb3 bg-white pa3">
              <div class="f5 teal mb2">${msg.data.name} @ ${msg.from}</div>
              <div class="f5 charcoal">${msg.data.text}</div>
            </div>
          `)}
        </div>
      </div>
    `
  }
}

function button ({ onClick, color, text, disabled }) {
  if (disabled) {
    return html`
      <button type="button" class="button-reset sans-serif bg-gray-muted f5 gray br2 bw0 ph4 pv2">${text}</button>
    `
  }

  return html`
    <button type="button" onclick=${onClick} class="button-reset sans-serif bg-${color} hover-bg-${color}-muted f5 white br2 bw0 ph4 pv2">${text}</button>
  `
}

module.exports = createChatPage
