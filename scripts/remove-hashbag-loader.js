module.exports = function (source) {
  return source.replace(/#/g, '_')
}
