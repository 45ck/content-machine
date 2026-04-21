# AI model evaluation protocol

## Evaluation dimensions

```text
prediction accuracy
calibration
guardrail recall
false scale rate
false kill rate
creative usefulness
human approval rate
postmortem accuracy
```

## Monthly evaluation

```text
1. Compare predicted metric intervals to actual outcomes.
2. Check coverage rate.
3. Audit 20 random AI recommendations.
4. Record false positives and false negatives.
5. Update prompts/features/thresholds.
```

## Model failure classes

```text
overconfident on new format
underestimates niche-specific language
rewards clickbait wording
misses trust risk
fails to detect visual clutter
wrongly treats all platforms the same
```

## Fixes

```text
use platform-specific prompts
use content-form-specific baselines
expand creative genome dataset
increase guardrail weight
require human proof review
```
