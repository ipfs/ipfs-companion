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
      const scope = e.currentTarget.getAttribute('data-scope')
      const permission = e.currentTarget.getAttribute('data-permission')

      const msg = permission
        ? i18n.getMessage('page_proxyAcl_confirm_revoke', [permission, scope])
        : i18n.getMessage('page_proxyAcl_confirm_revoke_all', scope)

      if (!confirm(msg)) return

      accessControl.revokeAccess(scope, permission)
    })

    emitter.on('toggleAllow', (e) => {
      const scope = e.currentTarget.getAttribute('data-scope')
      const permission = e.currentTarget.getAttribute('data-permission')
      const allow = e.currentTarget.getAttribute('data-allow') === 'true'
      accessControl.setAccess(scope, permission, !allow)
    })

    async function onAclChange (changes) {
      changes.forEach((v, k) => state.acl.set(k, v))
      emitter.emit('render')
    }
  }
}

module.exports = createProxyAclStore
