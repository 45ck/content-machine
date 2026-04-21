# Sequential Testing and Always-Valid Inference

## Purpose

Marketing agents want to monitor tests continuously. Classical fixed-horizon tests break if the agent peeks and stops opportunistically.

## Fixed-horizon rule

```text
Decide sample size first.
Analyze once at the end.
```

## Sequential rule

Use always-valid or group-sequential methods when monitoring continuously.

## Decision states

```text
continue
declare winner
declare loser
stop for futility
stop for harm
```

## Agent rule

If the agent can peek daily, the test plan must state:

```text
fixed horizon
or
sequential method
```

## Practical default

For small campaigns:

- use Bayesian posterior thresholds for action,
- record that it is decision support, not formal p-value inference.

For formal claims:

- use pre-registered fixed horizon or always-valid sequential tests.
