function initPoC() {
  let ipfs = window.IpfsApi({host: '127.0.0.1', port: '5001', procotol: 'http'});
  ipfs.id()
    .then(function (id) {
      console.log('--------> my id is: ', id)
    })
    .catch(function(err) {
      console.log('--------> Fail: ', err)
    })
}


initPoC();
