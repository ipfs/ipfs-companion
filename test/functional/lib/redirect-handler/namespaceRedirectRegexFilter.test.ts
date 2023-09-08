import { expect } from 'chai'
import browserMock from 'sinon-chrome'
import { NamespaceRedirectRegexFilter } from '../../../../add-on/src/lib/redirect-handler/namespaceRedirectRegexFilter'
import isManifestV3 from '../../../helpers/is-mv3-testing-enabled'

describe('lib/redirect-handler/namespaceRedirectRegexFilter', () => {
  before(function () {
    if (!isManifestV3) {
      return this.skip()
    }
    browserMock.runtime.id = 'testid'
  })

  describe('isBrave', () => {
    it('should create filter for brave', () => {
      const filter = new NamespaceRedirectRegexFilter({
        originUrl: 'https://ipfs.io/ipfs/QmZMxU',
        redirectUrl: 'http://localhost:8080/ipfs/QmZMxU'
      })
      filter.computeFilter(true)
      filter.normalizeRegexFilter()
      expect(filter.regexFilter).to.equal('^https?\\:\\/\\/ipfs\\.io\\/(ipfs|ipns)\\/((?:[^\\.]|$).*)$')
      expect(filter.regexSubstitution).to.equal('\\1://\\2')
    })
  })
})
