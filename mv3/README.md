# IPFS-Companion-MV3

IPFS-companion crammed into manifest v3

## dnslink

On the first time seeing a new url that matches our criteria, we check to see if it is a dnslink url, if so, we create a new rule using the declarativeNetRequest api. The next time the browser sees that domain, it will redirect to the user's local node.

#### _Note on IPFS HTTP API_

Since we are no longer able to modify request headers in MV3, we need to set the AccessControlAllowOrigin in our local ipfs node config. (you will need to replace the chrome-extension id with your own.)

This will be fixed in an upcoming release of go-ipfs (hopefully)

```
	"API": {
		"HTTPHeaders": {
			"Access-Control-Allow-Methods": [
				"PUT",
				"GET",
				"POST"
			],
			"Access-Control-Allow-Origin": [
				"chrome-extension://gdiahefjcggefcmjpdbahjpipenonllk",
				"webui://-",
				"http://localhost:3000",
				"http://127.0.0.1:5001",
				"https://webui.ipfs.io"
			]
		}
	},
```
