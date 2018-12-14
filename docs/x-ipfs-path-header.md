# `x-ipfs-path` Header Support in IPFS Companion

> **TL;DR:** The Companion add-on can redirect traditional HTTP requests to IPFS if the `x-ipfs-path` response header is provided.

## Overview

IPFS HTTP gateways can return an `x-ipfs-path` header with each response. The value of the header is the IPFS path of the returned payload.

The WebExtension API [onHeadersReceived][] can cancel and redirect the HTTP request as soon as the response headers arrive. This means the client can drop the initial request, avoiding duplicate downloads of the content.

The detection of the `x-ipfs-path` header can be disabled in the _Preferences_ screen (but is enabled by default).

## Use Cases

### Fallback for edge cases where the IPFS path is not present in the URL

The website owner can have the HTTP gateway behind a reverse-proxy but configure it to expose `/ipfs/<cid>/` under `/` in which case path-based IPFS detection, by the IPFS Companion add-on (see [onBeforeRequest][]), won't work.

Thanks to the `x-ipfs-path` header we have a reliable fallback for these configurations.

### Hinting DNSLink lookups

The presence of the `x-ipfs-path` header is a clear indicator website uses IPFS.

There is a "best-effort" [DNSLink policy][] enabled by default to execute blocking DNS TXT lookups for FQDNs that returned the header.

Note that `x-ipfs-path` values starting with `/ipns/` will be ignored if [DNSLink policy][] is "off" or the DNS TXT record is missing.

----

See Also:

- An overview of the `onBeforeRequest` and `onHeadersReceived` listeners can be found in the [WebExtensions API: webRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest) documentation.
- Notes on [DNSLink policy][] can be found in the IPFS companion add-on itself.

[dnslink policy]: dnslink.md
[onBeforeRequest]: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeRequest
[onHeadersReceived]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onHeadersReceived
