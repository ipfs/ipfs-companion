# DNSLink Support in IPFS Companion

> ### **TL;DR** when in doubt, enable DNSLink with "Lookup on `x-ipfs-path`" policy


## What is DNSLink?

DNSLink is mapping a domain name to an IPFS address by means of DNS TXT record.

Read [DNSLink guide][] for details such as setting it up on yourown website.

## DNS TXT Lookup Policies in Companion

### Disabled (No Lookup)

There will be no DNS TXT lookups when this policy is selected.    
It means DNSLink support is disabled.

### Lookup on `x-ipfs-path`

This is the most efficient lookup strategy.

DNSLink redirect is enabled, but DNS TXT lookups are executed only for domains
which returned at least one HTTP response
with [x-ipfs-path header][] or returned a connection error.

Note: initial request is cancelled as soon header is detected and redirected to
IPNS as well.

### Eager Lookup for Every Hostname

DNS TXT lookup is executed for every hostname before any HTTP request is made.

It removes the need for sending HTTP request to remote server if DNSLink is
present, but may impact browser performance: every request to a new domain name
will be blocked until TXT lookup is finished.

There is a room for improvement: web browsers do not expose efficient DNS TXT
lookup API ([yet][bug1449171]) and HTTP-based lookups via `/api/v0/dns/${fqdn}`
with userland caching are used as a fallback.

## DNS TXT Caching

Results of DNS TXT lookups are stored in a [LRU](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_Recently_Used) cache of size 1000 and max-age 12h.

The cache is in-memory and is not persisted between restarts.

----

#### See Also:

- [`x-ipfs-path` Header Support in IPFS Companion](x-ipfs-header.md)
- [Bug 1449171: Add DNS TXT resolution to dns.resolve WebExtensions API][bug1449171]

[dnslink guide]: https://docs.ipfs.io/guides/concepts/dnslink/
[x-ipfs-path header]: x-ipfs-header.md
[DoH]: https://en.wikipedia.org/wiki/DNS_over_HTTPS
[bug1449171]: https://bugzilla.mozilla.org/show_bug.cgi?id=1449171
