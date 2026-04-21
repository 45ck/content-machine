# **Research Synthesis: Viral Short-Form Audio**

## **1. Audio as platform-native structure**

Short-form platforms treat sound as a first-class content object. On TikTok, a sound can become a recognizable unit that users search, save, remix, and reinterpret. This makes audio more than background music: it becomes a **template carrier**.

Practical implication:

```text
A sound should be designed as a reusable structure, not merely a mood layer.
```

## **2. Audio and recommendation context**

TikTok’s official recommendation explanation identifies user interactions, video information, and device/account settings as recommendation inputs. Video information includes signals such as captions, sounds, and hashtags. This supports modelling audio as a meaningful metadata/content signal.

## **3. Sound and creative performance**

TikTok’s creative guidance states that over 93% of top-performing videos use audio. The engineering interpretation is not that “any audio works,” but that silent or weakly designed audio is structurally disadvantaged in a sound-native feed.

## **4. Arousal and sharing**

Berger and Milkman’s virality research shows that high-arousal emotions are more shareable than low-arousal states. For audio design, arousal is affected by:

```text
tempo
rhythmic density
voice urgency
loudness contour
risers
impact hits
silence contrast
harmonic tension
```

Engineering implication:

```math
ShareRate = f(Arousal, Surprise, IdentitySignal, PracticalValue, TemplatePotential)
```

## **5. Voice and prosody**

Generated speech should not be judged only by textual script quality. It should be judged by:

```text
speech rate
pitch variance
pause placement
emphasis density
naturalness
voice/music separation
first-word timing
```

## **6. Music as an editing asset**

Generated music should be prompted and evaluated as a timeline asset:

```text
0.0s transient
0.5–4s groove
4–10s development
10–15s riser
15–19s payoff
19–22s loop return
```

## **7. Learned audio representations**

Systems such as CLAP and PANNs support semantic audio retrieval and embedding-based analysis. The practical use cases are:

```text
retrieve audio by natural-language description
cluster audio assets
measure brand fit
score similarity between candidate audio and desired emotional/format target
```

## **8. Legal/platform layer**

Audio generation must be constrained by:

```text
copyright risk
voice consent risk
synthetic disclosure risk
platform policy risk
brand safety risk
```

This creates a constrained optimization problem rather than pure virality maximization.
