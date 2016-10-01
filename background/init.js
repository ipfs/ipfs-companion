function initPoC () {
  let isIpfs = window.IsIpfs
  console.log('is-ipfs ------> ' + isIpfs.multihash('QmUqRvxzQyYWNY6cD1Hf168fXeqDTQWwZpyXjU5RUExciZ'))

  let ipfs = window.IpfsApi({host: '127.0.0.1', port: '5001', procotol: 'http'})
  ipfs.id()
    .then(function (id) {
      console.log('js-ipfs-api --------> my id is: ', id)
    })
    .catch(function (err) {
      console.log('ja-ipfs-api --------> Fail: ', err)
    })
}

initPoC()
