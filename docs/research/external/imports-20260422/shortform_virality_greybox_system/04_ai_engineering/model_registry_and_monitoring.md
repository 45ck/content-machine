# Model Registry and Monitoring

## Model registry fields

```text
model_name
model_version
signal_name
training_data_window
feature_versions
target_definition
validation_metrics
calibration_metrics
ablation_results
deployment_status
created_at
approved_by
```

## Monitoring metrics

```text
prediction distribution drift
feature drift
calibration drift
top-decile lift
ablation health
platform-specific degradation
creator-specific degradation
false positive viral scores
false negative breakout misses
```

## Alerts

Trigger review when:

```text
Brier score worsens by >15%
Lift@10 falls below threshold
feature distribution shifts materially
platform changes metric definitions
new trend regime appears
TRIBE lift disappears
negative-risk false negatives rise
```

## Model card requirement

Each model must document:

```text
target
features
training period
validation method
known limitations
fairness/safety concerns
recommended use
not recommended use
```
