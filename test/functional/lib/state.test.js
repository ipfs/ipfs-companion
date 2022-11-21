'use strict'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { URL } from 'url'
import { initState } from '../../../add-on/src/lib/state.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'

describe('state.js', function () {
  let state

  beforeEach(function () {
    global.URL = URL
    state = Object.assign(initState(optionDefaults), { peerCount: 1 })
  })

  describe('activeIntegrations(url)', function () {
    it('should return false if input is undefined', async function () {
      expect(state.activeIntegrations(undefined)).to.equal(false)
    })
    it('should return true if host is not on the opt-out list', async function () {
      state.disabledOn = ['pl.wikipedia.org']
      const url = 'https://en.wikipedia.org/wiki/Main_Page'
      expect(state.activeIntegrations(url)).to.equal(true)
    })
    it('should return true if parent host is on the opt-out list, but a direct match exist on opt-in one', async function () {
      state.disabledOn = ['wikipedia.org']
      state.enabledOn = ['en.wikipedia.org']
      const url = 'https://en.wikipedia.org/wiki/Main_Page'
      expect(state.activeIntegrations(url)).to.equal(true)
    })
    it('should return false if parent host is on the opt-in list, but a direct match exist on opt-out one', async function () {
      state.disabledOn = ['en.wikipedia.org']
      state.enabledOn = ['wikipedia.org']
      const url = 'https://en.wikipedia.org/wiki/Main_Page'
      expect(state.activeIntegrations(url)).to.equal(false)
    })
    it('should return true if direct match host is on both opt-in and opt-out lists', async function () {
      state.disabledOn = ['example.com']
      state.enabledOn = ['example.com']
      const url = 'https://example.com/path'
      expect(state.activeIntegrations(url)).to.equal(true)
    })
    it('should return false if parent host is on both opt-in and opt-out lists', async function () {
      state.disabledOn = ['example.com']
      state.enabledOn = ['example.com']
      const url = 'https://subdomain.example.com/path'
      expect(state.activeIntegrations(url)).to.equal(false)
    })
    it('should return false if host is not on the opt-out list but global toggle is off', async function () {
      state.disabledOn = ['pl.wikipedia.org']
      state.active = false
      const url = 'https://en.wikipedia.org/wiki/Main_Page'
      expect(state.activeIntegrations(url)).to.equal(false)
    })
    it('should return false if host is on the opt-out list', async function () {
      state.disabledOn = ['example.com', 'pl.wikipedia.org']
      const url = 'https://pl.wikipedia.org/wiki/Wikipedia:Strona_g%C5%82%C3%B3wna'
      expect(state.activeIntegrations(url)).to.equal(false)
    })
    it('should return false if parent host of a subdomain is on the opt-out list', async function () {
      state.disabledOn = ['wikipedia.org']
      const url = 'https://pl.wikipedia.org/wiki/Wikipedia:Strona_g%C5%82%C3%B3wna'
      expect(state.activeIntegrations(url)).to.equal(false)
    })
  })
})
