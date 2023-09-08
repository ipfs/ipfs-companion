import { expect } from 'chai'
import browserMock from 'sinon-chrome'
import { SubdomainRedirectRegexFilter } from '../../../../add-on/src/lib/redirect-handler/subdomainRedirectRegexFilter.js'
import isManifestV3 from '../../../helpers/is-mv3-testing-enabled'

describe('lib/redirect-handler/subdomainRedirectRegexFilter', () => {
  before(function () {
    if (!isManifestV3) {
      return this.skip()
    }
    browserMock.runtime.id = 'testid'
  })

  describe('isBrave', () => {
    it('should create filter for brave', () => {
      const filter = new SubdomainRedirectRegexFilter({
        originUrl: 'https://en.wikipedia-on-ipfs.org.ipns.dweb.link/wiki/InterPlanetary_File_System',
        redirectUrl: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org/wiki/InterPlanetary_File_System'
      })
      filter.computeFilter(true)
      filter.normalizeRegexFilter()
      expect(filter.regexFilter).to.equal('^https?\\:\\/\\/(.*?)\\.(ipfs|ipns)\\.dweb\\.link\\/((?:[^\\.]|$).*)$')
      expect(filter.regexSubstitution).to.equal('\\2://\\1\\3')
    })
  })
})
