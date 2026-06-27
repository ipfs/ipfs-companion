import browserMock from 'sinon-chrome'
import isManifestV3 from '../../../helpers/is-mv3-testing-enabled.js'

describe.skipIf(!isManifestV3)('lib/redirect-handler/commonPatternRedirectRegexFilter', () => {
  before(() => {
    browserMock.runtime.id = 'testid'
  })

  it.todo('add tests')
})
