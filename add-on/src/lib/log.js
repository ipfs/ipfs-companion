const root = 'ipfs-companion'

const debug = require('debug')

module.exports = (loggerName) => {
  const log = debug(`${root}:${loggerName}`)
  log.debug = debug(`${log.namespace}:debug`)
  log.error = debug(`${log.namespace}:error`)

  log.color = '#0b3a53'
  log.debug.color = '#7f8491'
  log.error.color = '#ea5037'
  return log
}
