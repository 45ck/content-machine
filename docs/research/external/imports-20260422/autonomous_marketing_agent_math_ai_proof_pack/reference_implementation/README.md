# Reference Implementation — Mock Autonomous Ad Factory

This is a safe starter scaffold. It does **not** call real ad-platform APIs. It demonstrates the internal architecture needed before real launch actions are allowed.

## What it does

1. Loads a sample product brief and claim bank.
2. Generates a small set of buyer-state hypotheses using deterministic templates.
3. Creates draft ad variants.
4. Runs a claim/policy gate.
5. Creates mock platform payloads.
6. Produces a mock experiment plan.

## What it deliberately does not do

- Does not spend money.
- Does not publish ads.
- Does not call Google/Meta/LinkedIn/TikTok APIs.
- Does not invent unapproved claims.
- Does not use customer personal data.

## Run

```bash
python -m ad_factory.run_mock_pipeline
```

Outputs are written to `outputs/sample_campaign_plan.json`.

## Next steps to production

Before real APIs:

- Replace deterministic templates with LLM calls using Structured Outputs.
- Add approval records.
- Add real platform validators.
- Add budget guardrails.
- Add audit logging.
- Add eval harness.
- Use test accounts.
