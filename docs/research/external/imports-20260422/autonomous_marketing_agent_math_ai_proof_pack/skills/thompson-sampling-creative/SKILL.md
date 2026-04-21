---
name: thompson-sampling-creative
description: Allocate traffic across creative variants using Thompson Sampling logic.
---
# Thompson Sampling Creative

## Procedure

1. Create variant priors.
2. Sample variant quality.
3. Allocate next traffic batch.
4. Update successes/failures.
5. Apply fatigue decay if needed.
6. Write bandit log.
