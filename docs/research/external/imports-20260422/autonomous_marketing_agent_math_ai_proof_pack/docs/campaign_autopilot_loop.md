# Campaign Autopilot Loop

## Goal

Run marketing as a continuous agent loop rather than a campaign-by-campaign human workflow.

## The loop

```text
observe → diagnose → select tactic → generate → package → launch-plan → measure → learn → refresh
```

## Step 1 — Observe

Read:

- product facts;
- buyer language;
- competitor pages;
- ad libraries;
- platform exports;
- product analytics;
- CRM notes;
- trial activation data;
- support tickets;
- sales objections.

## Step 2 — Diagnose buyer state

Classify the audience:

- unaware;
- problem-aware;
- solution-aware;
- vendor-aware;
- active comparer;
- trial user;
- stalled buyer;
- expansion candidate.

## Step 3 — Select tactic

Choose a tactic card from `tactics/`.

Do not generate generic ads. Pick a specific tactic, then execute it.

## Step 4 — Generate

Create:

- hooks;
- headlines;
- body copy;
- creative brief;
- landing-page path;
- offer;
- objection handling;
- variants.

## Step 5 — Package

Create a Markdown campaign artifact:

```text
campaigns/YYYY-MM-DD-channel-product-angle.md
```

It should include:

- campaign goal;
- audience;
- buyer state;
- angle;
- offer;
- copy variants;
- creative brief;
- landing page;
- UTM structure;
- launch notes;
- measurement plan.

## Step 6 — Launch-plan

If platform access exists, prepare API-ready notes. If not, prepare manual launch instructions.

Google Ads, Meta, TikTok, and other platforms expose enough API surface for programmatic creation and reporting. Google Ads supports campaign creation, responsive search ads, experiments, and reporting. Meta's Marketing API supports campaign/ad-set/ad-creative/ad creation. TikTok's API for Business supports batch campaign/ad creation and creative-material management.

## Step 7 — Measure

Use the right metric for the buyer state:

| Buyer state | Metric |
|---|---|
| Unaware | hook rate, video hold, engaged visits |
| Problem-aware | landing-page engagement, problem-section scroll, lead magnet opt-in |
| Solution-aware | demo starts, comparison clicks, pricing page views |
| Vendor-aware | trial starts, sales calls, checkout starts |
| Trial user | activation event, retained use, invite sent |
| Paid user | expansion, retention, referral |

## Step 8 — Learn

Update `memory/experiment_memory.md` and `memory/tactic_performance.md`.

Never store a result as "this copy works".

Store it as:

```text
For buyer state X, channel Y, offer Z, tactic T performed this way under these constraints.
```

## Step 9 — Refresh

Generate next variants from recorded learning, not random novelty.
