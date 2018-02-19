'use strict'

const html = require('choo/html')

function createProxyAccessDialogPage (i18n) {
  return function proxyAccessDialogPage (state, emit) {
    const onAllow = () => emit('allow')
    const onDeny = () => emit('deny')
    const onWildcardToggle = () => emit('wildcardToggle')

    const { loading, scope, permission } = state

    return html`
      <div class="flex flex-column pa3 h-100">
        <div class="flex-auto" style="min-height:auto">
          ${loading ? null : html`
            <div>
              <h1 class="sans-serif f5 lh-copy charcoal mt0" style="word-break:break-word">
                ${i18n.getMessage('page_proxyAccessDialog_title', [scope, permission])}
              </h1>
              <p class="sans-serif f6 lh-copy charcoal-muted">
                <label>
                  <input type="checkbox" checked=${state.wildcard} onclick=${onWildcardToggle} class="mr1" />
                  ${i18n.getMessage('page_proxyAccessDialog_wildcardCheckbox_label', scope)}
                </label>
              </p>
            </div>
          `}
        </div>
        <div class="tr">
          ${loading ? html`
            <div>
              <span class="mr2">
                ${button({
                  text: i18n.getMessage('page_proxyAccessDialog_denyButton_text'),
                  disabled: true
                })}
              </span>
              ${button({
                text: i18n.getMessage('page_proxyAccessDialog_allowButton_text'),
                disabled: true
              })}
            </div>
          ` : html`
            <div>
              <span class="mr2">
                ${button({
                  text: i18n.getMessage('page_proxyAccessDialog_denyButton_text'),
                  onClick: onDeny,
                  color: 'red'
                })}
              </span>
              ${button({
                text: i18n.getMessage('page_proxyAccessDialog_allowButton_text'),
                onClick: onAllow,
                color: 'aqua'
              })}
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
