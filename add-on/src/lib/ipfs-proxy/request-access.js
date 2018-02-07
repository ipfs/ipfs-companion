async function requestAccess (origin, permission) {
  const msg = `Allow ${origin} to access ipfs.${permission}?`

  // TODO: add checkbox to allow all for this origin
  let allow

  try {
    allow = window.confirm(msg)
  } catch (err) {
    console.warn('Failed to confirm, possibly not supported in this environment', err)
    allow = false
  }

  return { allow }
}

module.exports = requestAccess
