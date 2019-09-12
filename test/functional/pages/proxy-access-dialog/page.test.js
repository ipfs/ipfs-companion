'use strict'
const { describe, it } = require('mocha')
const { expect } = require('chai')
const createProxyAccessDialogPage = require('../../../../add-on/src/pages/proxy-access-dialog/page')
const createMockI18n = require('../../../helpers/mock-i18n')

describe('pages/proxy-access-dialog/page', () => {
  it('should display title, wildcard checkbox and allow/deny buttons', async () => {
    const i18n = createMockI18n()
    const state = { scope: 'http://ipfs.io', permissions: ['files.add'] }

    let res

    expect(() => { res = createProxyAccessDialogPage(i18n)(state).toString() }).to.not.throw()
    expect(res).to.have.string(`page_proxyAccessDialog_title[${state.scope},${state.permissions}]`)
    expect(res).to.have.string(`page_proxyAccessDialog_wildcardCheckbox_label[${state.scope}]`)
    expect(res).to.have.string('page_proxyAccessDialog_denyButton_text')
    expect(res).to.have.string('page_proxyAccessDialog_allowButton_text')
  })
})
