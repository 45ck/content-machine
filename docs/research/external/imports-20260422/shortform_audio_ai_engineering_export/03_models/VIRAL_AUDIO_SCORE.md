# **Viral Audio Score**

## **Definition**

```math
VAS_i = w₁ Hook_i + w₂ Clarity_i + w₃ ArousalFit_i + w₄ RhythmFit_i + w₅ Congruence_i + w₆ Loopability_i + w₇ TemplatePotential_i + w₈ BrandMemory_i - w₉ Risk_i
```

Normalize:

```math
VAS_i ∈ [0,100]
```

## **Initial weights**

| Component | Weight |
|---|---:|
| Hook | 0.18 |
| Clarity | 0.16 |
| Arousal fit | 0.15 |
| Rhythm fit | 0.13 |
| Congruence | 0.13 |
| Loopability | 0.10 |
| Template potential | 0.08 |
| Brand memory | 0.04 |
| Risk penalty | -0.03 |

## **Hook score**

```math
Hook_i = 0.35SonicEvent_{0.5} + 0.25VoiceOrTrendStart_{1s} + 0.20TransientStrength_{0.5} + 0.20SemanticHook
```

## **Clarity score**

```math
Clarity_i = 0.45VoiceMusicSeparation + 0.25SpeechIntelligibility + 0.20CaptionAlignment + 0.10NoiseControl
```

## **Arousal fit**

```math
ArousalFit_i = 1 - |Arousal_i - ArousalTarget_{format}|
```

## **Rhythm fit**

```math
RhythmFit_i = #CutsWithinBeatWindow / #TotalCuts
```

## **Loopability**

```math
Loopability_i = 1 - Distance(AudioEndEmbedding, AudioStartEmbedding)
```

## **Template potential**

```math
TemplatePotential_i = 0.30Repetition + 0.25Catchphrase + 0.20BeatCue + 0.15MemeRoleClarity + 0.10ReuseSimplicity
```

## **Interpretation**

- **0–40:** structurally weak audio.
- **40–60:** usable but likely generic.
- **60–75:** publishable.
- **75–90:** strong candidate.
- **90–100:** exceptional; likely requires both strong creative and low risk.
