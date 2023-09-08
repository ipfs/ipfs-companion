import { expect } from 'chai'
import browserMock from 'sinon-chrome'
import isManifestV3 from '../../../helpers/is-mv3-testing-enabled.js'
import { CommonPatternRedirectRegexFilter } from '../../../../add-on/src/lib/redirect-handler/commonPatternRedirectRegexFilter.js'

describe('lib/redirect-handler/commonPatternRedirectRegexFilter', () => {
  before(function () {
    if (!isManifestV3) {
      return this.skip()
    }
    browserMock.runtime.id = 'testid'
  })

  describe('isBrave', () => {
    it('should create filter for brave', () => {
      const filter = new CommonPatternRedirectRegexFilter({
        originUrl: 'https://awesome.ipfs.io/',
        redirectUrl: 'http://localhost:8080/ipns/awesome.ipfs.io/'
      })
      filter.computeFilter(true)
      filter.normalizeRegexFilter()
      expect(filter.regexFilter).to.equal('^https?\\:\\/\\/awesome\\.ipfs\\.io((?:[^\\.]|$).*)$')
      expect(filter.regexSubstitution).to.equal('ipns://awesome.ipfs.io\\1')
    })
  })
})
