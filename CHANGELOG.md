## [2.6.3](https://github.com/ipfs-shipyard/ipfs-companion/compare/v2.6.2...v2.6.3) (2018-12-10)


### Bug Fixes

* **ci:** switch to nodejs v10.11.0 ([687a4d8](https://github.com/ipfs-shipyard/ipfs-companion/commit/687a4d8))
* **security:** remove  event-stream/flatmap-stream ([d4db63a](https://github.com/ipfs-shipyard/ipfs-companion/commit/d4db63a))
* Origin in API requests under Chromium 72 ([#631](https://github.com/ipfs-shipyard/ipfs-companion/issues/631)) ([8866f76](https://github.com/ipfs-shipyard/ipfs-companion/commit/8866f76))



## [2.23.0](https://github.com/ipfs/ipfs-companion/compare/ipfs-companion-v2.22.0...ipfs-companion-v2.23.0) (2023-02-16)


### Features

* add 'Open Web UI' button to the welcome page ([#769](https://github.com/ipfs/ipfs-companion/issues/769)) ([d01b2d3](https://github.com/ipfs/ipfs-companion/commit/d01b2d388533523e51a2e0067d1b73e113b2615a))
* add bundle:brave:beta script ([db006df](https://github.com/ipfs/ipfs-companion/commit/db006dfa93c78a0bacc61330ad4eb64d1dda3f4b))
* add deprecation warning to window.ipfs.&lt;cmd&gt; ([690ad80](https://github.com/ipfs/ipfs-companion/commit/690ad80e1948387c25f0c081ece3c2681ce93918))
* add E2E tests for chromium and firefox ([#1121](https://github.com/ipfs/ipfs-companion/issues/1121)) ([eeaa083](https://github.com/ipfs/ipfs-companion/commit/eeaa0838f920f5a36289818d9f885dcf075ca2e0))
* add ipfsNodeType embedded:chromesockets ([5c0b495](https://github.com/ipfs/ipfs-companion/commit/5c0b495b5d41c80352ced2678b4b7a8acfaa0df9))
* add telemetry to companion ([#1117](https://github.com/ipfs/ipfs-companion/issues/1117)) ([42eed02](https://github.com/ipfs/ipfs-companion/commit/42eed027832398d3a2dfb7b7a3aec411e355be78))
* Adding Release Automation ([#1122](https://github.com/ipfs/ipfs-companion/issues/1122)) ([1ed411e](https://github.com/ipfs/ipfs-companion/commit/1ed411e5006a5a477c8002765977f16e1ff755a5))
* brave node indicator ([#966](https://github.com/ipfs/ipfs-companion/issues/966)) ([7e938e6](https://github.com/ipfs/ipfs-companion/commit/7e938e6fd1dc7366046ff1b9ff2a56ae27f914bd))
* **brave:** conditional and range requests ([21886a1](https://github.com/ipfs/ipfs-companion/commit/21886a129498e27a22ef2fe0de966b2c73f97fce))
* **brave:** delegated DHT + preload ([4eff7b0](https://github.com/ipfs/ipfs-companion/commit/4eff7b069b48661992bdb910626f843c73d8e15b))
* **brave:** delegated peers and content routing ([#739](https://github.com/ipfs/ipfs-companion/issues/739)) ([254a3bd](https://github.com/ipfs/ipfs-companion/commit/254a3bd5fac450d639bfddf2fa390788689b5dc8))
* **brave:** Embedded HTTP Gateway for /ipns/{fqdn} with sharding ([4d935ba](https://github.com/ipfs/ipfs-companion/commit/4d935ba28eeb536f0053352bfb55b6f49aca430b))
* **brave:** Embedded HTTP Gateway for /ipns/{fqdn} with sharding ([#719](https://github.com/ipfs/ipfs-companion/issues/719)) ([4d935ba](https://github.com/ipfs/ipfs-companion/commit/4d935ba28eeb536f0053352bfb55b6f49aca430b))
* **brave:** Gateway with IPNS+DNSLink+HAMT ([1d48087](https://github.com/ipfs/ipfs-companion/commit/1d4808721acca4f71fd10a05475ea7db9ca2bc02))
* **brave:** listen on TCP port ([114daeb](https://github.com/ipfs/ipfs-companion/commit/114daeb84ff151ff495db8e3ab68bd0544c1b8ee))
* **brave:** peer discovery with ws-star ([295c3fc](https://github.com/ipfs/ipfs-companion/commit/295c3fc27a8077fdc1ba4cc1ac8804b27f5d48f2))
* **brave:** self-hosted API and Gateway ports ([1b15a29](https://github.com/ipfs/ipfs-companion/commit/1b15a29f9198eb2366c2bdff3ed47b8b1accdae0))
* **brave:** streaming compressed payload from gw ([04e842d](https://github.com/ipfs/ipfs-companion/commit/04e842d696ac97f06820188e89b4d3037046c806))
* **brave:** use TCP Bootstrappers ([0d28d66](https://github.com/ipfs/ipfs-companion/commit/0d28d6680ae392e08b366d88654683e1d93ca727))
* **build:** switch yarn to registry.js.ipfs.io ([d5ff013](https://github.com/ipfs/ipfs-companion/commit/d5ff013f7c4728f1c184fd4ae53616d24129a6e4))
* **ci:** enable codecov ([12fcd5d](https://github.com/ipfs/ipfs-companion/commit/12fcd5d4d648cf5cb2d845d363bccdfd14edd162))
* **ci:** move to github, work on windows ([#928](https://github.com/ipfs/ipfs-companion/issues/928)) ([c176fc4](https://github.com/ipfs/ipfs-companion/commit/c176fc44b87124911ddb18c73d9b00e637c1a8e0))
* conditional and range requests in Brave ([#717](https://github.com/ipfs/ipfs-companion/issues/717)) ([02eb46d](https://github.com/ipfs/ipfs-companion/commit/02eb46d8db9ede1e1b411a9d01b29c426a17ba8c))
* configurable logger levels ([#712](https://github.com/ipfs/ipfs-companion/issues/712)) ([0bf9f67](https://github.com/ipfs/ipfs-companion/commit/0bf9f674542440e7edd1f5be4d2001ae3264e6b7))
* connect to preload nodes, but over tcp ([79ebbee](https://github.com/ipfs/ipfs-companion/commit/79ebbeec37a78a3e97699a401999554045e0574b))
* context actions on DNSLink sites ([712926c](https://github.com/ipfs/ipfs-companion/commit/712926c7cb7e5ff14b8b9ac71e26f167ab57eb48))
* copy shareable link during file import ([#834](https://github.com/ipfs/ipfs-companion/issues/834)) ([3c8c57d](https://github.com/ipfs/ipfs-companion/commit/3c8c57d7bb4b0af76288de751cee648e1d70089f))
* default to brave node ([#968](https://github.com/ipfs/ipfs-companion/issues/968)) ([80dea75](https://github.com/ipfs/ipfs-companion/commit/80dea7520b423c648b04fbaf881f7e0d7e40c3dc))
* disable integrations per website ([#830](https://github.com/ipfs/ipfs-companion/issues/830)) ([ebcc3fa](https://github.com/ipfs/ipfs-companion/commit/ebcc3fa3b4cec664e0deb209cefc3d7a40d9771b))
* display feedback form on extension uninstall ([#799](https://github.com/ipfs/ipfs-companion/issues/799)) ([f8449f7](https://github.com/ipfs/ipfs-companion/commit/f8449f7335bce0c518d5da4be8a2ac67b1196425)), closes [#468](https://github.com/ipfs/ipfs-companion/issues/468)
* **dx:** run as temporary add-on in Chromium ([6beccfb](https://github.com/ipfs/ipfs-companion/commit/6beccfbaacd2e8b314331dcf85c03c4cfcd9606c))
* enable local discovery via libp2p-mdns ([0802321](https://github.com/ipfs/ipfs-companion/commit/080232112f2ecccf7c91647a547ba970dadb28a0))
* enable TCP transport and TCP Bootstrappers ([3c04858](https://github.com/ipfs/ipfs-companion/commit/3c048587a58802123e7b0fe68771c69638b0140f))
* enable Web UI for embedded js-ipfs ([#656](https://github.com/ipfs/ipfs-companion/issues/656)) ([25c0e6a](https://github.com/ipfs/ipfs-companion/commit/25c0e6a58d02d9bf4422284bd6d662ba29426d87))
* **i18:** add Turkish locale ([ece3e0b](https://github.com/ipfs/ipfs-companion/commit/ece3e0bef8d2b5f92259b314d973b5f7dbbb5b1d))
* **i18n:** add ar locale ([8ae3087](https://github.com/ipfs/ipfs-companion/commit/8ae30874c289301bcb7aa9af79eec9873ef83f40))
* **i18n:** add pt_BR locale ([#708](https://github.com/ipfs/ipfs-companion/issues/708)) ([86b49b0](https://github.com/ipfs/ipfs-companion/commit/86b49b06519bbb281f37d1d6563b1830861bc110))
* **i18n:** Finnish locale ([3092cb2](https://github.com/ipfs/ipfs-companion/commit/3092cb286ddb88aa70a1336c7dfcb884a61463c1))
* icon in browser action menu upon version update ([#935](https://github.com/ipfs/ipfs-companion/issues/935)) ([139925d](https://github.com/ipfs/ipfs-companion/commit/139925da399186cc30c162df8b8176c00d6329eb))
* import files to MFS ([#810](https://github.com/ipfs/ipfs-companion/issues/810)) ([92fd07a](https://github.com/ipfs/ipfs-companion/commit/92fd07acfac5127dc48c7fc0d4496224e5cbda4f))
* improved experience on DNSLink websites ([#826](https://github.com/ipfs/ipfs-companion/issues/826)) ([df96a05](https://github.com/ipfs/ipfs-companion/commit/df96a055157a8e715d141ea5bb1d03beb3b58acc))
* ipfs-webui v2.4.3 ([9cc5772](https://github.com/ipfs/ipfs-companion/commit/9cc57720823d343865fc75db1854d882e53e7a4b))
* ipfs-webui v2.4.4 ([47f3ac1](https://github.com/ipfs/ipfs-companion/commit/47f3ac1b2bc50679be92999736629bfb4f0e482c))
* leverage IPFS node provided by Brave ([#956](https://github.com/ipfs/ipfs-companion/issues/956)) ([b5cddcf](https://github.com/ipfs/ipfs-companion/commit/b5cddcf8bfb811dc84aac8db41d6bd7358e3a9e5))
* load ipfs-webui from IPFS ([a98e563](https://github.com/ipfs/ipfs-companion/commit/a98e56389d9f8cb4aa75131d075e593bf0450285))
* make Preferences link to docs site ([#871](https://github.com/ipfs/ipfs-companion/issues/871)) ([eda02e7](https://github.com/ipfs/ipfs-companion/commit/eda02e7bab22f488c3a3164fb333b2ece80dfd73))
* Moving from ipfs-http-client -&gt; kubo-rpc-client ([#1124](https://github.com/ipfs/ipfs-companion/issues/1124)) ([d439a97](https://github.com/ipfs/ipfs-companion/commit/d439a974fd899d9c2f834c70ca41cccf64ffd1fa))
* npm run firefox:nightly ([17dcd9f](https://github.com/ipfs/ipfs-companion/commit/17dcd9f2d22fda42d80c0f9704cd621b47d77c25))
* open Preferences in a new tab ([#879](https://github.com/ipfs/ipfs-companion/issues/879)) ([c2c3f6b](https://github.com/ipfs/ipfs-companion/commit/c2c3f6becf7b2946a13f70fc791c3a0548781456))
* opt-in DNSLink redirect ([24869d5](https://github.com/ipfs/ipfs-companion/commit/24869d5258e89bc4ec66fb43ec5c638ba156666c))
* option to opt-in for bleeding edge ipfs-webui ([#893](https://github.com/ipfs/ipfs-companion/issues/893)) ([f655d7a](https://github.com/ipfs/ipfs-companion/commit/f655d7af1fb3510e6922de0fc87f63a0be9706ed))
* **options:** UI for editing redirect opt-outs ([86f5fcf](https://github.com/ipfs/ipfs-companion/commit/86f5fcf33efd0a7c5422415b358b551863af0c0a))
* per-site redirect opt-out ([eb8723a](https://github.com/ipfs/ipfs-companion/commit/eb8723a194f1c3bff606969fbc56fa8c76144276))
* pop-up menu and share page tweaks ([#907](https://github.com/ipfs/ipfs-companion/issues/907)) ([5f5d9a6](https://github.com/ipfs/ipfs-companion/commit/5f5d9a63e26b6e224b44f6d42deb5b3f76476004))
* precached webui works in offline mode ([#782](https://github.com/ipfs/ipfs-companion/issues/782)) ([0679e3e](https://github.com/ipfs/ipfs-companion/commit/0679e3e094266153fc46ab865ac3222ca26e8b5a))
* preload visited DNSLink URLs to local node ([#827](https://github.com/ipfs/ipfs-companion/issues/827)) ([6c37c6a](https://github.com/ipfs/ipfs-companion/commit/6c37c6a19fbc642100a9b56421952091c477a6d4))
* preload webui root CID ([#735](https://github.com/ipfs/ipfs-companion/issues/735)) ([db78df2](https://github.com/ipfs/ipfs-companion/commit/db78df2fba24a69175ddce30729efcab5c10bcba))
* recover dead sub-domain gateways ([#802](https://github.com/ipfs/ipfs-companion/issues/802)) ([3a959b1](https://github.com/ipfs/ipfs-companion/commit/3a959b1075150ac38cda15c6e995591d69f2d1c2))
* recover from DNS failures ([#797](https://github.com/ipfs/ipfs-companion/issues/797)) ([ca26240](https://github.com/ipfs/ipfs-companion/commit/ca2624032e7ad5e6899b876fb7296aa0519b4b34))
* recover from failed HTTP requests to third party gateways ([#783](https://github.com/ipfs/ipfs-companion/issues/783)) ([614da95](https://github.com/ipfs/ipfs-companion/commit/614da95fac7e9ece1de54336aaaf63e3a638932e))
* recovery page when local gateway is unreachable ([#1125](https://github.com/ipfs/ipfs-companion/issues/1125)) ([a74fbb3](https://github.com/ipfs/ipfs-companion/commit/a74fbb3736e6f29d337b6046b088f25a2d86e5b0))
* reload failed IPFS tabs when API becomes available ([#1092](https://github.com/ipfs/ipfs-companion/issues/1092)) ([8a33b6c](https://github.com/ipfs/ipfs-companion/commit/8a33b6c740233d20fdaabb68cd527002748b33c0))
* remember manual opt-ins and opt-outs per site ([#929](https://github.com/ipfs/ipfs-companion/issues/929)) ([63bc106](https://github.com/ipfs/ipfs-companion/commit/63bc106cf4dcbabe49e5975261c8a6e587279485))
* remember path set on import page ([#1063](https://github.com/ipfs/ipfs-companion/issues/1063)) ([251e183](https://github.com/ipfs/ipfs-companion/commit/251e183d1d36fde0d5fb3789718d9ecf85983846))
* remove 'redirect on {domain}' from main menu ([c7c3221](https://github.com/ipfs/ipfs-companion/commit/c7c32216a98e80cace6b7aae5498658d14b0edb7))
* replace pinning with import to mfs ([#997](https://github.com/ipfs/ipfs-companion/issues/997)) ([7aba6d9](https://github.com/ipfs/ipfs-companion/commit/7aba6d9d436fe7a4c2ae62223cefe6ccc454a2bb))
* responsive prefs page ([#883](https://github.com/ipfs/ipfs-companion/issues/883)) ([81bb860](https://github.com/ipfs/ipfs-companion/commit/81bb8606cdf2a406cf0b15bb4a11264a18c0c7dd))
* scaffolding for window.ipfs.enable ([4e6f65d](https://github.com/ipfs/ipfs-companion/commit/4e6f65dfa00877a611b40185cff769200325a894))
* snapshot link and IPNS path copy options ([#937](https://github.com/ipfs/ipfs-companion/issues/937)) ([bbb2945](https://github.com/ipfs/ipfs-companion/commit/bbb29454e114520b8db73c6ef0598d9ddc0dc927))
* subdomain gateway via HTTP proxy ([a736a5f](https://github.com/ipfs/ipfs-companion/commit/a736a5f15475ec622751c4850eff8a91bb71b9b6))
* support ipfs://{dnslink} ([#748](https://github.com/ipfs/ipfs-companion/issues/748)) ([7ba096d](https://github.com/ipfs/ipfs-companion/commit/7ba096d98a8ebc87cfe46fd799b459a50725ffcf)), closes [#534](https://github.com/ipfs/ipfs-companion/issues/534)
* switch CI to travis-ci.com ([2f360f1](https://github.com/ipfs/ipfs-companion/commit/2f360f191cc8d31db1004a4a54451da1fec2414b))
* TCP client in Brave ([#754](https://github.com/ipfs/ipfs-companion/issues/754)) ([8f7eda4](https://github.com/ipfs/ipfs-companion/commit/8f7eda417808227bd0a4348999645186b635a3ae))
* **telemetry:** :sparkles: Adding companion version to segments ([#1142](https://github.com/ipfs/ipfs-companion/issues/1142)) ([65fe66c](https://github.com/ipfs/ipfs-companion/commit/65fe66cc283f1ac8c89638034e7db006e1f53791))
* toggle switch in Preferences ([5a3cb17](https://github.com/ipfs/ipfs-companion/commit/5a3cb17e827cedea6b61c5ad95098032b62377f3))
* unlimited storage for embedded js-ipfs ([#714](https://github.com/ipfs/ipfs-companion/issues/714)) ([0446989](https://github.com/ipfs/ipfs-companion/commit/0446989e8c6d67127b7dab58f2759aa2ad202036))
* update CODEOWNERS ([#1093](https://github.com/ipfs/ipfs-companion/issues/1093)) ([d842c57](https://github.com/ipfs/ipfs-companion/commit/d842c57644a63d2df52997d2cd210ee80166f65d))
* update to Web UI v2.3.0 ([#644](https://github.com/ipfs/ipfs-companion/issues/644)) ([43d92a9](https://github.com/ipfs/ipfs-companion/commit/43d92a90f96d90fd845bf0e39502b77b262ea14d))
* update to Web UI v2.3.2 ([#653](https://github.com/ipfs/ipfs-companion/issues/653)) ([2c7eacd](https://github.com/ipfs/ipfs-companion/commit/2c7eacdaa30612cd944786ca2898a11973e795da))
* update Web UI to v2.4.6 ([#725](https://github.com/ipfs/ipfs-companion/issues/725)) ([52cd633](https://github.com/ipfs/ipfs-companion/commit/52cd6339f7490efa199b65a7937085c86b8b4f30))
* update welcome page content ([#884](https://github.com/ipfs/ipfs-companion/issues/884)) ([053cc70](https://github.com/ipfs/ipfs-companion/commit/053cc7053fb05e4179afad67af0bc2fa58729f71))
* **ux:** suggest ipfs-desktop when no node is found ([#726](https://github.com/ipfs/ipfs-companion/issues/726)) ([adefd87](https://github.com/ipfs/ipfs-companion/commit/adefd877b87d1cb0fd59f6ec026d408f40e1ef3e))
* View on Gateway context action on IPFS pages ([963a340](https://github.com/ipfs/ipfs-companion/commit/963a3406687afc17046cfb6f0192ba1765a4431b))
* warning about mixed content issues ([#650](https://github.com/ipfs/ipfs-companion/issues/650)) ([d59416d](https://github.com/ipfs/ipfs-companion/commit/d59416d039fc1233b54e07361f4f3a5c243c9b37)), closes [#648](https://github.com/ipfs/ipfs-companion/issues/648)
* web ui 2.5.1 ([#752](https://github.com/ipfs/ipfs-companion/issues/752)) ([a6e0488](https://github.com/ipfs/ipfs-companion/commit/a6e04880e394a1006cfe9f025180a5bdda3d541d))
* web ui 2.5.2 ([#753](https://github.com/ipfs/ipfs-companion/issues/753)) ([18be6b8](https://github.com/ipfs/ipfs-companion/commit/18be6b835dfa7b162e582958984bb4a2cc6afe82))
* web ui 2.5.3 ([#756](https://github.com/ipfs/ipfs-companion/issues/756)) ([ae2a5a9](https://github.com/ipfs/ipfs-companion/commit/ae2a5a9b187854aceea62be10e2cf70688ddedb6))
* web ui 2.5.4 ([#764](https://github.com/ipfs/ipfs-companion/issues/764)) ([aaebc39](https://github.com/ipfs/ipfs-companion/commit/aaebc394f1126e0fdd98723b47c0fa74abfa95d6))
* web ui 2.5.7 ([e6d0b19](https://github.com/ipfs/ipfs-companion/commit/e6d0b1980061b18cef10087897b8a3f4acb7152b))
* web ui 2.5.8 ([#801](https://github.com/ipfs/ipfs-companion/issues/801)) ([624ff79](https://github.com/ipfs/ipfs-companion/commit/624ff796502c583d1eed5e302f2871abffc7b7bf))
* web ui 2.7.1 ([#814](https://github.com/ipfs/ipfs-companion/issues/814)) ([7618e90](https://github.com/ipfs/ipfs-companion/commit/7618e90fa9ec261839f61df88a2b8832536c967d))
* web ui 2.7.2 ([#825](https://github.com/ipfs/ipfs-companion/issues/825)) ([0ef6765](https://github.com/ipfs/ipfs-companion/commit/0ef6765f33b67015d7337b552b52a78f09d8ce2d))
* window.ipfs.enable() ([b0110a0](https://github.com/ipfs/ipfs-companion/commit/b0110a0c266ba8a90b3bfb8fd9068eef11e443cd))
* **window.ipfs:** opt-in ipfsx experiment ([b633eb4](https://github.com/ipfs/ipfs-companion/commit/b633eb467202f2adfae39a15380d4242bca1987b))


### Bug Fixes

* :bug: waiting for test to finish for longer ([#1136](https://github.com/ipfs/ipfs-companion/issues/1136)) ([382cc2e](https://github.com/ipfs/ipfs-companion/commit/382cc2e03f8f491ac02c868b958c3f5eac18a989))
* :fire: Allow automation to run from manual triggers. ([#1143](https://github.com/ipfs/ipfs-companion/issues/1143)) ([a61e081](https://github.com/ipfs/ipfs-companion/commit/a61e081a75cee6d2a6c66d1c58819e9d63656a51))
* add bundle:fennec ([d04553d](https://github.com/ipfs/ipfs-companion/commit/d04553d33b4fa54725969a250b5fb8e00562d03a))
* add favicon to welcome, options, quick-import pages ([#906](https://github.com/ipfs/ipfs-companion/issues/906)) ([b89788a](https://github.com/ipfs/ipfs-companion/commit/b89788ab39c7edc57339a852dc4e77d28bd1e31d))
* allow scenario when all ws-stars are offline ([8ed1a6d](https://github.com/ipfs/ipfs-companion/commit/8ed1a6da4482f931691961c7267cb937e448e009))
* async setApiStatusUpdateInterval ([207fd76](https://github.com/ipfs/ipfs-companion/commit/207fd76c4fd33b2443ef5c9da1e1591d68f08a53))
* avoid internal requests for action icons ([#788](https://github.com/ipfs/ipfs-companion/issues/788)) ([7b84a06](https://github.com/ipfs/ipfs-companion/commit/7b84a063d3bdc1c407d86c13bcbb10b14567f86a))
* brave bundle should inherit chrome manifest ([ccbc3d9](https://github.com/ipfs/ipfs-companion/commit/ccbc3d95dcd69c60db95110d74dbf58b1c7eb958))
* **brave:** no port collisions ([2a70ff6](https://github.com/ipfs/ipfs-companion/commit/2a70ff6150472ff9422fc0c64206c55f8774763f))
* **brave:** no port collisions ([b48e643](https://github.com/ipfs/ipfs-companion/commit/b48e643ea55a0c1b4bc283dc2c451cffcd2c86c1))
* **brave:** persist External node config ([2a70ff6](https://github.com/ipfs/ipfs-companion/commit/2a70ff6150472ff9422fc0c64206c55f8774763f))
* **brave:** persist External node config ([6b38376](https://github.com/ipfs/ipfs-companion/commit/6b38376d84e05ed668c3419b30672aa2c241a14a))
* **brave:** port collisions of embedded js-ipfs ([#734](https://github.com/ipfs/ipfs-companion/issues/734)) ([2a70ff6](https://github.com/ipfs/ipfs-companion/commit/2a70ff6150472ff9422fc0c64206c55f8774763f))
* **brave:** provisional fix for /api/v0/add ([2728436](https://github.com/ipfs/ipfs-companion/commit/2728436cafa796e9b62981296182816279b409b9))
* **brave:** robust ipfs.cat + content-type sniff ([a0978b8](https://github.com/ipfs/ipfs-companion/commit/a0978b85162c0e23d7dd7d4d7ebba602c3518a2a))
* **brave:** sync ipfsNodeConfig only when changed ([85ef167](https://github.com/ipfs/ipfs-companion/commit/85ef1671656f187be922058f70743667e7501e59))
* broken dnslink at /ipns/ipfs.io/blog/foo ([#844](https://github.com/ipfs/ipfs-companion/issues/844)) ([5da02c9](https://github.com/ipfs/ipfs-companion/commit/5da02c9a639874dbac170e587eb80ab4d22cd9d1))
* browserActon icon in Chromium 80 ([3f220f3](https://github.com/ipfs/ipfs-companion/commit/3f220f3cc8d1afcc663e369980e88ff0fccf96db))
* **build:** regenerate yarn.lock ([fb27d28](https://github.com/ipfs/ipfs-companion/commit/fb27d28275461ad01c49aee43c356b79ac908eee))
* chrome-dgram in firefox/chrome ([c717420](https://github.com/ipfs/ipfs-companion/commit/c717420d9fb05219fdac62a33ee7ddf97db987f9))
* **chrome:** add browser.* to nav-header ([ede86a7](https://github.com/ipfs/ipfs-companion/commit/ede86a7e08293740d6566d8635cf05c7d43b541d))
* **cid:** install jq on osx ([4169703](https://github.com/ipfs/ipfs-companion/commit/4169703be72edf012ddbc90317b7622cf58b4d16))
* **ci:** hanging tests ([#1106](https://github.com/ipfs/ipfs-companion/issues/1106)) ([5b0c6d1](https://github.com/ipfs/ipfs-companion/commit/5b0c6d120ea6a499b68067596cba665652310f3a))
* **ci:** switch to nodejs v10.11.0 ([687a4d8](https://github.com/ipfs/ipfs-companion/commit/687a4d8974d414291260a12c3f18d41b87aa7af9))
* **ci:** windows build ([#1094](https://github.com/ipfs/ipfs-companion/issues/1094)) ([044032f](https://github.com/ipfs/ipfs-companion/commit/044032f9bbc6294b8af7d2646050d92053d430d5))
* cleanup boot on clean install ([2b63636](https://github.com/ipfs/ipfs-companion/commit/2b636360944397ab257f9990cdc390f14931ce50))
* copy actions in context menu on subdomains ([#986](https://github.com/ipfs/ipfs-companion/issues/986)) ([b9c6703](https://github.com/ipfs/ipfs-companion/commit/b9c67038cd4a20a08b51358d46f5a9ed940890e8))
* copying link for SVG and PDF ([f707f44](https://github.com/ipfs/ipfs-companion/commit/f707f4480742937cada258b629b0592f094ec805)), closes [#440](https://github.com/ipfs/ipfs-companion/issues/440)
* decode content paths with decodeURI ([1acf899](https://github.com/ipfs/ipfs-companion/commit/1acf89954a2ff08b4205ae35309353c520ea9575))
* default to External node ([72c34f4](https://github.com/ipfs/ipfs-companion/commit/72c34f4a4a1bba6488975fba1a817a997a99bfad))
* default to https when recovering .eth ([#847](https://github.com/ipfs/ipfs-companion/issues/847)) ([60aa5d1](https://github.com/ipfs/ipfs-companion/commit/60aa5d140770f57e6480a5357c12f14f07c81e8b))
* delay precache for 10s ([4139a21](https://github.com/ipfs/ipfs-companion/commit/4139a211f7a6e38b70b978d343e3ddaded8c3486))
* **dev-build:** default to firefox manifest ([b6354a4](https://github.com/ipfs/ipfs-companion/commit/b6354a4e310bff3ffd328befa6d4ab0dca47d337))
* disable http-proxy when extension is inactive ([2a6c67e](https://github.com/ipfs/ipfs-companion/commit/2a6c67ee615658057c3830807dd92dd3abbcb17b))
* disallow running in incognito mode ([#705](https://github.com/ipfs/ipfs-companion/issues/705)) ([e449ff6](https://github.com/ipfs/ipfs-companion/commit/e449ff67909bc09df79fe6a6de5cac26057d5ef1))
* dnslink resolver under js-ipfs ([f23bc2e](https://github.com/ipfs/ipfs-companion/commit/f23bc2ee03d0d92e5e9d7f75de445d565021f77b))
* do not suicide startup is ws-star is down ([#669](https://github.com/ipfs/ipfs-companion/issues/669)) ([2f137e4](https://github.com/ipfs/ipfs-companion/commit/2f137e4381a277e8b5ef5285d551612cc443764b))
* download-release-artifacts.sh ([b7df38a](https://github.com/ipfs/ipfs-companion/commit/b7df38ab86254999814e0ff6a5f6f210d950ea7b))
* drag and drop in Web UI ([a3cef39](https://github.com/ipfs/ipfs-companion/commit/a3cef39e519f4f2cd2f88c8288e125eda4df4a30))
* external node in Firefox 85 ([#957](https://github.com/ipfs/ipfs-companion/issues/957)) ([95dbb50](https://github.com/ipfs/ipfs-companion/commit/95dbb506d9b2979aa8573247b94352d386e8f0af))
* faster Docker build ([b725f8d](https://github.com/ipfs/ipfs-companion/commit/b725f8ddbb5c4cb04d3642c93e03aa7320f294eb))
* feature-detection for chrome.sockets ([b441d27](https://github.com/ipfs/ipfs-companion/commit/b441d277ff3445864310baa7728593b1b3494411))
* HTTP recovery in the same tab ([#876](https://github.com/ipfs/ipfs-companion/issues/876)) ([0ce7974](https://github.com/ipfs/ipfs-companion/commit/0ce79749443f8fd857a9c46a3b49b9ea0b70d8e5))
* HTTP recovery should respect redirect state ([e457302](https://github.com/ipfs/ipfs-companion/commit/e457302c743438c814cb12f9f499bfd65003898c))
* import to ipfs is disabled ([4827fee](https://github.com/ipfs/ipfs-companion/commit/4827feefd3ba813c5967c673fd6db4d1969ba729))
* Improve extraHeaders feature detection ([#787](https://github.com/ipfs/ipfs-companion/issues/787)) ([e037f0a](https://github.com/ipfs/ipfs-companion/commit/e037f0a5604fff200113a577dba579b1d7e3fe38))
* include CSS assets in the install package ([#885](https://github.com/ipfs/ipfs-companion/issues/885)) ([bde51fe](https://github.com/ipfs/ipfs-companion/commit/bde51fe6d0b150bc6d6f29170584d59b8edbe800))
* inlined DNSLink and context actions for URIs ([#961](https://github.com/ipfs/ipfs-companion/issues/961)) ([faf3ddf](https://github.com/ipfs/ipfs-companion/commit/faf3ddf653db8bea90c5d6682729d1ea06d95d83))
* interop with Brave Shields rules ([#976](https://github.com/ipfs/ipfs-companion/issues/976)) ([9ffe71c](https://github.com/ipfs/ipfs-companion/commit/9ffe71c4ac0f0ed28b97aab3117e36dac48b1f1e)), closes [#962](https://github.com/ipfs/ipfs-companion/issues/962)
* IP support on opt-in and opt-out lists ([#945](https://github.com/ipfs/ipfs-companion/issues/945)) ([724775e](https://github.com/ipfs/ipfs-companion/commit/724775e60893f08349873e12788d931fdce9af64))
* ipfs:// in Firefox incognito window ([#835](https://github.com/ipfs/ipfs-companion/issues/835)) ([c3f4c53](https://github.com/ipfs/ipfs-companion/commit/c3f4c531514522bf11ca74ce878051480f8ad773))
* ipfs.io/blog on Chromium ([ea4dd2c](https://github.com/ipfs/ipfs-companion/commit/ea4dd2c2d51f12553e67631c5316f6ee92b7546e))
* isHostname reports malformed IPv6 addresses as valid ([#946](https://github.com/ipfs/ipfs-companion/issues/946)) ([cec022d](https://github.com/ipfs/ipfs-companion/commit/cec022dec871d2396ffe488df8c809b6ba92085c))
* linkify tests ([#1064](https://github.com/ipfs/ipfs-companion/issues/1064)) ([b2bd5f2](https://github.com/ipfs/ipfs-companion/commit/b2bd5f27460dc143a604b09f5567d8a1fcf58b14))
* minimize the amount of CSS assets ([#882](https://github.com/ipfs/ipfs-companion/issues/882)) ([1e6f42e](https://github.com/ipfs/ipfs-companion/commit/1e6f42ed794a9c869406ad48438244ffa7d8cce6))
* missing Files APIs over window.ipfs ([#657](https://github.com/ipfs/ipfs-companion/issues/657)) ([d179f32](https://github.com/ipfs/ipfs-companion/commit/d179f32b7f662c68da33e18904164d9ac796fa12))
* mixed-content on HTTP pages ([3e6708b](https://github.com/ipfs/ipfs-companion/commit/3e6708bb1227fc447f908f545e4f157d3936caac))
* no dnslink lookup when turned off ([#823](https://github.com/ipfs/ipfs-companion/issues/823)) ([68c9bd0](https://github.com/ipfs/ipfs-companion/commit/68c9bd0f3849797bd77766d14482a5b7b62eff6e)), closes [#821](https://github.com/ipfs/ipfs-companion/issues/821)
* normalize API calls from 0.0.0.0 to 127.0.0.1 ([#868](https://github.com/ipfs/ipfs-companion/issues/868)) ([793bd6c](https://github.com/ipfs/ipfs-companion/commit/793bd6cdbe804f611ed42f7dd32c6fb8d9d224b8))
* onboarding flow in Brave ([#1011](https://github.com/ipfs/ipfs-companion/issues/1011)) ([c2bd768](https://github.com/ipfs/ipfs-companion/commit/c2bd768d53eb42b1685efd1b5e430482df939a28))
* Origin in API requests under Chromium 72 ([#631](https://github.com/ipfs/ipfs-companion/issues/631)) ([8866f76](https://github.com/ipfs/ipfs-companion/commit/8866f76b82ca662bd89c47447e210fb1262de39f))
* patch-in /quic-v1 support ([#1119](https://github.com/ipfs/ipfs-companion/issues/1119)) ([8b4b7d0](https://github.com/ipfs/ipfs-companion/commit/8b4b7d04e9b10d7e1f8c4bf0976ce9af6bb43bbf)), closes [#1118](https://github.com/ipfs/ipfs-companion/issues/1118)
* **privacy:** remove ACL whitelist for window.ipfs ([756b177](https://github.com/ipfs/ipfs-companion/commit/756b177bf8875410476f6a3e0c47245cef5dbf15))
* proxy only the gateway port ([4ce869e](https://github.com/ipfs/ipfs-companion/commit/4ce869e8eff876e68bc07d145fd747f069175e22))
* **proxy:** fail fast on unsupported flag ([a28da88](https://github.com/ipfs/ipfs-companion/commit/a28da8862b2e772bad732c93bac255ff04e03dd5))
* quick import with external node ([c652708](https://github.com/ipfs/ipfs-companion/commit/c652708d14731a4ff0a1586970737eb69369c323))
* recovery quirks in Firefox and Chromium ([#807](https://github.com/ipfs/ipfs-companion/issues/807)) ([04a8ca2](https://github.com/ipfs/ipfs-companion/commit/04a8ca210b661ff88ce4ae8832141ff93183f2f8))
* redirect to native URIs in Brave ([#960](https://github.com/ipfs/ipfs-companion/issues/960)) ([dbed296](https://github.com/ipfs/ipfs-companion/commit/dbed296c87469a353b67c7661cefd5e19391889c))
* regression in HTTP recovery of background tabs ([#915](https://github.com/ipfs/ipfs-companion/issues/915)) ([a219d2b](https://github.com/ipfs/ipfs-companion/commit/a219d2b3556404fc9c6cff6d5c8a6e0f072f957e))
* **release-automation:** :bug: Semver Path ([7036f6d](https://github.com/ipfs/ipfs-companion/commit/7036f6de0c9876e35d1ea0a9b1a5a25e6364d894))
* **release-automation:** :construction_worker: should no longer be needed ([#1158](https://github.com/ipfs/ipfs-companion/issues/1158)) ([7651e9e](https://github.com/ipfs/ipfs-companion/commit/7651e9e1a3a92b819bf76eb1e7b1c319f247f60f))
* **release-automation:** Release Please Using Manifests ([#1149](https://github.com/ipfs/ipfs-companion/issues/1149)) ([f360ff8](https://github.com/ipfs/ipfs-companion/commit/f360ff8f2b132904e74ad551f32eaf07395c048c))
* remove normalizeLinksContentScript ([#836](https://github.com/ipfs/ipfs-companion/issues/836)) ([f31605b](https://github.com/ipfs/ipfs-companion/commit/f31605b6279ad887ff7ad5b34e31878c14893aed))
* remove redundant/unused permissions ([#849](https://github.com/ipfs/ipfs-companion/issues/849)) ([c0442cd](https://github.com/ipfs/ipfs-companion/commit/c0442cd7626133fe839ccaa75b4ba32d36e41ad9))
* remove XHR CORS workaround for Firefox ([#771](https://github.com/ipfs/ipfs-companion/issues/771)) ([40b7ab7](https://github.com/ipfs/ipfs-companion/commit/40b7ab75353dd5140c82d6884d23ceabbcd48220))
* removed state change notifications ([#1123](https://github.com/ipfs/ipfs-companion/issues/1123)) ([49ad8d0](https://github.com/ipfs/ipfs-companion/commit/49ad8d055faeb170770ce97b8e181679405c1217)), closes [#1091](https://github.com/ipfs/ipfs-companion/issues/1091)
* reproducible build (II) ([bf9a69e](https://github.com/ipfs/ipfs-companion/commit/bf9a69ed9dbc36d56e165c2dfaa83e833cd462ec))
* reproducible docker build ([de77509](https://github.com/ipfs/ipfs-companion/commit/de77509eb0ac812e70f65a431e71c8f35e91723a))
* respect opt-out hint for subresources in FF ([7a78552](https://github.com/ipfs/ipfs-companion/commit/7a78552ed95c5843d8ce74b2c99077485b43be68))
* restore Android support ([#770](https://github.com/ipfs/ipfs-companion/issues/770)) ([c4f1707](https://github.com/ipfs/ipfs-companion/commit/c4f1707c25eb0cd5bf0c1b94f4a9b9dc3b9824e6))
* restore ESR compatibility ([#812](https://github.com/ipfs/ipfs-companion/issues/812)) ([fb5958a](https://github.com/ipfs/ipfs-companion/commit/fb5958a30f98fc1848c8d2dfc53a6581bb3cc3aa)), closes [#784](https://github.com/ipfs/ipfs-companion/issues/784) [#779](https://github.com/ipfs/ipfs-companion/issues/779)
* restore proper startup on Android ([4e3c7e7](https://github.com/ipfs/ipfs-companion/commit/4e3c7e7021af4f27e659a809b97001ce07a9adfd))
* set minimum_chrome_version to 72 ([#798](https://github.com/ipfs/ipfs-companion/issues/798)) ([8e2eaee](https://github.com/ipfs/ipfs-companion/commit/8e2eaeeeec05797b166e0ac2e149e61c4527bf61)), closes [#715](https://github.com/ipfs/ipfs-companion/issues/715)
* stop injecting window.ipfs for now ([861bb2f](https://github.com/ipfs/ipfs-companion/commit/861bb2fbe84f140819fcd7dbabe32c08509616b6))
* streaming HTTP APIs of js-ipfs in Brave ([#794](https://github.com/ipfs/ipfs-companion/issues/794)) ([b47f81b](https://github.com/ipfs/ipfs-companion/commit/b47f81b34f36ba8c1e5977670f63bff6f0386d60))
* support API listening on ipv6 ([#671](https://github.com/ipfs/ipfs-companion/issues/671)) ([78d7c06](https://github.com/ipfs/ipfs-companion/commit/78d7c0660f846380cd392c14eb94d2c0c2cffb9f)), closes [#668](https://github.com/ipfs/ipfs-companion/issues/668)
* support API on ipv6 with go-ipfs 0.8+ ([#931](https://github.com/ipfs/ipfs-companion/issues/931)) ([b00bf89](https://github.com/ipfs/ipfs-companion/commit/b00bf8969e44b8dec905e4e1cc6198b29d78bee5))
* support DNSLink with dnslink=/ipns/{libp2p-key} ([#959](https://github.com/ipfs/ipfs-companion/issues/959)) ([e61c891](https://github.com/ipfs/ipfs-companion/commit/e61c89157bac5c56e0504c83c5ddf8f53d67a994))
* support HTTPS API endpoint ([#707](https://github.com/ipfs/ipfs-companion/issues/707)) ([fde1deb](https://github.com/ipfs/ipfs-companion/commit/fde1debd8ad8e462b8cc0b5d76605358d23ce0bd)), closes [#706](https://github.com/ipfs/ipfs-companion/issues/706)
* support HTTPS API endpoints ([#654](https://github.com/ipfs/ipfs-companion/issues/654)) ([8bb8a62](https://github.com/ipfs/ipfs-companion/commit/8bb8a623385b102f3cdd7491ebcc35f2a0b2a2ed)), closes [#652](https://github.com/ipfs/ipfs-companion/issues/652)
* support ipfs.add and ipfs.files.add ([a403af3](https://github.com/ipfs/ipfs-companion/commit/a403af3325310de539e52c2b8cb82dbe84d89d76))
* support ipfs.add and ipfs.files.add ([#651](https://github.com/ipfs/ipfs-companion/issues/651)) ([c90114b](https://github.com/ipfs/ipfs-companion/commit/c90114b159177edb05a6a926478e835dc219776e))
* switch Docker build to node user ([ae95343](https://github.com/ipfs/ipfs-companion/commit/ae95343889b00bb766be9d989621b18c7384be80))
* switch external API client to ipfs-http-client ([4a8f70b](https://github.com/ipfs/ipfs-companion/commit/4a8f70b2b5ab9614210228a812a5bc632f3ab61e))
* **test:** exit mocha ([#1107](https://github.com/ipfs/ipfs-companion/issues/1107)) ([7d69cba](https://github.com/ipfs/ipfs-companion/commit/7d69cbabc6935db7f6682d1dd879356aee11c43a))
* this._dht.on is not a function ([870a4cb](https://github.com/ipfs/ipfs-companion/commit/870a4cbd35f2ef45eef6735473b787386f93080a))
* toggle buttons on Firefox ([#1105](https://github.com/ipfs/ipfs-companion/issues/1105)) ([40d1ad7](https://github.com/ipfs/ipfs-companion/commit/40d1ad7d71ce187a01a5928ba5384b152af59661))
* toggle per website on &lt;fqdn&gt;.ipfs.localhost ([e5889f2](https://github.com/ipfs/ipfs-companion/commit/e5889f2c97af693544b24a0e24a5de0b11a66c7c))
* truncate no. of peers to unit of "k" when &gt; 999 ([#1053](https://github.com/ipfs/ipfs-companion/issues/1053)) ([e8d170a](https://github.com/ipfs/ipfs-companion/commit/e8d170adbeaca80eea1f4a7e52a7f164d085ebe7))
* update error page for ipfs://CIDv0 in Firefox 70+ ([#824](https://github.com/ipfs/ipfs-companion/issues/824)) ([36a1a7e](https://github.com/ipfs/ipfs-companion/commit/36a1a7e9dad0bd7e39345880d490e48f2eaf056a)), closes [#815](https://github.com/ipfs/ipfs-companion/issues/815)
* upload of files bigger than 1MB ([867d49e](https://github.com/ipfs/ipfs-companion/commit/867d49e9696f94b28902592264a74105d6a30633))
* URI router preserving the URI path ([#950](https://github.com/ipfs/ipfs-companion/issues/950)) ([b768b39](https://github.com/ipfs/ipfs-companion/commit/b768b39938cd6048d8bdac4f90e466f852096262))
* use safeURLs for api and local gw ([06227a2](https://github.com/ipfs/ipfs-companion/commit/06227a244d357e2969b52f01dda8ee13df286446))
* viewOnGateway in page action in Firefox ([c7c7436](https://github.com/ipfs/ipfs-companion/commit/c7c7436eebe7950072f023b2c58fe63adf01ceeb))
* webui in embedded js-ipfs in Brave ([f473cfd](https://github.com/ipfs/ipfs-companion/commit/f473cfda89d3d5606e12bb2e9279879128af0787))
* **webui:** apply bugfixes up to 2019-04-24 ([e863e84](https://github.com/ipfs/ipfs-companion/commit/e863e84f0082ac740d99b392dc15494c66cfde42))

## [2.22.0](https://github.com/ipfs/ipfs-companion/compare/ipfs-companion-v2.21.0...ipfs-companion-v2.22.0) (2023-02-15)


### Features

* Adding Release Automation ([#1122](https://github.com/ipfs/ipfs-companion/issues/1122)) ([1ed411e](https://github.com/ipfs/ipfs-companion/commit/1ed411e5006a5a477c8002765977f16e1ff755a5))
* recovery page when local gateway is unreachable ([#1125](https://github.com/ipfs/ipfs-companion/issues/1125)) ([a74fbb3](https://github.com/ipfs/ipfs-companion/commit/a74fbb3736e6f29d337b6046b088f25a2d86e5b0))


### Bug Fixes

* :fire: Allow automation to run from manual triggers. ([#1143](https://github.com/ipfs/ipfs-companion/issues/1143)) ([a61e081](https://github.com/ipfs/ipfs-companion/commit/a61e081a75cee6d2a6c66d1c58819e9d63656a51))
* **release-automation:** :bug: Semver Path ([7036f6d](https://github.com/ipfs/ipfs-companion/commit/7036f6de0c9876e35d1ea0a9b1a5a25e6364d894))
* **release-automation:** Release Please Using Manifests ([#1149](https://github.com/ipfs/ipfs-companion/issues/1149)) ([f360ff8](https://github.com/ipfs/ipfs-companion/commit/f360ff8f2b132904e74ad551f32eaf07395c048c))

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
