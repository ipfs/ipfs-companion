var ipfs, isIpfs

function initPoC () {
  console.log('init.js::initPoC started..')
  ipfs = initIpfsApi()
  ipfs.id()
    .then(function (id) {
      console.log('ipfs-api --------> Node ID is: ', id)
    })
    .catch(function (err) {
      console.log('ipfs-api --------> Fail: ', err)
    })

  isIpfs = initIsIpfs()
  console.log('is-ipfs test (should be true) ------> ' + isIpfs.multihash('QmUqRvxzQyYWNY6cD1Hf168fXeqDTQWwZpyXjU5RUExciZ'))

}


function initIpfsApi() {
  let ipfsApi = window.frames['ipfsApiSandbox'].IpfsApi
  return ipfsApi({host: '127.0.0.1', port: '5001', procotol: 'http'})
}

function initIsIpfs() {
  return window.frames['isIpfsSandbox'].IsIpfs
}

window.onload = initPoC
console.log('init.js finished')
