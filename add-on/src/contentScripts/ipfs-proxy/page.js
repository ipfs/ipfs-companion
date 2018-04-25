'use strict'

const { createProxyClient } = require('ipfs-postmsg-proxy')
const _Buffer = Buffer

window.Buffer = window.Buffer || _Buffer
window.ipfs = window.ipfs || createProxyClient()
