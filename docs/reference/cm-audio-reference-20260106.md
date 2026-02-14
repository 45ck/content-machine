# cm-audio reference (20260106)

Generate a voiceover WAV and word-level timestamps from a script JSON.

## Synopsis

```bash
cm audio [options]
```

## Inputs

- `--input`: script JSON from `cm script`

## Outputs

- Audio WAV at `--output` (default `audio.wav`)
- Timestamps JSON at `--timestamps` (default `timestamps.json`)
- Optional mix plan at `--audio-mix` when music/SFX/ambience is enabled

## Options

- `-i, --input <path>`: input script JSON file (required)
- `-o, --output <path>`: output audio file path (default: `audio.wav`)
- `--timestamps <path>`: output timestamps file path (default: `timestamps.json`)
- `--voice <voice>`: TTS voice id (default: `af_heart`)
- `--tts-engine <engine>`: TTS engine (`kokoro`, `elevenlabs`)
- `--tts-speed <n>`: TTS speaking speed (e.g. `1.0`, `1.2`)
- `--asr-engine <engine>`: timestamp engine (`whisper`, `elevenlabs-forced-alignment`)
- `--sync-strategy <strategy>`: sync strategy (`standard`, `audio-first`)
- `--reconcile`: reconcile ASR output to match original script text
- `--require-whisper`: require whisper ASR (fail if unavailable)
- `--whisper-model <model>`: Whisper model size (`tiny`, `base`, `small`, `medium`, `large`)
- `--audio-mix <path>`: output audio mix plan (default: `audio.mix.json`)
- `--music <pathOrPreset>`: background music track or preset name
- `--no-music`: disable background music (overrides config defaults)
- `--music-volume <db>`: music volume in dB
- `--music-duck <db>`: duck music under voice in dB
- `--music-loop` / `--no-music-loop`: toggle music looping
- `--music-fade-in <ms>` / `--music-fade-out <ms>`: music fades
- `--sfx <path>`: SFX file path (repeatable)
- `--sfx-pack <id>`: SFX pack id (built-in examples: `pops`, `whoosh`, `glitch`, `clicks`)
- `--sfx-at <placement>`: auto placement (hook, scene, list-item, cta)
- `--sfx-volume <db>`: SFX volume in dB
- `--sfx-min-gap <ms>`: minimum gap between SFX
- `--sfx-duration <seconds>`: default SFX duration
- `--no-sfx`: disable SFX (overrides config defaults)
- `--ambience <pathOrPreset>`: ambience bed track or preset name
- `--no-ambience`: disable ambience (overrides config defaults)
- `--ambience-volume <db>`: ambience volume in dB
- `--ambience-loop` / `--no-ambience-loop`: toggle ambience looping
- `--ambience-fade-in <ms>` / `--ambience-fade-out <ms>`: ambience fades
- `--mix-preset <id>`: audio mix preset id (built-in examples: `clean`, `punchy`, `cinematic`, `viral`)
- `--lufs-target <db>`: target loudness for final mix
- `--mock`: use mock TTS/ASR (writes placeholder audio/timestamps)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure
- `2`: invalid arguments / missing files / invalid JSON

## Examples

```bash
cm audio -i out/script.json -o out/audio.wav --timestamps out/timestamps.json
cm audio -i script.json --voice af_heart
cm audio -i script.json --tts-engine elevenlabs --asr-engine elevenlabs-forced-alignment
cm audio -i script.json --music lofi-01 --sfx-pack pops --audio-mix audio.mix.json
```

## See also

- `docs/guides/guide-cli-ux-cm-audio-20260106.md`
- `docs/guides/guide-audio-options-20260110.md`
- `docs/reference/cm-visuals-reference-20260106.md`
