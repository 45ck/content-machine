# Changelog

## [0.3.0](https://github.com/45ck/content-machine/compare/v0.2.2...v0.3.0) (2026-01-26)


### Features

* **bench:** add stress benchmark + desync ladder ([7f787d3](https://github.com/45ck/content-machine/commit/7f787d3259afd1890fe568994109646e3116e3b7))
* **bench:** cap benchmark scoring and tolerate bad videos ([b923162](https://github.com/45ck/content-machine/commit/b9231628987460055ccefd8bd09734a66709e6f7))
* **captions:** add engagement animations and highlights ([c98cdac](https://github.com/45ck/content-machine/commit/c98cdaca667de00fd9c43129ba7d166ed84836bb))
* **captions:** add per-word animation options ([c17303a](https://github.com/45ck/content-machine/commit/c17303a42f13453299e50b353f17642200694f08))
* **captions:** avoid orphan terminal words ([65ce5c1](https://github.com/45ck/content-machine/commit/65ce5c117d31ef46b59f058d84d6b98af5fa7fe5))
* **captions:** update capcut defaults from phoenix loop ([034e097](https://github.com/45ck/content-machine/commit/034e097753a638f0c01083ef275a3a4f22c4623a))
* **generate:** write caption tuning settings to artifacts ([471013a](https://github.com/45ck/content-machine/commit/471013ac384606fd6a9f754461b706b338933876))
* **mcp:** add local MCP server with safety hardening ([4dc00b8](https://github.com/45ck/content-machine/commit/4dc00b86514bad5bc069c0b0ec677204b39479b0))
* **phoenix-loop:** add caption sweep runner ([aed93cb](https://github.com/45ck/content-machine/commit/aed93cb36053296b50d06e6779c28d2820f523ee))
* **quality:** add caption-quality command and tune default crop ([f9306ca](https://github.com/45ck/content-machine/commit/f9306ca054a040dd57411226d9523093e5e755d8))
* **render:** allow disabling caption highlight ([1065bb1](https://github.com/45ck/content-machine/commit/1065bb1b20ff5b387889783f083bc06b8cc78658))
* **score:** calibrate caption quality and sync matching ([cf22966](https://github.com/45ck/content-machine/commit/cf22966799336277aa44de7f0fbc208f6dd14bab))
* **score:** make sync rating robust to OCR outliers ([483959d](https://github.com/45ck/content-machine/commit/483959d27978020719d4561a8488743a01af8e9d))
* **tiktok:** better captions, badges, demo ([55be218](https://github.com/45ck/content-machine/commit/55be218ae7a98c4f894764dacff18f4de9e1a991))


### Bug Fixes

* **tiktok:** relax caption cps limit ([9d93e22](https://github.com/45ck/content-machine/commit/9d93e2221ccc006993376928272f2cdbca34f604))

## [0.2.2](https://github.com/45ck/content-machine/compare/v0.2.1...v0.2.2) (2026-01-11)


### Bug Fixes

* **ci:** restore required check names ([#26](https://github.com/45ck/content-machine/issues/26)) ([87d22d0](https://github.com/45ck/content-machine/commit/87d22d0af9f1e329d0b970384c68088d088784cc))

## [0.2.1](https://github.com/45ck/content-machine/compare/v0.2.0...v0.2.1) (2026-01-11)


### Bug Fixes

* **ci:** avoid duplicate checks on release-please PRs ([#25](https://github.com/45ck/content-machine/issues/25)) ([e7e4129](https://github.com/45ck/content-machine/commit/e7e41291627a6f97abbe79963d2e2629137c3c3f))
* **security:** force esbuild &gt;=0.27.2 ([#22](https://github.com/45ck/content-machine/issues/22)) ([1842dac](https://github.com/45ck/content-machine/commit/1842dacb32aef5fa59d8aedacf335f5896809387))

## [0.2.0](https://github.com/45ck/content-machine/compare/v0.1.0...v0.2.0) (2026-01-11)


### Features

* add caption cleanup and chunked TTS ([6f00a80](https://github.com/45ck/content-machine/commit/6f00a80fad6ac90c7f2450bb1b524c47514f1815))
* add caption pacing CLI options ([ba1d3dc](https://github.com/45ck/content-machine/commit/ba1d3dc770f6393aabb0ab357b310f63244bff4f))
* add CLI documentation, Tavily search, and validation improvements ([9f55b7c](https://github.com/45ck/content-machine/commit/9f55b7cbe68032b5224227a15bb66098edcccf7c))
* add main entry point and package update ([f32cf93](https://github.com/45ck/content-machine/commit/f32cf934ac048c8ba1c443116643bf299579f339))
* add Python helper scripts for video validation ([1234725](https://github.com/45ck/content-machine/commit/123472533e89aa004940b52f805fbc33eb656561))
* add quality gate test for validate module ([28aed2f](https://github.com/45ck/content-machine/commit/28aed2f323e0628c848560bfaa9ea1746b2f0074))
* add research module, validation pipeline, and engagement scoring docs ([be8ac67](https://github.com/45ck/content-machine/commit/be8ac67118089a8ca9f2cbf68c762c1aaf737d4a))
* add research tools infrastructure (reddit, hackernews, web-search) ([944e0d3](https://github.com/45ck/content-machine/commit/944e0d3f66e87d5b13b994a8dd92a8e6bcd1ed7b))
* add retrieval system, scene detection, and embedding infrastructure ([ab07e58](https://github.com/45ck/content-machine/commit/ab07e58f52265953b5bd554069432ef17d5c8491))
* add TTS speed option ([25454d1](https://github.com/45ck/content-machine/commit/25454d1a532dc8005c2ef6003e431c7779cf2222))
* audio-first sync pipeline with 4.4x better caption sync ([4ec6350](https://github.com/45ck/content-machine/commit/4ec6350d577dd69b1a650b165efecd90352de43f))
* **audio:** Add kokoro TTS and fallback timestamp estimation ([fa13d6e](https://github.com/45ck/content-machine/commit/fa13d6eacc710e8c723cc6b839b8d120226f7df6))
* **captions:** add single/buildup display modes and words-per-page option ([870de80](https://github.com/45ck/content-machine/commit/870de808a9037d90ee44b8d4e761b55ef2a83e4e))
* **captions:** add smart word wrapping with multi-line support ([97dd5ae](https://github.com/45ck/content-machine/commit/97dd5aec47dbe8aa0cf6c90dd03ff152f17b18a8))
* **captions:** add TikTok-native chunking with emphasis detection ([26b39a9](https://github.com/45ck/content-machine/commit/26b39a90a84ca383e98092fc3570c09c7a7a9e63))
* **captions:** filter Whisper artifacts and add animation customization ([1462eae](https://github.com/45ck/content-machine/commit/1462eae23292db653aca72f8a751bcee860b4b8c))
* **cli:** add assets management command ([ef85cae](https://github.com/45ck/content-machine/commit/ef85cae946cd88d69944acc76e81a35f17c8b6fb))
* **cli:** add capcut, hormozi, karaoke presets to help text ([35b7ce7](https://github.com/45ck/content-machine/commit/35b7ce7ec64d7c2afe960f39432e41fb00309558))
* **cli:** add global --yes/--offline hook policy ([4694be0](https://github.com/45ck/content-machine/commit/4694be089c2b37f36c33932076326e7e04258991))
* **cli:** Add mock/dry-run modes and update prompts for new schema ([f96b86d](https://github.com/45ck/content-machine/commit/f96b86dfad9920979e96116171550ffe60c1765a))
* **cli:** add render preflight and hooks offline support ([fb6ff99](https://github.com/45ck/content-machine/commit/fb6ff99b38fdcf87aab2650b078f28ce6eef75a2))
* Complete system design v8.0 with comprehensive research ([9ec94d2](https://github.com/45ck/content-machine/commit/9ec94d22159bfca848f7e20a357aa2520152a11a))
* configure husky pre-commit hooks with lint-staged, increase CLI test timeout ([5bf7bea](https://github.com/45ck/content-machine/commit/5bf7bea954cf53524370351791974c33d34ef32f))
* **core:** Add retry logic and fix LLM model response ([9d41752](https://github.com/45ck/content-machine/commit/9d41752968bd484806bbb77304c348c280a647b2))
* **e2e:** Complete E2E pipeline with real TTS, Pexels, and Remotion ([d1efeea](https://github.com/45ck/content-machine/commit/d1efeea1b03dd6d5aa2135256121f54a80f0b6d8))
* enable strict mode and pre-commit hooks ([3265601](https://github.com/45ck/content-machine/commit/32656015034bbcc7f01159aa8e031b7a8fbfb117))
* enhance CLI UX and caption tooling ([cfb7f03](https://github.com/45ck/content-machine/commit/cfb7f03b45e0b13f19aaf45d920771a8390050d1))
* **eval:** add V&V framework with LLM-as-judge evaluation system ([fdd5305](https://github.com/45ck/content-machine/commit/fdd5305d12835466acf485f568a1e2bf5c099c46))
* extend render caption controls ([42d9b6e](https://github.com/45ck/content-machine/commit/42d9b6e424f75647e46a823d494d465032c604f8))
* **phase0:** Complete Phase 0 infrastructure + Phase 1-4 scaffolding ([a651ecb](https://github.com/45ck/content-machine/commit/a651ecb8ab523d3879b84b9754ecd2c1f6a53be2))
* **phoenix-loop-3:** add punctuation restoration and paging quality tests ([be7bf3f](https://github.com/45ck/content-machine/commit/be7bf3fac23ca9e5d0a146e5ad37d31e3fcfa845))
* **phoenix-loop-4:** add pacing quality metrics - 91.7% score ([60be97e](https://github.com/45ck/content-machine/commit/60be97ed4dc1f33d54ed1ae778de9a90fe27f266))
* **phoenix-loop-5:** engagement quality 95% ([2070dd5](https://github.com/45ck/content-machine/commit/2070dd56ecddd2a325eadfbe5de038eb14357820))
* **phoenix-loop-6:** audio quality 88% - found breathing room issues ([6f96837](https://github.com/45ck/content-machine/commit/6f968373948509932de6e5a69d741eb069bfe6e8))
* **pipeline:** Add full mock mode for E2E testing ([e11ed16](https://github.com/45ck/content-machine/commit/e11ed1668c2c9f995fbdf8cb629adc82f85935f9))
* polish CLI summaries and caption cleanup ([3ae5c26](https://github.com/45ck/content-machine/commit/3ae5c267dfb8b777a82fcae188f41004a19ffedf))
* **quality:** add caption quality metrics and ASR post-processor ([6e0184a](https://github.com/45ck/content-machine/commit/6e0184ac1641642b490a18931b6a90e04801eb9f))
* **quality:** add security scanning - TASK-013 complete ([3e361a8](https://github.com/45ck/content-machine/commit/3e361a855bac92bd0f92131877d9a45454cb5606))
* **render:** Fix ESM __dirname and add render test ([50eeeff](https://github.com/45ck/content-machine/commit/50eeeff5d9b8271f9fb1c84e8f9164f3c71c8918))


### Bug Fixes

* add eslint-disable for complex functions, add visuals tests ([476e31f](https://github.com/45ck/content-machine/commit/476e31f65d97aa3df1d7a3f2ab3fe4de34a85155))
* add timeout to CLI test helper, fix ora stderr output, skip unimplemented tests ([8c8cd08](https://github.com/45ck/content-machine/commit/8c8cd0805ba442d7d001bb046e525c78f56115bb))
* align test expectations with schema defaults ([6289fbd](https://github.com/45ck/content-machine/commit/6289fbdd69c7cfe586d6b1353f6221617dff7469))
* **captions:** filter TTS markers and ASR artifacts from captions ([96eedc2](https://github.com/45ck/content-machine/commit/96eedc21184736bbe811faf677fa9d29fa4e17f6))
* **captions:** sentence boundaries trigger new pages + hook deduplication ([7020b15](https://github.com/45ck/content-machine/commit/7020b151001741e237c332025c803ddffdb3cd18))
* **captions:** update presets to support multi-line captions ([fa5b573](https://github.com/45ck/content-machine/commit/fa5b57394ed74ec467ff1b832eae05613573f887))
* **cli:** Fix duplicate spinner messages in generate command ([de256bb](https://github.com/45ck/content-machine/commit/de256bbe10e367caeaf05fad344acb433072c5e6))
* **cli:** honor CM_OFFLINE/CM_YES env ([#17](https://github.com/45ck/content-machine/issues/17)) ([2a603c4](https://github.com/45ck/content-machine/commit/2a603c4f3267db109b7d3fa22d2ea6986ab1a63b))
* complete validate module implementation ([bfc09c7](https://github.com/45ck/content-machine/commit/bfc09c7074924ffea568bf0d988a7e862dd8a00d))
* enhance TTS marker and ASR artifact filtering ([c0c8c2a](https://github.com/45ck/content-machine/commit/c0c8c2a525a4f69928816ea5ca4f52e0753528c8))
* enhance TTS marker and ASR artifact filtering with confidence thresholds ([f24c43e](https://github.com/45ck/content-machine/commit/f24c43e07a292aafd3e3947d889b5be08736bff7))
* fix remaining test and formatting issues ([3df2044](https://github.com/45ck/content-machine/commit/3df2044a090c26fd7b3973139ed8c98490cbb365))
* minor updates to validation and documentation ([fb76ca8](https://github.com/45ck/content-machine/commit/fb76ca8d3e498ff54a83e48d6df286fc7bb3126a))
* **phoenix-loop-1:** improve caption quality to 99.2% ([a4e356b](https://github.com/45ck/content-machine/commit/a4e356b3f5ec6f32a40e95e3f4a2f43d82784e0b))
* **phoenix-loop-2:** boost confidence for pattern-matched merges to 99.4% ([23bc38b](https://github.com/45ck/content-machine/commit/23bc38bf7a5771f23095e2a42536b2df3155ded4))
* **release-please:** don\u2019t fail when dispatch races ([#20](https://github.com/45ck/content-machine/issues/20)) ([9597508](https://github.com/45ck/content-machine/commit/95975087bda916fff3bf1466c1c03af087327d2a))
* remove unused imports from decorators test ([02494c1](https://github.com/45ck/content-machine/commit/02494c133bf0a7db22661be1df264a0ce65c607b))
* remove unused vi import from web-search.test.ts ([325d134](https://github.com/45ck/content-machine/commit/325d13445d98203b8a3c977789e894f0391bcf62))
* **render:** allow mock preflight without audio file ([3c044f3](https://github.com/45ck/content-machine/commit/3c044f3cd67c8eb2af85b10e9471f05d3f16d71f))
* **render:** Proper ESM/CJS path resolution ([391bfa4](https://github.com/45ck/content-machine/commit/391bfa4c02e9ec860586121747439275c82d0116))
* **render:** Use ESM/CJS compatible path resolution ([ad477bb](https://github.com/45ck/content-machine/commit/ad477bb609ec51752012504d010b21c92c9c90ad))
* resolve remaining TypeScript and ESLint quality issues ([28b9204](https://github.com/45ck/content-machine/commit/28b92045cf54d2091d5a58975ea46f32a16afa75))
* resolve TypeScript and ESLint issues - clean quality gates ([558561f](https://github.com/45ck/content-machine/commit/558561f556d33b9a709caff8ee1b995d241d7c79))
* restore corrupted package.json ([3d92b60](https://github.com/45ck/content-machine/commit/3d92b6075d2678f1b691d7a5ebf3106c8583d048))
* update audio, render, visuals commands and scorer tests ([13e219c](https://github.com/45ck/content-machine/commit/13e219ca6ec9bcbddd91ca288e7cee223176db2c))
* update CI workflow to use master branch ([2407ea2](https://github.com/45ck/content-machine/commit/2407ea24891cb64a84fd002fff810b888c81c4aa))
* update CLI commands and scorer ([ca61ea2](https://github.com/45ck/content-machine/commit/ca61ea2155512b9af59e860847df70557ad978de))
* update CLI integration test helpers ([f132b3c](https://github.com/45ck/content-machine/commit/f132b3c6198a52166d44d6ada84d4a285f686fdc))
* update CLI UX guide for cm research ([c723330](https://github.com/45ck/content-machine/commit/c723330506a88e0790ca08f78c58fb3a8a44f0a4))
* update CLI UX guide for cm script ([712b901](https://github.com/45ck/content-machine/commit/712b90160bc4e45b4b3205132702a8246d8b5d76))
* update embeddings, retrieval, and scene detection modules ([26fd1dc](https://github.com/45ck/content-machine/commit/26fd1dc74022476fdc629e95c63dd270c6f138cf))
* update generate reference, retrieve command, and indexer ([641a5d8](https://github.com/45ck/content-machine/commit/641a5d85e3dc6e7aba692e24fea626cc93f10de9))
* update integration tests and generate command ([2bc342a](https://github.com/45ck/content-machine/commit/2bc342a19b02458d4d903cb4afa69bb31f2edd23))
* update main entry point ([3617d5d](https://github.com/45ck/content-machine/commit/3617d5dee0b9ff9c4438125e15601d82bb9e049d))
* update package command ([82210f8](https://github.com/45ck/content-machine/commit/82210f8a35f348287b688c17f60a5eba54c3ffde))
* update pipeline modules and move TASK-018 to done ([c3ec250](https://github.com/45ck/content-machine/commit/c3ec2508a216dac32a09d22bd08248d7ca486379))
* update quality.ts validation module ([4ad2fbd](https://github.com/45ck/content-machine/commit/4ad2fbd079529cc4a098cb0d3dfae1d4f1714085))
* update research reference and indexer tests ([7bfd24c](https://github.com/45ck/content-machine/commit/7bfd24cf88f8fa3ed9fd40af2aa6853f6f253954))
* update script command ([d794fd4](https://github.com/45ck/content-machine/commit/d794fd4ddf7b62accbbf919650f6cf4ce48d60a0))
* update script command and CLI utils ([f764906](https://github.com/45ck/content-machine/commit/f7649069da2c10b87196fd1ff3b5c7016869c81b))
* update script command, format, and runtime tests ([4189a17](https://github.com/45ck/content-machine/commit/4189a17da5d1eb5f6a8af35456f962d870a59bc4))
* update validate command ([199a931](https://github.com/45ck/content-machine/commit/199a931e0235e0de00713f6c4549ba604326b982))
* update validate command ([5aaea97](https://github.com/45ck/content-machine/commit/5aaea97d22330cc592174d4df49cb8b461ad509f))
* **visuals:** prefer HD video quality to avoid renderer crashes ([daa5bed](https://github.com/45ck/content-machine/commit/daa5bedf2a31c036e36fed24d2c15d42e813dd10))

## Changelog

Release notes are generated via Release Please.
