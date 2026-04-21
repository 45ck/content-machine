# Per-Signal Five-Method Rankings

This file consolidates the five ranked build methods for every signal. Each signal has its own detailed file in `02_signal_models/`.

## Best method per signal

| # | Signal | Winning method | Score |
|---|---|---|---|
| 1 | Eligibility / Originality Gate | Hybrid eligibility gate | 94 |
| 2 | Scroll-Stop / Hook Model | 0–3s multimodal hook model plus viewed-vs-swiped supervised label | 96 |
| 3 | Retention / Watch-Time Model | Survival-curve retention model | 97 |
| 4 | Positive Intent Model | Multi-task intent model | 95 |
| 5 | Shareability Psychology Model | Social-value classifier plus practical-value model | 94 |
| 6 | Saveability / Utility Model | Utility-content classifier | 93 |
| 7 | Audience Fit / Topic Routing Model | Dual-tower video/audience model | 95 |
| 8 | Audience Pool / Reach Ceiling Model | Demand/supply pool model | 91 |
| 9 | Creator Trust / Baseline Model | Hierarchical Bayesian baseline | 96 |
| 10 | Relationship / Warm-Audience Model | Follower/non-follower split model | 93 |
| 11 | Trend Freshness Model | Trend velocity model | 92 |
| 12 | Saturation / Fatigue Model | Embedding-density saturation model | 93 |
| 13 | Negative Feedback Risk Model | Multi-task negative-risk model | 96 |
| 14 | Exploration / Uncertainty Model | Contextual bandit variant selector | 93 |
| 15 | Expansion-Wave Model | Bayesian wave model | 97 |
| 16 | Cascade / Diffusion Model | Self-exciting velocity model | 89 |
| 17 | TRIBE Neural-Response Model | ROI/time-window compression | 94 |
| 18 | Multimodal Content-Quality Model | Video/audio/text embedding model | 95 |
| 19 | Final Score / Calibration Model | Stacked ensemble plus platform-specific calibrators | 97 |

## Full rankings

## 1. Eligibility / Originality Gate

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Hybrid eligibility gate | Combine rules, OCR, watermark detection, duplicate detection, safety classifier, audio risk, technical quality, and account-health flags. | 94 |
| 2 | Originality / duplicate detector | Use perceptual hashing, audio fingerprinting, frame similarity, transcript similarity, and near-duplicate search against your own library and known reposts. | 91 |
| 3 | Policy / safety classifier | Classify regulated, violent, sexual, medical, misleading, shocking, hateful, or otherwise recommendation-risky material. | 86 |
| 4 | Technical quality gate | Score aspect ratio, resolution, bitrate, crop, dead frames, volume, clipping, compression artifacts, unreadable captions. | 82 |
| 5 | Account-health anomaly detector | Detect when normal engagement produces abnormally low non-follower reach, implying account-level or eligibility suppression. | 78 |


## 2. Scroll-Stop / Hook Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | 0–3s multimodal hook model | Use first 3 seconds of video, audio, transcript, captions, OCR text, motion, and first-frame features. | 96 |
| 2 | Viewed-vs-swiped supervised model | Train directly on YouTube Shorts viewed-vs-swiped data, then adapt to TikTok/Reels using 1s/3s hold proxies. | 94 |
| 3 | First-frame salience model | Score face/object/text visibility, contrast, novelty, recognizability, and visual clarity. | 88 |
| 4 | Hook-language classifier | Score curiosity gap, contradiction, specificity, payoff promise, social stakes, and clarity. | 85 |
| 5 | TRIBE hook-response model | Run TRIBE on the opening seconds and compress predicted brain response into hook peak, slope, and volatility features. | 76 |


## 3. Retention / Watch-Time Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Survival-curve model | Predict S(t)=P(viewer still watching at second t), then derive watch time, APV, completion, and end retention. | 97 |
| 2 | Sequence transformer retention model | Use frame/audio/text sequences to predict retention curve and drop-off points. | 91 |
| 3 | Pacing feature model | Use cut rate, speech pace, silence, subtitle density, motion, scene changes, and information density. | 87 |
| 4 | Open-loop / payoff timing model | Detect when the hook promise is made, when payoff arrives, and whether the delay is too long. | 83 |
| 5 | TRIBE response-decay model | Use predicted neural response drop, volatility, flatness, and overload as retention features. | 78 |


## 4. Positive Intent Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Multi-task intent model | One model predicts P(like), P(comment), P(share), P(save), P(follow), and P(profile visit). | 95 |
| 2 | Weighted intent utility model | Manually or empirically weight shares/saves/follows above likes. | 91 |
| 3 | Separate specialist heads | Train separate share, save, comment, follow, and like models, then combine. | 87 |
| 4 | LLM intent classifier | Use transcript/caption/visual description to score usefulness, debate, identity, humor, CTA, and follow reason. | 79 |
| 5 | CTA-only model | Detect explicit save/share/comment/follow prompts. | 58 |


