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

})
