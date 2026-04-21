# **Implementation Checklist**

## **Build the asset bank**

- [ ] Create folders for voice, music, SFX, brand marks.
- [ ] Log rights source for every asset.
- [ ] Add feature metadata for every asset.
- [ ] Add historical performance once tested.

## **Build the extraction pipeline**

- [ ] Extract audio with FFmpeg.
- [ ] Run `extract_audio_features.py`.
- [ ] Transcribe speech.
- [ ] Estimate speech rate, pitch, pauses.
- [ ] Detect first sound, first voice, and first transient.

## **Build the scoring layer**

- [ ] Normalize features.
- [ ] Calculate Viral Audio Score.
- [ ] Calculate risk score.
- [ ] Output publish/regenerate recommendations.

## **Run the first test**

- [ ] Pick one format.
- [ ] Create 30 clips.
- [ ] Make 3 audio variants per idea.
- [ ] Track 24h, 72h, and 7d metrics.
- [ ] Calculate audio lift.

## **Train first model**

- [ ] Train completion predictor.
- [ ] Train share/save count models.
- [ ] Inspect feature importance.
- [ ] Update prompt templates.

## **Scale**

- [ ] Add uplift model.
- [ ] Add bandit strategy selection.
- [ ] Add CLAP/PANNs embeddings.
- [ ] Add multimodal alignment features.
