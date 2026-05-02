# Provenance And License Gates

Use this before copying, downloading, generating, packaging, or
publishing any external creative asset.

This is practical engineering guidance, not legal advice.

## Usage Modes

- `inspiration-only`: study the visual grammar; do not copy assets or
  source code.
- `code-native-rebuild`: rebuild an original Remotion, SVG, Canvas,
  CSS, or Three.js version from the idea.
- `downloaded-asset`: copy or download a model, texture, clip, icon,
  font, audio file, or image.
- `generated-asset`: create media from an AI provider or local workflow.
- `reference-provider`: use a provider/model/API as an execution
  surface; record model and account-specific terms.

Prefer `inspiration-only` or `code-native-rebuild` when rights are
unclear.

## Asset Ledger Fields

Every external asset that reaches a public render should have:

- `assetId`
- `assetType`
- `localPath`
- `sourceUrl`
- `provider`
- `author`
- `title`
- `licenseName`
- `licenseUrl`
- `retrievedAt`
- `fileHash`
- `usageMode`
- `attributionText`
- `modifications`
- `rightsFlags`
- `evidenceFiles`
- `reviewStatus`

For AI generation, also store:

- `model`
- `providerJobId`
- `statusUrl`
- `prompt`
- `negativePrompt`
- `referenceAssets`
- `seed`
- `settings`
- `cost`
- `outputHash`

## Safer Defaults

- **UI/icons/fonts**: Heroicons, Lucide, Google Fonts, and Fontsource
  are usually lower-friction than marketplace assets.
- **3D/textures**: Poly Haven and ambientCG are usually lower-friction
  because assets are CC0, but still record provenance.
- **Stock visuals**: Pexels, Unsplash, and Pixabay are practical search
  starting points, but store creator/source evidence.
- **Audio**: prefer CC0 or clearly commercial-safe sources with claim
  evidence. Audio needs stricter records than still images; use
  [audio-source-policy.md](audio-source-policy.md) for music, SFX,
  ambience, and YouTube-origin audio.

## Must Verify Per Asset

- Mixkit, Coverr, Videvo, Noun Project, OpenMoji, Sketchfab, Mixamo,
  OpenGameArt, Quaternius, Kenney, paid component libraries, and any
  AI-generation provider.
- Free/pro status, redistribution restrictions, attribution, account
  plan scope, editorial-only flags, watermark rules, and model/provider
  terms can vary.

## Hard Rejects

- visible watermark, preview badge, marketplace sample mark, or audio
  sample tag
- missing or inconsistent license/source page
- rehosted asset with no official source
- `editorial use only` for OSS demo marketing, README media, product
  demos, or promotional shorts
- CC BY-NC, CC BY-ND, CC BY-NC-ND, Sampling+, personal-use-only, or
  free-for-non-commercial assets for public demos
- recognizable people, brands, private property, trademarks, protected
  artwork, copyrighted characters, or product UI where releases or
  trademark rights are unclear
- music likely to trigger Content ID without stored proof or certificate
- arbitrary YouTube audio downloads or reuploaded “no copyright” mixes
  without ownership, explicit permission, official download/export, or
  compatible license plus permitted access
- AI references containing copyrighted characters, real-person likeness,
  copyrighted music, or unclear input rights

## Attribution

Use TASL-style attribution where possible:

- title
- author
- source
- license
- modification note

Even when attribution is not required, storing it makes demos easier to
audit and defend later.

## Publish Gate

Before public promotion, the render should have:

- no watermark or unexpected source text
- compatible license status for every external asset
- source notes or asset ledger available
- attribution text for assets that require or benefit from it
- no unknown AI model/provider terms for generated media
- no missing source evidence for demo-critical visuals or audio
