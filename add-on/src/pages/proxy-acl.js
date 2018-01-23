'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const choo = require('choo')
const html = require('choo/html')
const logo = require('../popup/logo')
const AccessControl = require('../lib/ipfs-proxy/access-control')

require('./proxy-acl.css')

const accessControl = new AccessControl(browser.storage)
const app = choo()

app.use(proxyAclStore)
app.route('*', proxyAclPage)
app.mount('#root')

function proxyAclStore (state, emitter) {
  state.acl = {}

  emitter.on('DOMContentLoaded', async () => {
    state.acl = await accessControl.getAcl()
    accessControl.on('change', onAclChange)
    emitter.emit('render')
  })

  emitter.on('revoke', (e) => {
    const origin = e.currentTarget.getAttribute('data-origin')
    const permission = e.currentTarget.getAttribute('data-permission')

    const msg = permission
      ? browser.i18n.getMessage('page_proxyAcl_confirm_revoke', [permission, origin])
      : browser.i18n.getMessage('page_proxyAcl_confirm_revoke_all', origin)

    if (!window.confirm(msg)) return

    accessControl.revokeAccess(origin, permission)
  })

  emitter.on('toggleAllow', (e) => {
    const origin = e.currentTarget.getAttribute('data-origin')
    const permission = e.currentTarget.getAttribute('data-permission')
    const allow = e.currentTarget.getAttribute('data-allow') === 'true'
    accessControl.setAccess(origin, permission, !allow)
  })

  async function onAclChange (acl) {
    state.acl = acl
    emitter.emit('render')
  }
}

function proxyAclPage (state, emit) {
  const onRevoke = (e) => emit('revoke', e)
  const onToggleAllow = (e) => emit('toggleAllow', e)

  const { acl } = state
  const origins = Object.keys(state.acl)
  const hasGrants = origins.some((origin) => !!acl[origin].length)

  return html`
    <div class="avenir pt5" style="background: linear-gradient(to top, #041727 0%,#043b55 100%); min-height:100%;">
      <div class="mw8 center pa3 white">
        <header class="flex items-center mb4">
          ${logo({
            size: 80,
            path: '../../icons',
            heartbeat: false
          })}
          <div class="pl3">
            <h1 class="f2 fw5 ma0">
              ${browser.i18n.getMessage('page_proxyAcl_title')}
            </h1>
            <p class="f3 fw2 lh-copy ma0 light-gray">
              ${browser.i18n.getMessage('page_proxyAcl_subtitle')}
            </p>
          </div>
        </header>
        ${hasGrants ? html`
          <table class="w-100 mb4" style="border-spacing: 0">
            ${origins.reduce((rows, origin) => {
              if (!acl[origin].length) return rows

              return rows.concat(
                originRow({ onRevoke, origin }),
                acl[origin]
                  .sort(sortByPermission)
                  .map((access) => accessRow({ origin, access, onRevoke, onToggleAllow }))
              )
            }, [])}
          </table>
        ` : html`
          <p class="f5 light-gray i">${browser.i18n.getMessage('page_proxyAcl_no_perms')}</p>
        `}
      </div>
    </div>
  `
}

function originRow ({ origin, onRevoke }) {
  return html`
    <tr class="">
      <th class="f3 normal tl light-gray pv3 ph2 bb b--white-40" colspan="2">${origin}</th>
      <th class="tr pv3 ph0 bb b--white-40">${revokeButton({ onRevoke, origin })}</th>
    </tr>
  `
}

function accessRow ({ origin, access, onRevoke, onToggleAllow }) {
  const title = browser.i18n.getMessage(
    access.allow
      ? 'page_proxyAcl_toggle_to_deny_button_title'
      : 'page_proxyAcl_toggle_to_allow_button_title'
  )

  return html`
    <tr class="bg-animate hover-bg-white-o-005 hide-child">
      <td
        class="f5 white ph3 pv2 ${access.allow ? 'bg-green' : 'bg-red'} tc bb b--white-10 pointer"
        style="width: 75px"
        onclick=${onToggleAllow}
        data-origin="${origin}"
        data-permission="${access.permission}"
        data-allow=${access.allow}
        title="${title}">
        ${browser.i18n.getMessage(
          access.allow ? 'page_proxyAcl_allow_button_value' : 'page_proxyAcl_deny_button_value'
        )}
      </td>
      <td class="f5 light-gray ph3 pv2 bb b--white-10">${access.permission}</td>
      <td class="tr bb b--white-10">
        <div class="child">
          ${revokeButton({ onRevoke, origin, permission: access.permission })}
        </div>
      </td>
    </tr>
  `
}

function revokeButton ({ onRevoke, origin, permission = null }) {
  const title = permission
    ? browser.i18n.getMessage('page_proxyAcl_revoke_button_title', permission)
    : browser.i18n.getMessage('page_proxyAcl_revoke_all_button_title')

  return html`
    <button
      class="button-reset outline-0 bg-transparent bw0 pointer ph3 pv1 light-gray hover-red"
      onclick=${onRevoke}
      data-origin="${origin}"
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

function sortByPermission (accessA, accessB) {
  if (accessA.permission > accessB.permission) return 1
  if (accessA.permission < accessB.permission) return -1
  return 0
}
