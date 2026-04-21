# **Prompt Compiler Design**

## **Input schema**

```json
{
  "format": "educational",
  "objective": "save_rate",
  "hook_type": "contradiction",
  "target_wpm": 182,
  "target_arousal": 0.62,
  "persona": "calm technical authority",
  "avoid": ["announcer", "influencer hype", "flat AI cadence"],
  "script": "Your clip is not too slow. Your audio has no job."
}
```

## **Compiled TTS prompt**

```text
Generate short-form narration.

Voice identity:
Close-mic, calm technical authority.

Delivery:
Start immediately.
First sentence sharp and faster.
Pause 250–350 ms after the first sentence.
Lower pitch slightly on the second sentence.
Emphasize: “not too slow”, “audio”, “no job”.

Pace:
Target 175–190 WPM.

Arousal:
Medium-high, controlled.

Avoid:
Announcer voice.
Influencer hype.
Flat AI cadence.
Overacting.

Script:
“Your clip is not too slow. Your audio has no job.”
```

## **Compiled music prompt**

```json
{
  "format": "voice_led_explainer",
  "duration": 22,
  "target_bpm": 122,
  "target_arousal": 0.58,
  "voice_space": "high",
  "loop_required": true,
  "lead_vocal": false,
  "rights": "commercial_safe"
}
```

Outputs a structure-specific prompt with timing, instrumentation, mix, and safety constraints.
