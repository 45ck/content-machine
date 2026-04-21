# **Feature Definitions**

## **Clip-level audio features**

```json
{
  "first_sound_ms": 0,
  "first_voice_ms": 180,
  "first_transient_ms": 0,
  "mean_rms": 0.12,
  "rms_first_500ms": 0.18,
  "silence_ratio": 0.08,
  "tempo_bpm": 124,
  "onset_density": 3.2,
  "spectral_centroid_mean": 2850,
  "spectral_centroid_first_500ms": 4100,
  "speech_rate_wpm": 184,
  "pitch_mean_hz": 145,
  "pitch_std_hz": 38,
  "pause_ratio": 0.13,
  "emphasis_density": 0.21,
  "voice_music_ratio_db": 8.5,
  "estimated_valence": 0.62,
  "estimated_arousal": 0.71,
  "audiovisual_congruence": 0.78,
  "loop_score": 0.66,
  "template_score": 0.59,
  "brand_fit": 0.72,
  "risk_score": 0.12
}
```

## **Audio event types**

```text
voice_hook
impact
beat
riser
drop
silence
foley
meme_cue
caption_tick
transition
brand_mark
payoff
```

## **Visual features**

```text
motion_intensity
cut_density
face_presence
object_novelty
text_density
brightness
visual_complexity
reveal_event
```

## **Text features**

```text
caption_change
semantic_hook
keyword_emphasis
CTA_presence
question_presence
curiosity_gap
identity_signal
```

## **Metadata features**

```text
creator_id
platform
topic
format_type
post_hour
duration_sec
follower_count
trend_state
audio_source
rights_source
```
