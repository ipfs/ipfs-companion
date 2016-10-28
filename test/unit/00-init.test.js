'use strict'
/* eslint-env mocha */
/* globals storeDefaultOptionsIfMissing, optionDefaults */

describe('init.js', function () {
  describe('storeDefaultOptionsIfMissing', function () {
    it('should access every default option', function () {
      storeDefaultOptionsIfMissing()
      for (let key in optionDefaults) {
        sinon.assert.calledWith(chrome.storage.local.get, key)
      }
    })
  })
})
