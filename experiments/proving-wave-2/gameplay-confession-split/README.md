# Gameplay Confession Split

`proving-wave-2` lane-local attempt to turn the gameplay-confession
archetype into a materially stronger real example than the wave-1
procedural-card fallback.

Goals:

- use only lane-local top support clips and gameplay
- avoid template-card energy
- default to the `native-full-bleed-split` variant
- remove black gutters from source clips by center-cropping useful
  content into each lane
- keep top-lane changes alive every `2s` to `4s`
- ship real caption sidecars and a publish-prep review bundle

Rebuild the current native-feel example with:

```bash
node --import tsx scripts/harness/caption-export.ts < experiments/proving-wave-2/gameplay-confession-split/requests/caption-export.json
experiments/proving-wave-2/gameplay-confession-split/tools/build-native-assembly.sh
```
