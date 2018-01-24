'use strict'

function createProxyAclStore (accessControl, i18n, confirm = window.confirm) {
  return function proxyAclStore (state, emitter) {
    state.acl = new Map()

    emitter.on('DOMContentLoaded', async () => {
      state.acl = await accessControl.getAcl()
      accessControl.on('change', onAclChange)
      emitter.emit('render')
    })

    emitter.on('revoke', (e) => {
      const origin = e.currentTarget.getAttribute('data-origin')
      const permission = e.currentTarget.getAttribute('data-permission')

      const msg = permission
        ? i18n.getMessage('page_proxyAcl_confirm_revoke', [permission, origin])
        : i18n.getMessage('page_proxyAcl_confirm_revoke_all', origin)

      if (!confirm(msg)) return

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
}

module.exports = createProxyAclStore
