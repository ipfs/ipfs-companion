# Security Considerations

The Firefox platform has no mechanisms to restrict the privileges of add-ons
and add-on code is fully trusted by Firefox.

Security-conscious users should confirm that downloaded XPI package does match source code BEFORE installation.

Required steps:

1. Download XPI package in version that is to be verified
2. Checkout sources of the [same tag](https://github.com/ipfs/ipfs-companion/tags)
2. Build XPI package from sources using `jpm xpi` command (`npm install jpm -g`).    
   As a result, you will have two XPI files which are in fact just ZIPs with different extension.   
3. Unzip contents and compare manually or use handy one-liners below.

Convention used in commands below:
- `ipfs-firefox-addon1.xpi` and `ipfs-firefox-addon2.xpi` are equal and match Git sources
-  `ipfs-firefox-addon3.xpi` contains changes not present in current sources

### Compare SHA-256

Note that XPIs are unzipped before being piped to `sha256sum`:
```bash
$ diff -q <(unzip -p  ipfs-firefox-addon1.xpi|sha256sum|cut -f1 -d' ') <(unzip -p  ipfs-firefox-addon3.xpi|sha256sum|cut -f1 -d' ') && echo same || echo not_same
```

Sample output for files with matching contents:
```bash
$ diff <(unzip -v -l ipfs-firefox-addon1.xpi | cut -c 1-9,59-,49-57 | sort -k3) <(unzip -v -l ipfs-firefox-addon2.xpi | cut -c 1-9,59-,49-57 | sort -k3)  && echo same || echo not_same
same

```

Sample output for files with different contents:
```bash
$ diff -q <(unzip -p  ipfs-firefox-addon1.xpi|sha256sum|cut -f1 -d' ') <(unzip -p  ipfs-firefox-addon3.xpi|sha256sum|cut -f1 -d' ') && echo same || echo not_same
Files /proc/self/fd/11 and /proc/self/fd/12 differ
not_same
```

### Inspect differences

It is possible to list package contents with CRC-32 checksums provided by ZIP container:
```bash
$ unzip -v -l ipfs-firefox-addon1.xpi | cut -c 1-9,59-,49-57 | sort -k3
```
To compare two packages in one command:
```bash
$ diff <(unzip -v -l ipfs-firefox-addon1.xpi | cut -c 1-9,59-,49-57 | sort -k3) <(unzip -v -l ipfs-firefox-addon3.xpi | cut -c 1-9,59-,49-57 | sort -k3) && echo same || echo not_same
```

Sample output for two different versions of XPI:
```diff
$ diff <(unzip -v -l ipfs-firefox-addon1.xpi | cut -c 1-9,59-,49-57 | sort -k3) <(unzip -v -l ipfs-firefox-addon3.xpi | cut -c 1-9,59-,49-57 | sort -k3) && echo same || echo not_same
5,7c5,7
<      174 d991ba90 defaults/preferences/prefs.js
<    37615          30 files
<     2270 06d511c2 harness-options.json
---
>      225 5b287a38 defaults/preferences/prefs.js
>    38998          30 files
>     2315 6291e716 harness-options.json
13c13
<      385 c2c13711 options.xul
---
>      513 4f3e0732 options.xul
33,34c33,34
<     6376 45297f28 resources/ipfs-firefox-addon/lib/index.js
<      966 e48f0540 resources/ipfs-firefox-addon/lib/package.json
---
>     7517 7565d9af resources/ipfs-firefox-addon/lib/index.js
>      984 83079aef resources/ipfs-firefox-addon/lib/package.json
not_same
```

