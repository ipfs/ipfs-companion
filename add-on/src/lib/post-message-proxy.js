const shortid = require('shortid')

function proxifyClient (func, opts) {
  opts = opts || {}
  const addListener = opts.addListener || window.addEventListener
  const removeListener = opts.removeListener || window.removeEventListener
  const postMessage = opts.postMessage || window.postMessage
  const targetOrigin = opts.targetOrigin || '*'
  const getMessageData = opts.getMessageData || ((event) => event.data)

  return function () {
    const args = Array.from(arguments)
    const cb = args[args.length - 1]

    const msg = {
      sender: 'proxifyClient',
      id: shortid(),
      func,
      args: args.slice(0, -1)
    }

    const handler = (e) => {
      const data = getMessageData(e)
      console.log(data)
      if (!data) return
      if (data.sender !== 'proxifyServer' || data.id !== msg.id) return
      removeListener('message', handler)

      if (e.data.err) {
        const err = new Error(`Unexpected error calling ${func}`)
        return cb(Object.assign(err, data.err))
      }

      cb(null, e.data.res)
    }

    addListener('message', handler)
    postMessage(msg, targetOrigin)
  }
}

exports.proxifyClient = proxifyClient

function proxifyServer (func, getTarget, opts) {
  opts = opts || {}
  const addListener = opts.addListener || window.addEventListener
  const removeListener = opts.removeListener || window.removeEventListener
  const postMessage = opts.postMessage || window.postMessage
  const targetOrigin = opts.targetOrigin || '*'
  const getMessageData = opts.getMessageData || ((event) => event.data)

  const handler = (e) => {
    const data = getMessageData(e)
    console.log(data)
    if (!data) return
    if (data.sender !== 'proxifyClient' || data.func !== func) return

    const cb = (err, res) => {
      const msg = { sender: 'proxifyServer', id: data.id, res }

      if (err) {
        msg.err = { message: err.message }

        if (process.env.NODE_ENV !== 'production') {
          msg.err.stack = err.stack
        }
      }

      postMessage(msg, targetOrigin)
    }

    const target = getTarget()
    target[func].apply(target, data.args.concat(cb))
  }

  addListener('message', handler)

  return { close: () => removeListener('message', handler) }
}

exports.proxifyServer = proxifyServer
