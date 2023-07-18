import { expect } from 'chai'
import { before, describe, it } from 'mocha'
import browserMock from 'sinon-chrome'

import { supportsBlock } from '../../../../add-on/src/lib/redirect-handler/blockOrObserve.js'

describe('lib/redirect-handler/blockOrObserve', () => {
  describe('supportsBlock', () => {
    it('should return false for MV3', () => {
      expect(supportsBlock()).to.be.false
    })
  })
})
