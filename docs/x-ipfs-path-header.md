# `x-ipfs-path` Header Support in IPFS Companion

> ### **TL;DR** Companion will upgrade request to IPFS if the header is found in HTTP response headers

## Overview

HTTP Gateways return `x-ipfs-path` header with every response. The value of the
header is IPFS path of returned payload.

WebExtension API [onHeadersReceived][] allows for cancelling and redirecting
HTTP request when response headers start arriving. In case of redirect it means
dropping the old connection before actual payload is read, avoiding duplicate
reads of the same data.

Detection of `x-ipfs-path` header is enabled by default on _Preferences_ screen.

## Use Cases

### Fallback for edge cases when IPFS path is not present in URL

It is possible for website owner to put HTTP Gateway behind reverse-proxy and
set it up to expose `/ipfs/<cid>/` under `/`, in which case path-based IPFS
detection, done by IPFS Companion in [onBeforeRequest][], will not work.

Thanks to `x-ipfs-path` header we have a reliable fallback for those setups.

### Reliable hint for doing DNSLink lookup

Presence of `x-ipfs-path` header is a clear indicator website uses IPFS.

There is a "best-effort" [DNSLink policy][] enabled by default to execute blocking DNS TXT lookups for FQDNs that returned the header.

Note: `x-ipfs-path` starting with `/ipns/` will be ignored if [DNSLink policy][] is "off" or DNS TXT record is missing.

----

#### See Also:

- Context for `onBeforeRequest` and `onHeadersReceived`: [WebExtensions API: webRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest)
- Notes on [DNSLink policy][] in IPFS Companion

[dnslink policy]: dnslink.md
[onBeforeRequest]: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeRequest
[onHeadersReceived]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onHeadersReceived
