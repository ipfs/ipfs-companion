'use strict'

const html = require('choo/html')

require('./page.css')

function createProxyAccessDialogPage (i18n) {
  return function proxyAccessDialogPage (state, emit) {
    const onAllow = () => emit('allow', false)
    const onDeny = () => emit('deny', false)
    const onRememberToggle = () => emit('rememberToggle')

    const { loading, origin, permission } = state

    return html`
      <div class="flex flex-column pa3 h-100">
        <div class="flex-auto">
          ${loading ? null : html`
            <div>
              <h1 class="sans-serif f5 lh-copy charcoal mt0">Allow ${origin} to access ipfs.${permission}?</h1>
              <p class="sans-serif f6 lh-copy charcoal-muted">
                <label>
                  <input type="checkbox" checked=${state.remember} onclick=${onRememberToggle} class="mr1" />
                  Apply to all permissions for ${origin}
                </label>
              </p>
            </div>
          `}
        </div>
        <div class="tr">
          ${loading ? html`
            <div>
              <span class="mr2">${button({ text: 'Deny', disabled: true })}</span>
              ${button({ text: 'Allow', disabled: true })}
            </div>
          ` : html`
            <div>
              <span class="mr2">${button({ text: 'Deny', onClick: onDeny, color: 'red' })}</span>
              ${button({ text: 'Allow', onClick: onAllow, color: 'aqua' })}
            </div>
          `}
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

module.exports = createProxyAccessDialogPage
