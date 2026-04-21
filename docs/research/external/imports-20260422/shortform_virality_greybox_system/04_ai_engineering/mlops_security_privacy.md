# MLOps, Security, and Privacy

## Data privacy

Collect only analytics and content data you are authorized to use.

Avoid collecting or storing unnecessary personal data. Where audience data is used, aggregate it into cluster-level features.

## Safe storage

```text
encrypt videos at rest
encrypt metrics databases
restrict model-training access
store API keys in secret manager
log access to creator data
```

## Compliance boundaries

Do not use this system to:

```text
bypass platform policies
evade content safety systems
mass-manipulate audiences
harvest unauthorized viewer data
misrepresent synthetic or reused content
```

## License constraint

TRIBE v2 public releases may carry non-commercial terms depending on the release channel. Treat TRIBE as a research/prototype layer until licensing is resolved.

## Audit trail

Every score should be reproducible:

```text
model version
feature version
input video hash
score timestamp
calibration version
source metrics
```
