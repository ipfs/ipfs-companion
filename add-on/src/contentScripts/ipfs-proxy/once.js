const store = {}

// call a function only once and store it's return value
function once (id, func, opts) {
  opts = opts || {}
  opts.store = opts.store || store

  if (Object.keys(opts.store).includes(id)) {
    return () => opts.store[id]
  }

  return function () {
    opts.store[id] = func.apply(null, arguments)
    return opts.store[id]
  }
}

module.exports = once
