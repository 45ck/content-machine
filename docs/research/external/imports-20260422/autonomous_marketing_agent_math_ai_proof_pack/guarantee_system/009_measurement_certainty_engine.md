# Measurement Certainty Engine

Marketing fails when measurement is treated as a dashboard screenshot.

The agent should build measurement before launch.

## Event ladder

| Stage | Event |
|---|---|
| Attention | impression, video view, click, engaged session |
| Inspection | demo watched, docs viewed, pricing viewed, comparison viewed |
| Intent | trial start, lead form, sample upload, integration check |
| Activation | first successful workflow, imported data, invited team |
| Monetization | paid conversion, subscription, expansion |
| Retention | repeated usage, renewal, expansion |

## Minimum tracking plan

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
landing_page
buyer_state
offer_type
tactic_id
proof_asset_id
claim_id
```

## Measurement hierarchy

1. Platform diagnostics: delivery, CTR, CPC, CPM.
2. Site diagnostics: bounce, engaged sessions, CTA clicks.
3. Proof diagnostics: demo views, pricing views, docs views.
4. Product diagnostics: trial activation, key actions.
5. Revenue diagnostics: paid conversion, CAC, payback.
6. Incrementality diagnostics: holdout, conversion lift, geo test, or experiment.

## Agent rule

A campaign is not ready if it cannot answer:

```text
What buyer state did this test?
What offer did it test?
What proof asset did it route to?
What event would count as first signal?
What event would count as failure?
```
