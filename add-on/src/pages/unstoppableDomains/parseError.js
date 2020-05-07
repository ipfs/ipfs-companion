console.log('script launched')

var root = document.getElementById('root')

const loadingHTML = () => `<div class="loader-wrapper">
<span class="loader"><span class="loader-inner"></span></span>
</div>
<div class="moon-gray montserrat fw2 f3 ma0 pt0 pb2 tc">
<h2>Resolving Unstoppable domain</h2>
</div>`

const errorHTML = (error) => ` <div class="moon-gray montserrat fw2 f3 ma0 pt0 pb2 tc">
<h2>${error}</h2>
</div>`

const urlParams = getAllUrlParams(window.location.href)
if (urlParams.error) {
  const errorMessage = parseResolutionError(urlParams.error, urlParams.domain)
  root.innerHTML += errorHTML(errorMessage)
} else {
  root.innerHTML += loadingHTML()
}

function parseResolutionError (errorcode, domain) {
  console.log({ errorcode, domain })
  switch (errorcode) {
    case 'RecordNotFound':
      return `No ipfs record found for ${domain}`
    case 'UnregisteredDomain':
      return `Domain ${domain} is not registered`
    default:
      return `Something went wrong ${errorcode}`
  }
}

function getAllUrlParams (url) {
  // get query string from url (optional) or window
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1)

  // we'll store the parameters here
  var obj = {}

  if (queryString) {
    queryString = queryString.split('#')[0]
    var arr = queryString.split('&')

    for (var i = 0; i < arr.length; i++) {
      // separate the keys and the values
      var a = arr[i].split('=')
      var paramName = a[0]
      var paramValue = typeof (a[1]) === 'undefined' ? true : a[1]

      if (!obj[paramName]) {
        obj[paramName] = paramValue
      } else if (obj[paramName] && typeof obj[paramName] === 'string') {
        obj[paramName] = [obj[paramName]]
        obj[paramName].push(paramValue)
      } else {
        obj[paramName].push(paramValue)
      }
    }
  }
  return obj
}
