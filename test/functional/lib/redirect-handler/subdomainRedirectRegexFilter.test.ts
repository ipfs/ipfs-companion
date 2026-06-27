import browserMock from 'sinon-chrome'
import isManifestV3 from '../../../helpers/is-mv3-testing-enabled'

describe.skipIf(!isManifestV3)('lib/redirect-handler/subdomainRedirectRegexFilter', () => {
  before(() => {
    browserMock.runtime.id = 'testid'
  })

  it.todo('add tests')
})
