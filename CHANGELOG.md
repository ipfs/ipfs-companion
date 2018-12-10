## [2.6.3](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.6.2...v2.6.3) (2018-12-10)


### Bug Fixes

* **ci:** switch to nodejs v10.11.0 ([687a4d8](https://github.com/ipfs-shipyard/ipfs-companion/commit/687a4d8))
* **security:** remove  event-stream/flatmap-stream ([d4db63a](https://github.com/ipfs-shipyard/ipfs-companion/commit/d4db63a))
* Origin in API requests under Chromium 72 ([#631](https://github.com/ipfs-shipyard/ipfs-companion/issues/631)) ([8866f76](https://github.com/ipfs-shipyard/ipfs-companion/commit/8866f76))



## [2.6.2](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.6.1...v2.6.2) (2018-11-22)


### Bug Fixes

* disable redirect for CID-in-subdomain ([#617](https://github.com/ipfs-shipyard/ipfs-companion/issues/617)) ([458bf34](https://github.com/ipfs-shipyard/ipfs-companion/commit/458bf34))
* **ci:** run-s: not found ([#620](https://github.com/ipfs-shipyard/ipfs-companion/issues/620)) ([00e87f8](https://github.com/ipfs-shipyard/ipfs-companion/commit/00e87f8))
* Origin in API calls in Firefox-65.0a1 ([#623](https://github.com/ipfs-shipyard/ipfs-companion/issues/623)) ([000e8da](https://github.com/ipfs-shipyard/ipfs-companion/commit/000e8da))


### Features

* Update Web UI to v2.2.0 ([#618](https://github.com/ipfs-shipyard/ipfs-companion/issues/618)) ([9c2b19a](https://github.com/ipfs-shipyard/ipfs-companion/commit/9c2b19a))



## [2.6.1](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.6.0...v2.6.1) (2018-11-08)


### Bug Fixes

* CORS false-positive in Chrome 71 ([#616](https://github.com/ipfs-shipyard/ipfs-companion/issues/616)) ([01e72f2](https://github.com/ipfs-shipyard/ipfs-companion/commit/01e72f2))



# [2.6.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.5.1...v2.6.0) (2018-11-07)


### Bug Fixes

* add support for quic multiaddrs ([#613](https://github.com/ipfs-shipyard/ipfs-companion/issues/613)) ([98134f6](https://github.com/ipfs-shipyard/ipfs-companion/commit/98134f6))
* add support for quic multiaddrs ([#613](https://github.com/ipfs-shipyard/ipfs-companion/issues/613)) ([9225b31](https://github.com/ipfs-shipyard/ipfs-companion/commit/9225b31))
* Chromium crash on 150MB upload ([19cf1dd](https://github.com/ipfs-shipyard/ipfs-companion/commit/19cf1dd))
* **ci:** switch fallback download to public gateway ([4d86259](https://github.com/ipfs-shipyard/ipfs-companion/commit/4d86259))
* edge cases around localhost redirects ([#607](https://github.com/ipfs-shipyard/ipfs-companion/issues/607)) ([b7606ae](https://github.com/ipfs-shipyard/ipfs-companion/commit/b7606ae)), closes [#604](https://github.com/ipfs-shipyard/ipfs-companion/issues/604)
* go back to js-ipfs 0.31.7 ([d79367d](https://github.com/ipfs-shipyard/ipfs-companion/commit/d79367d))
* menu items requiring both api and ipfs context ([1bcaa9d](https://github.com/ipfs-shipyard/ipfs-companion/commit/1bcaa9d))
* pin.ls ignored opts when hash was present ([#608](https://github.com/ipfs-shipyard/ipfs-companion/issues/608)) ([f703392](https://github.com/ipfs-shipyard/ipfs-companion/commit/f703392)), closes [/github.com/ipfs-shipyard/ipfs-companion/issues/360#issuecomment-427525801](https://github.com//github.com/ipfs-shipyard/ipfs-companion/issues/360/issues/issuecomment-427525801) [#360](https://github.com/ipfs-shipyard/ipfs-companion/issues/360)
* reload bundled WebUI on IPFS Client change ([aa616fd](https://github.com/ipfs-shipyard/ipfs-companion/commit/aa616fd))
* remove maps from final bundle ([b170b22](https://github.com/ipfs-shipyard/ipfs-companion/commit/b170b22))
* use random preloader as a fallback ([fd7586f](https://github.com/ipfs-shipyard/ipfs-companion/commit/fd7586f))


### Features

* bundle the new WebUI ([d8fa019](https://github.com/ipfs-shipyard/ipfs-companion/commit/d8fa019))
* context option to Copy Direct CID ([bc35aa7](https://github.com/ipfs-shipyard/ipfs-companion/commit/bc35aa7)), closes [#508](https://github.com/ipfs-shipyard/ipfs-companion/issues/508)
* display revision in ipfs-webui ([a6c4a72](https://github.com/ipfs-shipyard/ipfs-companion/commit/a6c4a72))
* ipfs-webui v2.1.1 ([#611](https://github.com/ipfs-shipyard/ipfs-companion/issues/611)) ([f52749b](https://github.com/ipfs-shipyard/ipfs-companion/commit/f52749b))
* locale sync ([88ff7e6](https://github.com/ipfs-shipyard/ipfs-companion/commit/88ff7e6))
* refresh IPNS webui when API backend changes ([80cfce2](https://github.com/ipfs-shipyard/ipfs-companion/commit/80cfce2))
* separate context  action for links ([f517a3f](https://github.com/ipfs-shipyard/ipfs-companion/commit/f517a3f)), closes [#579](https://github.com/ipfs-shipyard/ipfs-companion/issues/579)
* **locales:** added ko-KR and zh-TW, updated no ([c8bbdb8](https://github.com/ipfs-shipyard/ipfs-companion/commit/c8bbdb8))
* separate labels for Image, Video and Audio ([bd274f7](https://github.com/ipfs-shipyard/ipfs-companion/commit/bd274f7))
* separate submenus for different contexts ([2336d9d](https://github.com/ipfs-shipyard/ipfs-companion/commit/2336d9d))
* smarter filename when adding via context menu ([b6b8638](https://github.com/ipfs-shipyard/ipfs-companion/commit/b6b8638)), closes [#599](https://github.com/ipfs-shipyard/ipfs-companion/issues/599)



## [2.5.1](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.5.0...v2.5.1) (2018-09-24)


### Bug Fixes

* add order to i18n links ([357a678](https://github.com/ipfs-shipyard/ipfs-companion/commit/357a678))
* always visible left column ([c0dc5a3](https://github.com/ipfs-shipyard/ipfs-companion/commit/c0dc5a3))
* check only for recursive pins ([ad84b82](https://github.com/ipfs-shipyard/ipfs-companion/commit/ad84b82)), closes [/github.com/ipfs-shipyard/ipfs-companion/issues/360#issuecomment-380631986](https://github.com//github.com/ipfs-shipyard/ipfs-companion/issues/360/issues/issuecomment-380631986) [#360](https://github.com/ipfs-shipyard/ipfs-companion/issues/360)
* checkbox for panel_headerActiveToggleTitle ([602769e](https://github.com/ipfs-shipyard/ipfs-companion/commit/602769e))
* copy correct url via context menu ([1483862](https://github.com/ipfs-shipyard/ipfs-companion/commit/1483862)), closes [#571](https://github.com/ipfs-shipyard/ipfs-companion/issues/571)
* display landing page after companion init ([6c27519](https://github.com/ipfs-shipyard/ipfs-companion/commit/6c27519))
* i18n page title ([63f581e](https://github.com/ipfs-shipyard/ipfs-companion/commit/63f581e))
* i18n span renderer ([927f958](https://github.com/ipfs-shipyard/ipfs-companion/commit/927f958))
* make global toggle checkbox less ambiguous ([9c823b8](https://github.com/ipfs-shipyard/ipfs-companion/commit/9c823b8))
* pin URL with hash or query ([86760a5](https://github.com/ipfs-shipyard/ipfs-companion/commit/86760a5))
* pr review ([ec578d0](https://github.com/ipfs-shipyard/ipfs-companion/commit/ec578d0))
* pr review ([932084a](https://github.com/ipfs-shipyard/ipfs-companion/commit/932084a))
* remove bogus placeholders from source locale ([aa3c38a](https://github.com/ipfs-shipyard/ipfs-companion/commit/aa3c38a))
* remove indirect placeholder ([84c55db](https://github.com/ipfs-shipyard/ipfs-companion/commit/84c55db))
* remove title from html ([c98b516](https://github.com/ipfs-shipyard/ipfs-companion/commit/c98b516))
* **locale:** remove remapping of zh ([b7c0c5e](https://github.com/ipfs-shipyard/ipfs-companion/commit/b7c0c5e))
* replace youtube thumbnail host with IPFS ([1d609cf](https://github.com/ipfs-shipyard/ipfs-companion/commit/1d609cf))
* skip x-ipfs-path processing on active gateway ([b4cead0](https://github.com/ipfs-shipyard/ipfs-companion/commit/b4cead0))
* **locale:** rename zh to zh_CN ([40412e3](https://github.com/ipfs-shipyard/ipfs-companion/commit/40412e3))
* slow window.ipfs.files.add in Firefox ([6f6e5b3](https://github.com/ipfs-shipyard/ipfs-companion/commit/6f6e5b3))
* support gateway at localhost:80 ([dca067f](https://github.com/ipfs-shipyard/ipfs-companion/commit/dca067f))


### Features

* add i18n ([c13159d](https://github.com/ipfs-shipyard/ipfs-companion/commit/c13159d))
* Add selected text to IPFS ([27447b7](https://github.com/ipfs-shipyard/ipfs-companion/commit/27447b7)), closes [#569](https://github.com/ipfs-shipyard/ipfs-companion/issues/569)
* add Transifex config file ([5a070e1](https://github.com/ipfs-shipyard/ipfs-companion/commit/5a070e1))
* Chech and French locales ([f588802](https://github.com/ipfs-shipyard/ipfs-companion/commit/f588802))
* German - 100% translated ([40fd1a7](https://github.com/ipfs-shipyard/ipfs-companion/commit/40fd1a7))
* open landing page on first install ([b2fe74a](https://github.com/ipfs-shipyard/ipfs-companion/commit/b2fe74a))



# [2.5.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.4.4...v2.5.0) (2018-09-07)


### Bug Fixes

* **ci:** set 1h timeout for every build ([b7ef993](https://github.com/ipfs-shipyard/ipfs-companion/commit/b7ef993)), closes [/github.com/ipfs/jenkins-libs/blob/e758b80e3347a276a73cd4d463a03c0cc89995cd/vars/javascript.groovy#L212](https://github.com//github.com/ipfs/jenkins-libs/blob/e758b80e3347a276a73cd4d463a03c0cc89995cd/vars/javascript.groovy/issues/L212)
* **ci:** switch Docker to Node v10.4.1 ([d6d5934](https://github.com/ipfs-shipyard/ipfs-companion/commit/d6d5934))
* **ci:** switch Jenkins to Node v10.4.1 ([6967ef7](https://github.com/ipfs-shipyard/ipfs-companion/commit/6967ef7))
* **dnslink:** could not resolve name (recursion limit exceeded) ([4be3504](https://github.com/ipfs-shipyard/ipfs-companion/commit/4be3504)), closes [/github.com/ipfs/go-ipfs/issues/4293#issuecomment-416310364](https://github.com//github.com/ipfs/go-ipfs/issues/4293/issues/issuecomment-416310364)
* **dnslink:** recover from HTTP timeout ([d8dd8d7](https://github.com/ipfs-shipyard/ipfs-companion/commit/d8dd8d7))
* **dnslink:** try to recover only from final errors ([a433684](https://github.com/ipfs-shipyard/ipfs-companion/commit/a433684))
* 'invalid Read on closed Body' in files.add under Chrome ([ff20fb0](https://github.com/ipfs-shipyard/ipfs-companion/commit/ff20fb0)), closes [/github.com/ipfs-shipyard/ipfs-companion/issues/480#issuecomment-417657758](https://github.com//github.com/ipfs-shipyard/ipfs-companion/issues/480/issues/issuecomment-417657758)
* drag & drop uploads ([d8fd3b3](https://github.com/ipfs-shipyard/ipfs-companion/commit/d8fd3b3))
* update share checkbox arrows ([e580662](https://github.com/ipfs-shipyard/ipfs-companion/commit/e580662))


### Features

* cache DNSLink lookups for 12h ([53e2891](https://github.com/ipfs-shipyard/ipfs-companion/commit/53e2891))
* poc dnslink policy with x-ipfs-header ([a02f801](https://github.com/ipfs-shipyard/ipfs-companion/commit/a02f801))
* poc lazy dnslink ([0e77766](https://github.com/ipfs-shipyard/ipfs-companion/commit/0e77766))



## [2.4.4](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.4.3...v2.4.4) (2018-08-01)


### Bug Fixes

* **linkify:** do not wrap ignore false-positives ([890ccd5](https://github.com/ipfs-shipyard/ipfs-companion/commit/890ccd5)), closes [#539](https://github.com/ipfs-shipyard/ipfs-companion/issues/539)
* pinning of IPNS paths ([68bb194](https://github.com/ipfs-shipyard/ipfs-companion/commit/68bb194))



## [2.4.3](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.4.2...v2.4.3) (2018-07-25)


### Bug Fixes

* always scope dest arg in window.ipfs.files.cp ([f5b43a9](https://github.com/ipfs-shipyard/ipfs-companion/commit/f5b43a9)), closes [/github.com/ipfs-shipyard/ipfs-companion/pull/531#pullrequestreview-139053285](https://github.com//github.com/ipfs-shipyard/ipfs-companion/pull/531/issues/pullrequestreview-139053285)
* change minimizer flags to follow AEgir ([27a1dce](https://github.com/ipfs-shipyard/ipfs-companion/commit/27a1dce))
* do not prefix /ipfs/ source paths in window.ipfs.files.cp ([e16709c](https://github.com/ipfs-shipyard/ipfs-companion/commit/e16709c))
* files.cp|mv scoping for new syntax ([109565f](https://github.com/ipfs-shipyard/ipfs-companion/commit/109565f)), closes [/github.com/ipfs-shipyard/ipfs-companion/issues/530#issuecomment-405168177](https://github.com//github.com/ipfs-shipyard/ipfs-companion/issues/530/issues/issuecomment-405168177)
* run linkify checks on entire parent tree ([a5b047d](https://github.com/ipfs-shipyard/ipfs-companion/commit/a5b047d))
* skip dnslink redirect for /ipfs/ paths ([bdad459](https://github.com/ipfs-shipyard/ipfs-companion/commit/bdad459))


### Features

* enable pinning with embedded js-ips node ([1fd72d4](https://github.com/ipfs-shipyard/ipfs-companion/commit/1fd72d4)), closes [#525](https://github.com/ipfs-shipyard/ipfs-companion/issues/525)
* support page actions for CID subdomains ([a0c0ca8](https://github.com/ipfs-shipyard/ipfs-companion/commit/a0c0ca8))
* upgrade to js-ipfs 0.30 ([6ca51df](https://github.com/ipfs-shipyard/ipfs-companion/commit/6ca51df))



## [2.4.2](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.4.1...v2.4.2) (2018-07-06)


### Bug Fixes

* additional checks for CORS XHR when dnslink is enabled ([a967a62](https://github.com/ipfs-shipyard/ipfs-companion/commit/a967a62))


### Features

* menu item to ipfs.addFromURL and keep filename ([35f1311](https://github.com/ipfs-shipyard/ipfs-companion/commit/35f1311))



## [2.4.1](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.4.0...v2.4.1) (2018-07-04)


### Bug Fixes

* cleanup on webRequest.onErrorOccurred ([0f11332](https://github.com/ipfs-shipyard/ipfs-companion/commit/0f11332))
* icons hover ([ca9bca8](https://github.com/ipfs-shipyard/ipfs-companion/commit/ca9bca8))
* preload request uses opt-out hint ([2bfda53](https://github.com/ipfs-shipyard/ipfs-companion/commit/2bfda53))
* rate-limiting Linkify experiment ([584ce0d](https://github.com/ipfs-shipyard/ipfs-companion/commit/584ce0d)), closes [#503](https://github.com/ipfs-shipyard/ipfs-companion/issues/503)
* restore gateway redirect for CORS XHR in Firefox ([db1a5f4](https://github.com/ipfs-shipyard/ipfs-companion/commit/db1a5f4))
* restore gateway redirect of HEAD requests ([910125e](https://github.com/ipfs-shipyard/ipfs-companion/commit/910125e))
* upload workaround for a bug in go-ipfs ([ac62df3](https://github.com/ipfs-shipyard/ipfs-companion/commit/ac62df3)), closes [#509](https://github.com/ipfs-shipyard/ipfs-companion/issues/509)
* upload workaround for a bug in go-ipfs ([b1bf771](https://github.com/ipfs-shipyard/ipfs-companion/commit/b1bf771))
* x-ipfs-companion-no-redirect examples in README ([f0d0336](https://github.com/ipfs-shipyard/ipfs-companion/commit/f0d0336)), closes [/github.com/ipfs-shipyard/ipfs-companion/pull/510#pullrequestreview-133557233](https://github.com//github.com/ipfs-shipyard/ipfs-companion/pull/510/issues/pullrequestreview-133557233)


### Features

* meaningful error in redirect-based URI handler ([a6e53ba](https://github.com/ipfs-shipyard/ipfs-companion/commit/a6e53ba))
* support redirect opt-out hint in URLs ([6ea409d](https://github.com/ipfs-shipyard/ipfs-companion/commit/6ea409d))



# [2.4.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.3.1...v2.4.0) (2018-06-26)


### Bug Fixes

* addFromURL with URL-escaped file names ([4870354](https://github.com/ipfs-shipyard/ipfs-companion/commit/4870354))
* avoid UI jitter by keeping disabled menu items ([8bc5b7a](https://github.com/ipfs-shipyard/ipfs-companion/commit/8bc5b7a)), closes [/github.com/ipfs-shipyard/ipfs-companion/pull/500#issuecomment-397900418](https://github.com//github.com/ipfs-shipyard/ipfs-companion/pull/500/issues/issuecomment-397900418)
* avoid window.ipfs in non-HTML context ([4482b40](https://github.com/ipfs-shipyard/ipfs-companion/commit/4482b40))
* change script name to webpack bundle ([3c53eb5](https://github.com/ipfs-shipyard/ipfs-companion/commit/3c53eb5))
* disable sharing action when upload is not possible ([8f2a719](https://github.com/ipfs-shipyard/ipfs-companion/commit/8f2a719)), closes [#477](https://github.com/ipfs-shipyard/ipfs-companion/issues/477)
* do not redirect preload requests ([1492d8d](https://github.com/ipfs-shipyard/ipfs-companion/commit/1492d8d))
* faded diagnostics in inactive state ([dad0286](https://github.com/ipfs-shipyard/ipfs-companion/commit/dad0286)), closes [/github.com/ipfs-shipyard/ipfs-companion/pull/500#issuecomment-397577842](https://github.com//github.com/ipfs-shipyard/ipfs-companion/pull/500/issues/issuecomment-397577842)
* Fix addon-linter error for /content_scripts ([f3e3628](https://github.com/ipfs-shipyard/ipfs-companion/commit/f3e3628))
* hide unavailable actions in incognito mode ([29d7bb1](https://github.com/ipfs-shipyard/ipfs-companion/commit/29d7bb1))
* hide unused options when embedded node is active ([7706f62](https://github.com/ipfs-shipyard/ipfs-companion/commit/7706f62))
* limit the CORS workaround to Firefox ([8a713cd](https://github.com/ipfs-shipyard/ipfs-companion/commit/8a713cd)), closes [/github.com/ipfs-shipyard/ipfs-companion/pull/494#issuecomment-394647930](https://github.com//github.com/ipfs-shipyard/ipfs-companion/pull/494/issues/issuecomment-394647930)
* make action icons actionable in suspended state ([19ba4ac](https://github.com/ipfs-shipyard/ipfs-companion/commit/19ba4ac)), closes [/github.com/ipfs-shipyard/ipfs-companion/pull/500#issuecomment-398695644](https://github.com//github.com/ipfs-shipyard/ipfs-companion/pull/500/issues/issuecomment-398695644)
* release v2.3.1.9890 to Firefox Beta Channel ([e39a0a6](https://github.com/ipfs-shipyard/ipfs-companion/commit/e39a0a6))
* save vertical space by moving on/off toggle ([8b2197b](https://github.com/ipfs-shipyard/ipfs-companion/commit/8b2197b)), closes [/github.com/ipfs-shipyard/ipfs-companion/pull/500#issuecomment-398048452](https://github.com//github.com/ipfs-shipyard/ipfs-companion/pull/500/issues/issuecomment-398048452)
* skip content script injection when inactive ([1d29ba9](https://github.com/ipfs-shipyard/ipfs-companion/commit/1d29ba9))
* skip XHRs that would fail due to CORS bug ([231df22](https://github.com/ipfs-shipyard/ipfs-companion/commit/231df22)), closes [/github.com/ipfs-shipyard/ipfs-companion/issues/436#issuecomment-378254294](https://github.com//github.com/ipfs-shipyard/ipfs-companion/issues/436/issues/issuecomment-378254294)


### Features

* add global toggle to Preferences screen ([a7851d2](https://github.com/ipfs-shipyard/ipfs-companion/commit/a7851d2))
* add icon row with quick actions ([15eb284](https://github.com/ipfs-shipyard/ipfs-companion/commit/15eb284)), closes [/github.com/ipfs-shipyard/ipfs-companion/pull/500#issuecomment-398402554](https://github.com//github.com/ipfs-shipyard/ipfs-companion/pull/500/issues/issuecomment-398402554)
* global ON / OFF switch ([9f67a30](https://github.com/ipfs-shipyard/ipfs-companion/commit/9f67a30))
* improved webpack progress reporting ([fb973d8](https://github.com/ipfs-shipyard/ipfs-companion/commit/fb973d8))
* use browser.contentScripts API in Firefox ([52b0190](https://github.com/ipfs-shipyard/ipfs-companion/commit/52b0190)), closes [/github.com/ipfs-shipyard/ipfs-companion/issues/362#issuecomment-362231167](https://github.com//github.com/ipfs-shipyard/ipfs-companion/issues/362/issues/issuecomment-362231167)
* wrapped uploads with js-ipfs v0.29.0 ([c38ac36](https://github.com/ipfs-shipyard/ipfs-companion/commit/c38ac36)), closes [#482](https://github.com/ipfs-shipyard/ipfs-companion/issues/482)



# [2.3.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.2.2...v2.3.0) (2018-05-24)


### Bug Fixes

* add validation of dir-wrapped ipfs.files.add ([45ccfca](https://github.com/ipfs-shipyard/ipfs-companion/commit/45ccfca))
* avoid crashing extension in Chrome ([cda171e](https://github.com/ipfs-shipyard/ipfs-companion/commit/cda171e))
* correct manifest for firefox beta bundle ([2b8026d](https://github.com/ipfs-shipyard/ipfs-companion/commit/2b8026d))
* hide upload options by default ([ece5d10](https://github.com/ipfs-shipyard/ipfs-companion/commit/ece5d10))
* introduce global whitelist for window.ipfs ([6c4c51f](https://github.com/ipfs-shipyard/ipfs-companion/commit/6c4c51f)), closes [#478](https://github.com/ipfs-shipyard/ipfs-companion/issues/478) [#452](https://github.com/ipfs-shipyard/ipfs-companion/issues/452)
* remove styling from locale label ([0abaf20](https://github.com/ipfs-shipyard/ipfs-companion/commit/0abaf20))
* restrict window.ipfs to Secure Contexts ([375f2c2](https://github.com/ipfs-shipyard/ipfs-companion/commit/375f2c2))
* workaround FILE_TOO_LARGE via factor-bundle ([c6840f7](https://github.com/ipfs-shipyard/ipfs-companion/commit/c6840f7))


### Features

* Share multiple files at once ([35384e1](https://github.com/ipfs-shipyard/ipfs-companion/commit/35384e1))
* Support wrapWithDirectory in Quick Upload ([6fc89d6](https://github.com/ipfs-shipyard/ipfs-companion/commit/6fc89d6)), closes [#349](https://github.com/ipfs-shipyard/ipfs-companion/issues/349)
* upload screen improvements ([9fbe63f](https://github.com/ipfs-shipyard/ipfs-companion/commit/9fbe63f))



## [2.2.2](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.2.1...v2.2.2) (2018-05-07)


### Bug Fixes

* forwards all postmsg-rpc messages between content script and background, and upgrade ipfs-postmsg-proxy with fix for pull-postmsg-stream ([69eb3a1](https://github.com/ipfs-shipyard/ipfs-companion/commit/69eb3a1))
* make tests work on windows ([4181d53](https://github.com/ipfs-shipyard/ipfs-companion/commit/4181d53))
* update yarn lock file. ([73eb7cc](https://github.com/ipfs-shipyard/ipfs-companion/commit/73eb7cc))


### Features

* create and use IpfsApiAccessError ([237cffb](https://github.com/ipfs-shipyard/ipfs-companion/commit/237cffb))
* refactor api-access error ([cf4241d](https://github.com/ipfs-shipyard/ipfs-companion/commit/cf4241d))
* update console.log in window.ipfs error example ([a840622](https://github.com/ipfs-shipyard/ipfs-companion/commit/a840622))
* use path-browserify instead of builtin path. ([ce7e71a](https://github.com/ipfs-shipyard/ipfs-companion/commit/ce7e71a))



## [2.2.1](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.2.0...v2.2.1) (2018-04-12)



# [2.2.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.1.0...v2.2.0) (2018-04-06)


### Bug Fixes

* [#329](https://github.com/ipfs-shipyard/ipfs-companion/issues/329) - Add explicit color styles ([8f7b96c](https://github.com/ipfs-shipyard/ipfs-companion/commit/8f7b96c))
* Big.js serialization problem ([c380100](https://github.com/ipfs-shipyard/ipfs-companion/commit/c380100))
* Firefox for Android ([2c43e75](https://github.com/ipfs-shipyard/ipfs-companion/commit/2c43e75)), closes [#356](https://github.com/ipfs-shipyard/ipfs-companion/issues/356)
* link to window.ipfs fallback demo ([9563ccd](https://github.com/ipfs-shipyard/ipfs-companion/commit/9563ccd))
* multi permisison dialogs for the same permission ([37d8f9b](https://github.com/ipfs-shipyard/ipfs-companion/commit/37d8f9b))
* notification error on pin/unpin ([6081df0](https://github.com/ipfs-shipyard/ipfs-companion/commit/6081df0)), closes [#338](https://github.com/ipfs-shipyard/ipfs-companion/issues/338) [#318](https://github.com/ipfs-shipyard/ipfs-companion/issues/318)
* popup render issue in Chrome on Mac ([6fdb91e](https://github.com/ipfs-shipyard/ipfs-companion/commit/6fdb91e)), closes [428044#c13](https://github.com/428044/issues/c13) [#318](https://github.com/ipfs-shipyard/ipfs-companion/issues/318)
* reduce menu render jank ([e383605](https://github.com/ipfs-shipyard/ipfs-companion/commit/e383605))
* response for multiple acl dialogs get mixed up ([ca758a6](https://github.com/ipfs-shipyard/ipfs-companion/commit/ca758a6))
* switch default URLs to 'localhost' ([27c6d76](https://github.com/ipfs-shipyard/ipfs-companion/commit/27c6d76)), closes [#291](https://github.com/ipfs-shipyard/ipfs-companion/issues/291)


### Features

* **firefox>59:** no prefix for redir protocols ([bb5a00a](https://github.com/ipfs-shipyard/ipfs-companion/commit/bb5a00a)), closes [/github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-355708883](https://github.com//github.com/ipfs-shipyard/ipfs-companion/issues/164/issues/issuecomment-355708883)
* upgrades ipfs-postmsg-proxy to 2.13.0 ([5736a93](https://github.com/ipfs-shipyard/ipfs-companion/commit/5736a93))



# [2.1.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.0.15...v2.1.0) (2017-11-26)


### Bug Fixes

* **protocols:** bad path to normalizeLinksWithUnhandledProtocols ([af0a428](https://github.com/ipfs-shipyard/ipfs-companion/commit/af0a428)), closes [#316](https://github.com/ipfs-shipyard/ipfs-companion/issues/316)
* **quickupload:** close browser action popup on click ([8d19a3b](https://github.com/ipfs-shipyard/ipfs-companion/commit/8d19a3b))



## [2.0.15](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.0.14...v2.0.15) (2017-11-11)


### Bug Fixes

* CSS fixes for Android ([a5fa00b](https://github.com/ipfs-shipyard/ipfs-companion/commit/a5fa00b)), closes [#109](https://github.com/ipfs-shipyard/ipfs-companion/issues/109)
* **pinning:** paths with URL-unsafe characters ([e8b4c9e](https://github.com/ipfs-shipyard/ipfs-companion/commit/e8b4c9e)), closes [#303](https://github.com/ipfs-shipyard/ipfs-companion/issues/303)
* **security:** remove URL shortener experiment ([15e7168](https://github.com/ipfs-shipyard/ipfs-companion/commit/15e7168)), closes [#305](https://github.com/ipfs-shipyard/ipfs-companion/issues/305)


### Features

* PoC URL Shortener ([2648c22](https://github.com/ipfs-shipyard/ipfs-companion/commit/2648c22))
* **dnslink:** redirect to IPNS path ([ba7cb53](https://github.com/ipfs-shipyard/ipfs-companion/commit/ba7cb53)), closes [#298](https://github.com/ipfs-shipyard/ipfs-companion/issues/298)



## [2.0.14](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.0.13...v2.0.14) (2017-10-16)


### Features

* restore copy items in page context menu ([abab537](https://github.com/ipfs-shipyard/ipfs-companion/commit/abab537)), closes [#294](https://github.com/ipfs-shipyard/ipfs-companion/issues/294)
* **contextMenus:** support image, video, audio, link ([12c5526](https://github.com/ipfs-shipyard/ipfs-companion/commit/12c5526)), closes [#294](https://github.com/ipfs-shipyard/ipfs-companion/issues/294)



## [2.0.13](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.0.12...v2.0.13) (2017-10-10)


### Bug Fixes

* exclude ':' from the end of linkified text ([b4384fe](https://github.com/ipfs-shipyard/ipfs-companion/commit/b4384fe))
* **dnslink:** skip URLs that could produce infinite recursion ([9eda0bf](https://github.com/ipfs-shipyard/ipfs-companion/commit/9eda0bf)), closes [/github.com/ipfs/ipfs-companion/issues/286#issuecomment-335553288](https://github.com//github.com/ipfs/ipfs-companion/issues/286/issues/issuecomment-335553288)



## [2.0.12](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.0.11...v2.0.12) (2017-10-10)


### Bug Fixes

* **linkifyDOM:** remove unnecessary DOM mutations ([27819e0](https://github.com/ipfs-shipyard/ipfs-companion/commit/27819e0))


### Features

* normalize dweb: in `href` and `src` ([4ed94bf](https://github.com/ipfs-shipyard/ipfs-companion/commit/4ed94bf)), closes [#286](https://github.com/ipfs-shipyard/ipfs-companion/issues/286)



## [2.0.11](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.0.10...v2.0.11) (2017-10-08)


### Bug Fixes

* optimize mayContainUnhandledIpfsProtocol ([85f7af3](https://github.com/ipfs-shipyard/ipfs-companion/commit/85f7af3))
* **browserAction:** improved support for HiDPI ([8a43015](https://github.com/ipfs-shipyard/ipfs-companion/commit/8a43015)), closes [#125](https://github.com/ipfs-shipyard/ipfs-companion/issues/125)
* **onBeforeRequest:** too much recursion ([64c498e](https://github.com/ipfs-shipyard/ipfs-companion/commit/64c498e))


### Features

* Option to customize Default Public Gateway ([6bb4ba1](https://github.com/ipfs-shipyard/ipfs-companion/commit/6bb4ba1)), closes [#284](https://github.com/ipfs-shipyard/ipfs-companion/issues/284)
* proper /ipns/ validation ([7d9a1f2](https://github.com/ipfs-shipyard/ipfs-companion/commit/7d9a1f2)), closes [/github.com/ipfs/ipfs-companion/issues/16#issuecomment-331121999](https://github.com//github.com/ipfs/ipfs-companion/issues/16/issues/issuecomment-331121999) [#69](https://github.com/ipfs-shipyard/ipfs-companion/issues/69)
* **options:** URL validation in Preferences ([3565061](https://github.com/ipfs-shipyard/ipfs-companion/commit/3565061))
* reset all preferences to default values ([7759546](https://github.com/ipfs-shipyard/ipfs-companion/commit/7759546))



## [2.0.10](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.0.9...v2.0.10) (2017-09-27)


### Bug Fixes

* more strict custom protocols ([c7285e8](https://github.com/ipfs-shipyard/ipfs-companion/commit/c7285e8)), closes [/github.com/ipfs/ipfs-companion/pull/283#issuecomment-330058239](https://github.com//github.com/ipfs/ipfs-companion/pull/283/issues/issuecomment-330058239)


### Features

* linkify only officially supported custom protocols ([93c794d](https://github.com/ipfs-shipyard/ipfs-companion/commit/93c794d)), closes [#280](https://github.com/ipfs-shipyard/ipfs-companion/issues/280) [/github.com/ipfs/ipfs-companion/pull/283#issuecomment-330005791](https://github.com//github.com/ipfs/ipfs-companion/pull/283/issues/issuecomment-330005791) [#231](https://github.com/ipfs-shipyard/ipfs-companion/issues/231)
* option to disable daemon online/offline notifications ([7d3a5e0](https://github.com/ipfs-shipyard/ipfs-companion/commit/7d3a5e0)), closes [#282](https://github.com/ipfs-shipyard/ipfs-companion/issues/282)
* Poor Man's Protocol Handlers ([1e62c9d](https://github.com/ipfs-shipyard/ipfs-companion/commit/1e62c9d)), closes [/github.com/ipfs/ipfs-companion/issues/164#issuecomment-328374052](https://github.com//github.com/ipfs/ipfs-companion/issues/164/issues/issuecomment-328374052)



## [2.0.9](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.0.8...v2.0.9) (2017-09-12)


### Bug Fixes

* **options:** disable spellcheck in textarea ([54d0bcd](https://github.com/ipfs-shipyard/ipfs-companion/commit/54d0bcd))
* **package:** remove unsafe-eval ([e3d9669](https://github.com/ipfs-shipyard/ipfs-companion/commit/e3d9669)), closes [#269](https://github.com/ipfs-shipyard/ipfs-companion/issues/269)
* linkify text nodes without whitespace padding ([fa673ea](https://github.com/ipfs-shipyard/ipfs-companion/commit/fa673ea)), closes [#275](https://github.com/ipfs-shipyard/ipfs-companion/issues/275)


### Features

* **automaticMode:** toggle redirect only when API is going online/offline ([a1aca04](https://github.com/ipfs-shipyard/ipfs-companion/commit/a1aca04)), closes [#274](https://github.com/ipfs-shipyard/ipfs-companion/issues/274)
* add CID support ([3b5ed39](https://github.com/ipfs-shipyard/ipfs-companion/commit/3b5ed39)), closes [#275](https://github.com/ipfs-shipyard/ipfs-companion/issues/275)



## [2.0.8](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.10...v2.0.8) (2017-07-26)


### Bug Fixes

* cross-platform commands in npm package scripts ([e3708a0](https://github.com/ipfs-shipyard/ipfs-companion/commit/e3708a0))
* remove dupliate task names from TravisCI ([585825c](https://github.com/ipfs-shipyard/ipfs-companion/commit/585825c))
* **contextMenu:** display help when upload fails due to Tracking Protection ([f44f564](https://github.com/ipfs-shipyard/ipfs-companion/commit/f44f564)), closes [#227](https://github.com/ipfs-shipyard/ipfs-companion/issues/227)
* tavisCI workaround for node-webcrypto-ossl@1.0.7 ([89a89b1](https://github.com/ipfs-shipyard/ipfs-companion/commit/89a89b1))
* **browserAction:** do not redirect WebUI ([3c7148b](https://github.com/ipfs-shipyard/ipfs-companion/commit/3c7148b))
* **browserAction:** hide quick upload when no peers ([3b7cde7](https://github.com/ipfs-shipyard/ipfs-companion/commit/3b7cde7))
* **browserAction:** hide redirect controls in automatic mode ([49a8d6a](https://github.com/ipfs-shipyard/ipfs-companion/commit/49a8d6a))
* **browserAction:** hide WebUI link when API is down ([1eed541](https://github.com/ipfs-shipyard/ipfs-companion/commit/1eed541))
* **browserAction:** Quick Upload retry via explicit file input ([13d1921](https://github.com/ipfs-shipyard/ipfs-companion/commit/13d1921))
* **browserAction:** switch to Buffer bundled with ipfs-api ([d4e6e7b](https://github.com/ipfs-shipyard/ipfs-companion/commit/d4e6e7b))
* **locales:** remove `-` from key names ([ce2c218](https://github.com/ipfs-shipyard/ipfs-companion/commit/ce2c218)), closes [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)
* **options:** normalize api and gw URLs on start ([1b10d67](https://github.com/ipfs-shipyard/ipfs-companion/commit/1b10d67))
* **options:** show checkboxes in Firefox 55 ([447a2ca](https://github.com/ipfs-shipyard/ipfs-companion/commit/447a2ca)), closes [#257](https://github.com/ipfs-shipyard/ipfs-companion/issues/257)
* **package:** remove dependency on sinon-chai ([f98debe](https://github.com/ipfs-shipyard/ipfs-companion/commit/f98debe))
* **package:** update is-ipfs to version 0.3.0 ([#196](https://github.com/ipfs-shipyard/ipfs-companion/issues/196)) ([0a9ec55](https://github.com/ipfs-shipyard/ipfs-companion/commit/0a9ec55))
* **package:** update lru_map to version 0.3.3 ([5db4c4e](https://github.com/ipfs-shipyard/ipfs-companion/commit/5db4c4e))
* **pageAction:** Copy Public Gateway URL ([b2525ba](https://github.com/ipfs-shipyard/ipfs-companion/commit/b2525ba)), closes [#217](https://github.com/ipfs-shipyard/ipfs-companion/issues/217)
* **quickUpload:** Unsafe assignment to innerHTML ([0ae21a7](https://github.com/ipfs-shipyard/ipfs-companion/commit/0ae21a7))
* **wx:** add browser object via webextension-polyfill ([cb6d239](https://github.com/ipfs-shipyard/ipfs-companion/commit/cb6d239)), closes [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)
* **wx:** browser-agnostic CSS for browserAction ([55490d2](https://github.com/ipfs-shipyard/ipfs-companion/commit/55490d2)), closes [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)
* **wx:** Chromium uses raster as browserAction icon ([6432fc8](https://github.com/ipfs-shipyard/ipfs-companion/commit/6432fc8)), closes [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)
* **wx:** fix Chrome error caused by i18 placeholders ([98d3946](https://github.com/ipfs-shipyard/ipfs-companion/commit/98d3946)), closes [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)
* **wx:** fix version format in manifest ([f8a15c3](https://github.com/ipfs-shipyard/ipfs-companion/commit/f8a15c3)), closes [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)
* **wx:** merge pageAction into browserAction ([a3650cd](https://github.com/ipfs-shipyard/ipfs-companion/commit/a3650cd)), closes [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)
* **wx:** Origin mismatch under Chromium ([0afb113](https://github.com/ipfs-shipyard/ipfs-companion/commit/0afb113)), closes [#227](https://github.com/ipfs-shipyard/ipfs-companion/issues/227) [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)
* **wx:** remove bogus Origin from API requests ([6fa4be1](https://github.com/ipfs-shipyard/ipfs-companion/commit/6fa4be1)), closes [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)
* **wx:** wrap badge update in try block ([176325a](https://github.com/ipfs-shipyard/ipfs-companion/commit/176325a)), closes [#218](https://github.com/ipfs-shipyard/ipfs-companion/issues/218)


### Features

* **browserAction:** [WIP] Quick Upload of local files ([8ac6a9e](https://github.com/ipfs-shipyard/ipfs-companion/commit/8ac6a9e)), closes [#184](https://github.com/ipfs-shipyard/ipfs-companion/issues/184)
* **browserAction:** Quick Upload PoC ([040444d](https://github.com/ipfs-shipyard/ipfs-companion/commit/040444d)), closes [#184](https://github.com/ipfs-shipyard/ipfs-companion/issues/184)
* **contextMenu:** Image Rehosting ([3be8b27](https://github.com/ipfs-shipyard/ipfs-companion/commit/3be8b27)), closes [#59](https://github.com/ipfs-shipyard/ipfs-companion/issues/59)
* **linkify:** PoC linkification of plaintext IPFS paths ([b8f6517](https://github.com/ipfs-shipyard/ipfs-companion/commit/b8f6517)), closes [#39](https://github.com/ipfs-shipyard/ipfs-companion/issues/39) [#202](https://github.com/ipfs-shipyard/ipfs-companion/issues/202)
* **pageAction:** pinning of IPNS resources ([0e6418b](https://github.com/ipfs-shipyard/ipfs-companion/commit/0e6418b)), closes [#222](https://github.com/ipfs-shipyard/ipfs-companion/issues/222) [#212](https://github.com/ipfs-shipyard/ipfs-companion/issues/212)
* **protocol:** support web+foo protocols ([20436d6](https://github.com/ipfs-shipyard/ipfs-companion/commit/20436d6)), closes [#164](https://github.com/ipfs-shipyard/ipfs-companion/issues/164)



## [1.5.10](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.9...v1.5.10) (2016-09-26)



## [1.5.9](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.8...v1.5.9) (2016-07-09)



## [1.5.8](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.7...v1.5.8) (2016-04-11)



## [1.5.7](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.6...v1.5.7) (2016-03-29)



## [1.5.6](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.5...v1.5.6) (2016-03-20)



## [1.5.5](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.4...v1.5.5) (2016-02-20)



## [1.5.4](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.3...v1.5.4) (2016-02-13)



## [1.5.3](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.2...v1.5.3) (2016-02-09)



## [1.5.2](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.1...v1.5.2) (2016-02-07)



## [1.5.1](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.5.0...v1.5.1) (2016-02-05)



# [1.5.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.4.2...v1.5.0) (2016-02-04)



## [1.4.2](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.4.1...v1.4.2) (2016-01-24)



## [1.4.1](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.4.0...v1.4.1) (2016-01-16)



# [1.4.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.3.2...v1.4.0) (2016-01-10)



## [1.3.2](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.3.1...v1.3.2) (2015-12-17)



## [1.3.1](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.3.0...v1.3.1) (2015-11-27)



# [1.3.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.2.0...v1.3.0) (2015-11-22)



# [1.2.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.1.0...v1.2.0) (2015-09-27)



# [1.1.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.0.3...v1.1.0) (2015-09-20)



## [1.0.3](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.0.2...v1.0.3) (2015-09-09)



## [1.0.2](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.0.1...v1.0.2) (2015-08-27)



## [1.0.1](https://github.com/ipfs-shipyard/ipfs-companion/compare/v1.0.0...v1.0.1) (2015-04-08)



# [1.0.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v0.2.0...v1.0.0) (2015-04-08)



# [0.2.0](https://github.com/ipfs-shipyard/ipfs-companion/compare/v0.1.0...v0.2.0) (2015-03-25)



# 0.1.0 (2015-03-22)



