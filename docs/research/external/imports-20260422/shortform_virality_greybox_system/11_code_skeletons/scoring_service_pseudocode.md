# Scoring Service Pseudocode

```python
@app.post("/score/draft")
def score_draft(request: DraftScoreRequest):
    video = load_video(request.video_uri)

    features = feature_service.get_or_extract(video)
    signal_scores = {}

    for signal_model in PRE_PUBLISH_MODELS:
        signal_scores[signal_model.name] = signal_model.predict(features)

    final_score = final_pre_publish_model.predict_proba(signal_scores)

    diagnostics = generate_diagnostics(signal_scores, features)

    return {
        "video_id": request.video_id,
        "pre_publish_vps": final_score * 100,
        "subscores": signal_scores,
        "diagnostics": diagnostics,
    }
```

```python
@app.post("/score/live")
def score_live(request: LiveScoreRequest):
    prepublish = load_prepublish_scores(request.video_id)
    normalized = normalize_live_metrics(request.metrics)
    wave_probs = bayesian_wave_model.update_and_predict(normalized)
    live_score = live_breakout_model.predict_proba({
        **prepublish,
        **normalized,
        **wave_probs,
    })

    return {
        "video_id": request.video_id,
        "live_breakout_score": live_score * 100,
        "wave_probabilities": wave_probs,
    }
```