## 5. Shareability Psychology Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Social-value classifier | Score whether the video makes the sender look smart, funny, helpful, informed, moral, or in-group aligned. | 94 |
| 2 | Practical-value model | Detect checklist, tutorial, framework, warning, tool, hack, template, or useful-later content. | 90 |
| 3 | Identity-signal model | Detect professional, lifestyle, belief, tribe, status, or taste-signalling content. | 86 |
| 4 | Arousal/emotion model | Score awe, humor, anger, anxiety, surprise, tension, relief, and moral intensity. | 81 |
| 5 | TRIBE social/self proxy | Add compressed TRIBE features from social/self/language/value-related regions as experimental lift. | 73 |


## 6. Saveability / Utility Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Utility-content classifier | Detect tutorials, recipes, workflows, checklists, frameworks, templates, code snippets, routines, and reference content. | 93 |
| 2 | Information-density model | Score useful information per second, not just total information. | 87 |
| 3 | Step-structure detector | Detect numbered steps, before/after, do-this, avoid-this, and process clarity. | 84 |
| 4 | Revisit-intent LLM judge | Score whether a viewer would need this later. | 77 |
| 5 | Caption/CTA save detector | Detect explicit save-this prompts and save-oriented captions. | 62 |


## 7. Audience Fit / Topic Routing Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Dual-tower video/audience model | One tower embeds the video; another embeds audience clusters from past viewers, commenters, and winning posts. | 95 |
| 2 | Historical winner clustering | Cluster the creator’s top-performing posts and infer audience clusters from them. | 90 |
| 3 | Topic taxonomy classifier | Classify niche, subtopic, format, viewer intent, expertise level, and emotional frame. | 84 |
| 4 | Commenter-interest graph | Use repeat commenters, their language, and comment embeddings to estimate audience interests. | 78 |
| 5 | Manual niche labels | Use human-labelled topics such as software, fitness, finance, memes, productivity, student life. | 61 |


## 8. Audience Pool / Reach Ceiling Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Demand/supply pool model | Estimate topic demand, competing content volume, creator access, and trend growth. | 91 |
| 2 | Historical ceiling model | Estimate reach ceiling from prior posts in same topic/format/duration bucket. | 88 |
| 3 | Keyword/hashtag/search demand model | Track hashtags, search terms, captions, and platform search traffic proxies. | 82 |
| 4 | Trend-audience model | Estimate pool from users engaging with a sound, meme, format, or trend. | 78 |
| 5 | Static topic-size model | Assign rough audience sizes to broad categories. | 55 |


## 9. Creator Trust / Baseline Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Hierarchical Bayesian baseline | Use global -> platform -> niche -> creator -> format -> duration priors. | 96 |
| 2 | Rolling EWMA baseline | Use exponentially weighted recent averages for retention, shares, saves, and non-follower reach. | 90 |
| 3 | Creator-adjusted lift model | Convert every metric into actual-vs-expected lift for that creator. | 88 |
| 4 | Momentum model | Track last 7/14/30-day growth, median reach, breakout frequency, and declining performance. | 80 |
| 5 | Follower-count bucket model | Group creators by follower bands only. | 37 |


## 10. Relationship / Warm-Audience Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Follower/non-follower split model | Model follower and non-follower performance separately. | 93 |
| 2 | Repeat-engager graph | Track repeat commenters, return viewers, recurring likers, and profile visitors. | 86 |
| 3 | Community tightness score | Measure concentration of engagement among loyal users versus broad audience. | 79 |
| 4 | Warm-start prediction model | Predict first-hour performance from recent follower behavior. | 76 |
| 5 | Raw follower engagement rate | Use likes/comments per follower as a rough proxy. | 58 |


## 11. Trend Freshness Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Trend velocity model | Track growth rate of sounds, hashtags, topics, formats, and keyword clusters. | 92 |
| 2 | Trend lifecycle classifier | Classify emerging, accelerating, peak, decaying, or dead. | 87 |
| 3 | Demand/supply trend model | Compare audience demand against volume of competing similar posts. | 85 |
| 4 | Creator-trend fit model | Score whether this creator’s audience historically responds to this trend type. | 80 |
| 5 | Manual trend tracker | Human-curated trend list with subjective timing. | 61 |


