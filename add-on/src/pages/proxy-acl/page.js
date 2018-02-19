'use strict'

const html = require('choo/html')
const logo = require('../../popup/logo')

function createProxyAclPage (i18n) {
  return function proxyAclPage (state, emit) {
    const onRevoke = (e) => emit('revoke', e)
    const onToggleAllow = (e) => emit('toggleAllow', e)

    const { acl } = state
    const scopes = Array.from(state.acl.keys())
    const hasGrants = scopes.some((scope) => !!acl.get(scope).size)

    return html`
      <div class="avenir pt5" style="background: linear-gradient(to top, #041727 0%,#043b55 100%); min-height:100%;">
        <div class="mw8 center pa3 white">
          <header class="flex items-center mb4">
            ${logo({
              size: 80,
              path: '../../../icons',
              heartbeat: false
            })}
            <div class="pl3">
              <h1 class="f2 fw5 ma0">
                ${i18n.getMessage('page_proxyAcl_title')}
              </h1>
              <p class="f3 fw2 lh-copy ma0 light-gray">
                ${i18n.getMessage('page_proxyAcl_subtitle')}
              </p>
            </div>
          </header>
          ${hasGrants ? html`
            <table class="w-100 mb4" style="border-spacing: 0">
              ${scopes.reduce((rows, scope) => {
                const permissions = acl.get(scope)

                if (!permissions.size) return rows

                return rows.concat(
                  scopeRow({ onRevoke, scope, i18n }),
                  Array.from(permissions.keys())
                    .sort()
                    .map((permission) => accessRow({ scope, permission, allow: permissions.get(permission), onRevoke, onToggleAllow, i18n }))
                )
              }, [])}
            </table>
          ` : html`
            <p class="f5 light-gray i">${i18n.getMessage('page_proxyAcl_no_perms')}</p>
          `}
        </div>
      </div>
    `
  }
}

module.exports = createProxyAclPage

function scopeRow ({ scope, onRevoke, i18n }) {
  return html`
    <tr class="">
      <th class="f3 normal tl light-gray pv3 ph2 bb b--white-40" colspan="2">${scope}</th>
      <th class="tr pv3 ph0 bb b--white-40">${revokeButton({ onRevoke, scope, i18n })}</th>
    </tr>
  `
}

function accessRow ({ scope, permission, allow, onRevoke, onToggleAllow, i18n }) {
  const title = i18n.getMessage(
    allow
      ? 'page_proxyAcl_toggle_to_deny_button_title'
      : 'page_proxyAcl_toggle_to_allow_button_title'
  )

  return html`
    <tr class="bg-animate hover-bg-white-o-005 hide-child">
      <td
        class="f5 white ph3 pv2 ${allow ? 'bg-green' : 'bg-red'} tc bb b--white-10 pointer"
        style="width: 75px"
        onclick=${onToggleAllow}
        data-scope="${scope}"
        data-permission="${permission}"
        data-allow=${allow}
        title="${title}">
        ${i18n.getMessage(
          allow ? 'page_proxyAcl_allow_button_value' : 'page_proxyAcl_deny_button_value'
        )}
      </td>
      <td class="f5 light-gray ph3 pv2 bb b--white-10">${permission}</td>
      <td class="tr bb b--white-10">
        <div class="child">
          ${revokeButton({ onRevoke, scope, permission, i18n })}
        </div>
      </td>
    </tr>
  `
}

function revokeButton ({ onRevoke, scope, permission = null, i18n }) {
  const title = permission
    ? i18n.getMessage('page_proxyAcl_revoke_button_title', permission)
    : i18n.getMessage('page_proxyAcl_revoke_all_button_title')

  return html`
    <button
      class="button-reset outline-0 bg-transparent bw0 pointer ph3 pv1 light-gray hover-red"
      onclick=${onRevoke}
      data-scope="${scope}"
      data-permission="${permission || ''}"
      title="${title}">
      ${closeIcon()}
    </button>
  `
}

function closeIcon () {
  return html`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="21" height="21">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z " />
    </svg>
  `
}
