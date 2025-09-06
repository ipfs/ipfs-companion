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

})
