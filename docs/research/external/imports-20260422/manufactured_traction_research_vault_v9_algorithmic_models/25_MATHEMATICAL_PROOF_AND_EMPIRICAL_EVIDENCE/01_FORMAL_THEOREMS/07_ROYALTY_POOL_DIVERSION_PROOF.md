# Royalty-Pool Diversion Proof

## Claim

If money is allocated proportionally to measured streams, fake streams can divert money.

## Model

Let total royalty pool be `R`, real streams be `S_real`, and fake streams be `S_fake`.

```text
fake_diversion = R * S_fake / (S_real + S_fake)
```

For small fake share:

```text
fake_diversion ≈ R * S_fake / S_real
```

## Interpretation

The mechanism is direct: fake measured attention becomes fake measured share, which becomes real money unless detected.
