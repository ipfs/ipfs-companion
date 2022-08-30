const { InternalTabReloader } = require('./internalTabReloader')
const { LocalGatewayReloader } = require('./localGatewayReloader')
const { WebUiReloader } = require('./webUiReloader')

/**
 * Prepares extension by creating an instance and awaiting for init.
 *
 * @param {Array.[InternalTabReloader|LocalGatewayReloader|WebUiReloader]} extensions
 * @param {Browser} browserInstance
 * @param {Logger} loggerInstance
 * @returns {Promise<Array.[InternalTabReloader|LocalGatewayReloader|WebUiReloader]>}
 */
function prepareReloadExtensions (extensions, browserInstance, loggerInstance) {
  const reloadExtensions = Array.isArray(extensions) ? extensions : [extensions]
  return Promise.all(reloadExtensions
    .map(async Ext => {
      const ext = new Ext(browserInstance, loggerInstance)
      await ext.init()
      return ext
    })
  )
}

module.exports = {
  InternalTabReloader,
  LocalGatewayReloader,
  WebUiReloader,
  prepareReloadExtensions
}
