module.exports = () => ({
  getMessage (key, substititions) {
    if (!substititions) return key
    substititions = Array.isArray(substititions) ? substititions : [substititions]
    if (!substititions.length) return key
    return `${key}[${substititions}]`
  }
})
