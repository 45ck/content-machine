# Guardrail constraints

## Non-negotiable guardrails

A variant cannot scale if it violates:

```text
accuracy
trust
policy safety
brand positioning
account coherence
ethical persuasion
viewer satisfaction
```

## Quantitative guardrails

```text
completion collapse after high starts
negative comment rate above threshold
unfollow rate spike
hide/not-interested spike if available
low follow conversion after clickbait
high comment rate with poor sentiment
```

## Qualitative guardrails

```text
misleading hook
fake proof
overstated data
unsafe advice
low originality
generic AI slop
stolen/reused material without transformation
```

## Guardrail rule

```text
If a creative wins the primary metric but fails a trust guardrail, it is not a winner. It is a liability.
```

## Example

A hook that produces high CTV but low completion and negative comments:

```text
Decision: kill or rewrite.
Reason: tension without payoff.
```

A proof-heavy video with lower views but high saves/follows:

```text
Decision: replicate.
Reason: lower reach but higher strategic value.
```
