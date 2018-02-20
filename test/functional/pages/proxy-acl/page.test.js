'use strict'
const { describe, it } = require('mocha')
const { expect } = require('chai')
const createProxyAclPage = require('../../../../add-on/src/pages/proxy-acl/page')
const { objToAcl } = require('../../../helpers/acl')
const createMockI18n = require('../../../helpers/mock-i18n')

describe('pages/proxy-acl/page', () => {
  it('should render with empty ACL', async () => {
    const i18n = createMockI18n()
    const state = { acl: objToAcl({}) }

    let res

    expect(() => { res = createProxyAclPage(i18n)(state) }).to.not.throw()
    expect(res.toString()).to.have.string('page_proxyAcl_no_perms')
  })

  it('should render with single scope ACL and single allowed permission', async () => {
    const i18n = createMockI18n()
    const state = {
      acl: objToAcl({
        'https://ipfs.io/': {
          'ipfs.files.add': true
        }
      })
    }

    let res

    expect(() => { res = createProxyAclPage(i18n)(state).toString() }).to.not.throw()

    expect(res).to.have.string('https://ipfs.io')
    expect(res).to.have.string('page_proxyAcl_toggle_to_deny_button_title')
    expect(res).to.have.string('ipfs.files.add')
  })

  it('should render with single scope ACL and single denied permission', async () => {
    const i18n = createMockI18n()
    const state = {
      acl: objToAcl({
        'https://ipfs.io/': {
          'ipfs.files.add': false
        }
      })
    }

    let res

    expect(() => { res = createProxyAclPage(i18n)(state).toString() }).to.not.throw()

    expect(res).to.have.string('https://ipfs.io')
    expect(res).to.have.string('page_proxyAcl_toggle_to_allow_button_title')
    expect(res).to.have.string('ipfs.files.add')
  })

  it('should render with single scope ACL and multiple permissions', async () => {
    const i18n = createMockI18n()
    const state = {
      acl: objToAcl({
        'https://ipfs.io/': {
          'ipfs.files.add': true,
          'ipfs.object.new': false
        }
      })
    }

    let res

    expect(() => { res = createProxyAclPage(i18n)(state).toString() }).to.not.throw()

    expect(res).to.have.string('https://ipfs.io')
    expect(res).to.have.string('page_proxyAcl_toggle_to_deny_button_title')
    expect(res).to.have.string('page_proxyAcl_toggle_to_allow_button_title')
    expect(res).to.have.string('ipfs.files.add')
    expect(res).to.have.string('ipfs.object.new')
  })

  it('should render with multiple scopes and multiple permissions', async () => {
    const i18n = createMockI18n()
    const state = {
      acl: objToAcl({
        'https://ipfs.io/': {
          'ipfs.files.add': false,
          'ipfs.object.new': true
        },
        'https://ipld.io/': {
          'ipfs.block.put': true
        }
      })
    }

    let res

    expect(() => { res = createProxyAclPage(i18n)(state).toString() }).to.not.throw()

    expect(res).to.have.string('https://ipfs.io/')
    expect(res).to.have.string('https://ipld.io/')
    expect(res).to.have.string('page_proxyAcl_toggle_to_allow_button_title')
    expect(res).to.have.string('page_proxyAcl_toggle_to_deny_button_title')
    expect(res).to.have.string('ipfs.files.add')
    expect(res).to.have.string('ipfs.object.new')
    expect(res).to.have.string('ipfs.block.put')
  })
})