## 12. Saturation / Fatigue Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Embedding-density saturation model | Measure density of similar recent videos in visual/text/audio embedding space. | 93 |
| 2 | Creator repetition model | Compare draft to creator’s last N posts for topic, format, hook, and sound similarity. | 88 |
| 3 | Trend-age decay model | Penalize trends based on time since acceleration/peak. | 82 |
| 4 | Template fatigue detector | Detect repeated hook structures, captions, transitions, meme formats, and editing templates. | 80 |
| 5 | Hashtag overuse model | Penalize heavily used hashtags or generic topic tags. | 56 |


## 13. Negative Feedback Risk Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Multi-task negative-risk model | Predict skip, not-interested, dislike, hide, report, and low satisfaction together. | 96 |
| 2 | Hook-payoff mismatch detector | Compare promised payoff in first seconds with actual payoff quality later. | 91 |
| 3 | Confusion / overload model | Detect visual clutter, dense captions, unclear premise, bad audio, and excessive topic shifts. | 87 |
| 4 | Ragebait / toxicity model | Score hostility, outrage, insult, polarization, manipulation, or baiting. | 80 |
| 5 | Technical discomfort model | Detect clipping, harsh sound, flicker, shaky footage, unreadable text, and poor pacing. | 75 |


## 14. Exploration / Uncertainty Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Contextual bandit variant selector | Use UCB or Thompson sampling to choose which content variants to test. | 93 |
| 2 | Model-uncertainty bonus | Use ensemble disagreement or Bayesian uncertainty to boost under-tested ideas. | 89 |
| 3 | Novelty × relevance model | Reward ideas that are novel but still close to proven audience clusters. | 84 |
| 4 | Portfolio optimizer | Allocate publishing slots between safe winners, trend tests, experiments, and format exploration. | 79 |
| 5 | Random exploration | Randomly test variants. | 42 |


## 15. Expansion-Wave Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Bayesian wave model | Use Beta posteriors for stop, retention, share, save, follow, and negative rates. | 97 |
| 2 | Early-metric stacked model | Use observed first 15/30/60-minute metrics plus pre-publish score. | 93 |
| 3 | Velocity/acceleration model | Track views/min, shares/min, saves/min, acceleration, and decay. | 90 |
| 4 | Cohort-quality model | Score whether early viewers are non-followers, topic-fit viewers, sharers, or weak/random viewers. | 86 |
| 5 | Raw first-hour views model | Predict final reach from first-hour views only. | 45 |


## 16. Cascade / Diffusion Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Self-exciting velocity model | Model views/shares as an intensity process where new sharing creates more exposure. | 89 |
| 2 | Early acceleration model | Predict 24h/72h reach from view/share/save velocity and acceleration. | 87 |
| 3 | Share cascade proxy | Track shares per minute, shares per reach, external traffic, reposts, remixes, and comment tagging. | 83 |
| 4 | Graph cascade model | Use network/cascade structure if detailed graph data exists. | 72 |
| 5 | Simple decay curve | Fit exponential/logistic growth and decay to early views. | 65 |


## 17. TRIBE Neural-Response Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | ROI/time-window compression | Compress ~20k vertices into visual, auditory, language, social, attention, and value ROI features across time windows. | 94 |
| 2 | Hook neural-response features | Extract first-window peak, slope, volatility, and early response drop. | 86 |
| 3 | Retention decay features | Measure response decay, flatness, overload, and instability across the full clip. | 82 |
| 4 | Cross-modal neural alignment | Score whether audio, language, and visual events create coherent predicted response timing. | 78 |
| 5 | Raw vertex model | Feed raw cortical vertices directly into a model. | 21 |


## 18. Multimodal Content-Quality Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Video/audio/text embedding model | Extract video embeddings, audio embeddings, transcript embeddings, caption embeddings, and OCR embeddings. | 95 |
| 2 | Large multimodal model judge | Use an LMM to score clarity, hook, pacing, novelty, social value, usefulness, and risk. | 84 |
| 3 | Feature-engineered content model | Use cut rate, speech rate, caption density, visual salience, audio energy, motion, faces, objects. | 82 |
| 4 | Transcript/caption-only model | Predict from language, topic, hook, and caption structure. | 67 |
| 5 | Visual-only model | Predict from frames only. | 61 |


## 19. Final Score / Calibration Model

| Rank | Method | How to build | Score |
|---|---|---|---|
| 1 | Stacked ensemble of specialist models | Feed all sub-model outputs into LightGBM/CatBoost/logistic calibrator. | 97 |
| 2 | Platform-specific final models | Separate TikTok, Reels, and Shorts calibrators. | 94 |
| 3 | Pairwise draft ranker | Rank Hook A vs Hook B vs Hook C instead of predicting absolute views. | 88 |
| 4 | Bayesian final model | Output probability and uncertainty intervals, not just a fixed score. | 84 |
| 5 | Hand-weighted formula | Manually combine scores before enough data exists. | 63 |
