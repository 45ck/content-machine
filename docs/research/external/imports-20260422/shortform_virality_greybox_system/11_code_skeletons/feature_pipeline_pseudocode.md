# Feature Pipeline Pseudocode

```python
def extract_features(video):
    features = {}

    features.update(extract_video_embeddings(video.path))
    features.update(extract_motion_features(video.path))
    features.update(extract_frame_salience(video.path))

    audio_path = extract_audio(video.path)
    features.update(extract_audio_embeddings(audio_path))
    features.update(extract_audio_energy(audio_path))

    transcript = transcribe(audio_path)
    features["transcript"] = transcript
    features.update(extract_text_embeddings(transcript, video.caption))
    features.update(extract_hook_language_features(transcript, video.caption))

    features.update(extract_ocr_features(video.path))
    features.update(extract_pacing_features(video.path, transcript))
    features.update(extract_eligibility_features(video.path, audio_path, transcript))

    if TRIBE_ENABLED:
        tribe_raw = run_tribe(video.path, audio_path, transcript)
        features.update(compress_tribe_features(tribe_raw))

    return features
```

## Pipeline stages

```text
download asset
hash asset
extract frames/audio
transcribe
extract embeddings
extract scalar features
write feature store rows
record feature versions
```
