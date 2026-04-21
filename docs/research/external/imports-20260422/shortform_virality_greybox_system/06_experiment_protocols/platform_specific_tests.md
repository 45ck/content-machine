# Platform-Specific Tests

## Why separate calibration is mandatory

TikTok, Instagram Reels, and YouTube Shorts expose different metrics and likely weight signals differently.

## TikTok tests

Primary targets:

```text
retention
completion
rewatch
shares/comments
topic fit
negative feedback proxy
```

Hypothesis:

```text
retention × topic fit × trend/sound fit predicts breakout better than likes
```

## Instagram Reels tests

Primary targets:

```text
retention
DM shares / sends
saves
originality
follower vs non-follower reach
```

Hypothesis:

```text
retention + sends + saves + originality predicts expansion
```

## YouTube Shorts tests

Primary targets:

```text
shown in feed
how many chose to view
APV
engaged views
subscribers/follows
not interested / dislikes
```

Hypothesis:

```text
viewed-vs-swiped × APV predicts Shorts expansion better than raw views
```

## Cross-platform rule

Train:

```text
shared feature extractor
platform-specific calibrator
platform-specific thresholds
```
