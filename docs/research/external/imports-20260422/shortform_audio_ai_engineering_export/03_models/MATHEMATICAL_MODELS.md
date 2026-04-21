# **Mathematical Models**

## **1. Multimodal video object**

A short-form video is:

```math
v_i = (A_i, X_i, T_i, M_i, C_i)
```

Where:

| Symbol | Meaning |
|---|---|
| `A_i` | audio waveform, speech, music, SFX, silence |
| `X_i` | visual frames |
| `T_i` | transcript, captions, on-screen text |
| `M_i` | metadata: platform, creator, duration, topic, post time |
| `C_i` | context: trend state, audience segment, platform state |

Outcome vector:

```math
Y_i = [R_{1s}, R_{3s}, R_{6s}, R_{full}, Replay, Like, Comment, Share, Save, Follow, SoundReuse]
```

## **2. Audio feature vector**

```math
a_i = [a^{hook}, a^{speech}, a^{music}, a^{sfx}, a^{structure}, a^{emotion}, a^{brand}, a^{risk}]
```

## **3. Acoustic features**

### **RMS energy**

```math
RMS_t = sqrt((1/N) * Σ x_t[n]^2)
```

### **Spectral centroid**

```math
Centroid_t = (Σ f_k S[k,t]) / (Σ S[k,t])
```

### **Onset strength**

```math
Onset_t = Σ_k max(0, S[k,t] - S[k,t-1])
```

### **MFCCs**

```math
MFCC = DCT(log(MelSpectrogram(x)))
```

## **4. First-second hook model**

```math
P(R_{1s}=1) = σ(β₀ + β₁ SonicEvent_{0.5} + β₂ VoiceStart_{0.5} + β₃ TransientStrength_{0.5} + β₄ AudioNovelty_{0.5} + β₅ VisualMotion_{0.5} + β₆ CaptionHook)
```

Where:

```math
SonicEvent_{0.5} = 1(FirstSoundTime < 500ms)
```

```math
TransientStrength_{0.5} = z(RMS_{0.5}) + z(OnsetDensity_{0.5}) + z(Centroid_{0.5})
```

## **5. Retention as survival**

Let watch time be `T_i` and duration be `D_i`.

```math
S_i(t) = P(T_i ≥ t)
```

Cox-style hazard:

```math
h_i(t) = h_0(t) exp(θᵀ z_{i,t})
```

Retention curve:

```math
S_i(t) = exp(-∫₀ᵗ h_i(u)du)
```

Discrete approximation:

```math
P(Drop_{i,t}=1) = σ(α_t + θᵀ z_{i,t})
```

```math
S_i(t) = Π_{u=1}^{t} (1 - P(Drop_{i,u}=1))
```

## **6. Multi-objective reward**

```math
Reward_i = λ₁ z(ViewLift_i) + λ₂ z(Completion_i) + λ₃ z(Replay_i) + λ₄ z(ShareRate_i) + λ₅ z(SaveRate_i) + λ₆ z(CommentRate_i) + λ₇ z(FollowRate_i)
```

Format-specific reward examples:

### **Education**

```math
Reward_{edu} = 0.20ViewLift + 0.25Completion + 0.10Replay + 0.10Share + 0.25Save + 0.05Comment + 0.05Follow
```

### **Meme/commentary**

```math
Reward_{meme} = 0.25ViewLift + 0.15Completion + 0.20Replay + 0.25Share + 0.05Save + 0.10Comment
```

## **7. Audio lift**

```math
AudioLift_i = Reward_i - E[Reward | Creator, Topic, Format, Duration, PostHour, Platform]
```

## **8. Nonlinear arousal optimum**

```math
Reward_i = β₀ + β₁ Arousal_i + β₂ Arousal_i² + ε_i
```

If `β₂ < 0`:

```math
Arousal* = -β₁ / (2β₂)
```

## **9. Final optimization equation**

```math
A^* = argmax_A [λ₁ R̂₃s + λ₂ Completion̂ + λ₃ Replaŷ + λ₄ Sharê + λ₅ Savê + λ₆ Folloŵ + λ₇ SoundReusê - λ₈ Risk - λ₉ BrandDrift]
```

Subject to:

```text
FirstSoundMS < 500
VoiceSeparation > threshold
Risk < threshold
RightsSource ∈ ApprovedSources
DisclosureStatus = Valid
```
