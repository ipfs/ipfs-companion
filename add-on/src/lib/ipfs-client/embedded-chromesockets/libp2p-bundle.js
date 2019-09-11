'use strict'

const get = require('dlv')
const mergeOptions = require('merge-options')
const errCode = require('err-code')

const ipns = require('ipns')
const multiaddr = require('multiaddr')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const PubsubRouters = { gossipsub: require('libp2p-gossipsub') }
const Libp2pChromeSockets = require('./libp2p')

// libp2p bundle customized for chrome.sockets
// Loosely follows https://github.com/ipfs/js-ipfs/blob/master/src/core/components/libp2p.js
module.exports = function chromeSocketsBundle ({ datastore, peerInfo, peerBook, options, config }) {
  // TODO: Set up Delegate Routing based on the presence of Delegates in the config?
  let contentRouting
  let peerRouting

  const delegateHosts = get(options, 'config.Addresses.Delegates',
    get(config, 'Addresses.Delegates', [])
  )
  if (delegateHosts.length > 0) {
    // Pick a random delegate host
    const delegateString = delegateHosts[Math.floor(Math.random() * delegateHosts.length)]
    const delegateAddr = multiaddr(delegateString).toOptions()
    const delegatedApiOptions = {
      host: delegateAddr.host,
      // port is a string atm, so we need to convert for the check
      protocol: parseInt(delegateAddr.port) === 443 ? 'https' : 'http',
      port: delegateAddr.port
    }
    contentRouting = [new DelegatedContentRouter(peerInfo.id, delegatedApiOptions)]
    peerRouting = [new DelegatedPeerRouter(delegatedApiOptions)]
  }

  const getPubsubRouter = () => {
    const router = get(config, 'Pubsub.Router', 'gossipsub')

    if (!PubsubRouters[router]) {
      throw errCode(new Error(`Router unavailable. Configure libp2p.modules.pubsub to use the ${router} router.`), 'ERR_NOT_SUPPORTED')
    }

    return PubsubRouters[router]
  }

  const libp2pDefaults = {
    datastore,
    peerInfo,
    peerBook,
    modules: {
      contentRouting,
      peerRouting,
      pubsub: getPubsubRouter()
    },
    config: {
      peerDiscovery: {
        bootstrap: {
          list: get(options, 'config.Bootstrap',
            get(config, 'Bootstrap', []))
        }
      },
      relay: {
        enabled: get(options, 'relay.enabled',
          get(config, 'relay.enabled', true)),
        hop: {
          enabled: get(options, 'relay.hop.enabled',
            get(config, 'relay.hop.enabled', false)),
          active: get(options, 'relay.hop.active',
            get(config, 'relay.hop.active', false))
        }
      },
      dht: {
        kBucketSize: get(options, 'dht.kBucketSize', 20),
        // enabled: !get(options, 'offline', false), // disable if offline, on by default
        enabled: false,
        randomWalk: {
          enabled: false // disabled waiting for https://github.com/libp2p/js-libp2p-kad-dht/issues/86
        },
        validators: {
          ipns: {
            func: (key, record, cb) => ipns.validator.validate(record, key, cb)
          }
        },
        selectors: {
          ipns: (k, records) => ipns.validator.select(records[0], records[1])
        }
      },
      pubsub: {
        enabled: get(config, 'Pubsub.Enabled', true)
      }
    },
    connectionManager: get(options, 'connectionManager',
      {
        maxPeers: get(config, 'Swarm.ConnMgr.HighWater'),
        minPeers: get(config, 'Swarm.ConnMgr.LowWater')
      })
  }
  let libp2pOptions
  if (typeof options.libp2p !== 'function') {
    libp2pOptions = mergeOptions(libp2pDefaults, get(options, 'libp2p', {}))
  } else {
    libp2pOptions = libp2pDefaults
  }
  return new Libp2pChromeSockets(libp2pOptions)
}
