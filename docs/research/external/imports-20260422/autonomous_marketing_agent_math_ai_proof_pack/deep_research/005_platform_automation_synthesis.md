# Platform Automation Synthesis

## Core position

Major ad platforms expose enough API and automation surface for a high-autonomy campaign factory.

The relevant surfaces are:

- campaign creation,
- ad group/ad set creation,
- creative object creation,
- audience configuration,
- budget/bid configuration,
- reporting extraction,
- experiments,
- platform AI creative expansion,
- platform policy feedback.

## Platform map

| Platform | Automation surface | Agent output should be |
|---|---|---|
| Google Ads | Campaigns, responsive search ads, GAQL reporting, experiments, AI Max | Search campaign launch packet, RSA asset pool, query/report plan |
| Meta | Campaigns, ad sets, ad creatives, Advantage+ creative, reporting | Creative variants, placement strategy, Advantage+ controls note |
| TikTok | Campaign/ad management, batch delivery, creative asset management, Symphony | Video brief, script, UGC-style variants, asset metadata |
| LinkedIn | Campaign management, creatives, targeting facets, B2B objectives | Sponsored content plan, persona targeting, lead-gen asset |
| Microsoft Ads | Search campaign and responsive search ads | Search extension and comparison plan |

## What the agent must produce before API execution

```markdown
## Platform packet

- Platform:
- Objective:
- Campaign name:
- Audience:
- Budget:
- Dates:
- Assets:
- Destination URL:
- Tracking tags:
- Experiment grouping:
- Reporting query:
- Pause rules:
- Refresh rules:
```

## Platform AI interaction rule

When platform AI will rewrite, crop, expand, personalize, or recombine creative, the agent should provide:

- source assets,
- non-negotiable product facts,
- forbidden claims,
- brand voice boundaries,
- minimum required proof,
- reporting fields needed to inspect performance.
