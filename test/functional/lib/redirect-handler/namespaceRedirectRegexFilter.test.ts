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

})
