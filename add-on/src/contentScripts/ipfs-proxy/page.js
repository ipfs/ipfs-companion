'use strict'

const Ipfs = require('ipfs')
const { createProxyClient } = require('ipfs-postmsg-proxy')
const _Buffer = Buffer

window.Buffer = window.Buffer || _Buffer
window.Ipfs = window.Ipfs || Ipfs
window.ipfs = window.ipfs || createProxyClient()
