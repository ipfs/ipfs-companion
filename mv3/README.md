# IPFS Companion MV3

> This is IPFS Companion rewrite compatible with [Manifest v3](https://github.com/ipfs/ipfs-companion/issues/666).

## DNSLink

On the first time seeing a new URL that matches our criteria, we check to see
if it is a [DNSLink](https://docs.ipfs.io/concepts/glossary/#dnslink) URL,
if so, we create a new rule using the `declarativeNetRequest` API.
The next time the browser sees that domain, it will redirect to the user's local node.


#### _Note on IPFS HTTP API_ access in go-ipfs < 0.13.0

Since we are no longer able to modify request headers in MV3, we need to set
the CORS safelist in our local ipfs node config (`$IPFS_PATH/config`).

**Note:** you will need to replace the `chrome-extension` id with your own.

This will be [fixed](https://github.com/ipfs/go-ipfs/pull/8690) in an upcoming release of go-ipfs 0.13.0.

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
				"http://localhost:3000",
				"http://127.0.0.1:5001",
				"https://webui.ipfs.io",
				"http://webui.ipfs.io.ipns.localhost:8080"
			]
		}
	},
```
