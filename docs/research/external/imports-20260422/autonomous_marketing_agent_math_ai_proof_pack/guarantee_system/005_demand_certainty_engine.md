# Demand Certainty Engine

The safest way to make ads work is to stop trying to create demand from cold air.

Find buyers who already show signs of demand.

## Demand surfaces ranked by certainty

| Surface | Demand certainty | Why |
|---|---:|---|
| Exact problem search | Very high | Buyer is actively naming the pain. |
| Competitor alternative search | Very high | Buyer already accepts the category. |
| Integration-specific search | High | Buyer has a current tool stack and a concrete need. |
| Review-site comparison | High | Buyer is evaluating vendors. |
| Forum pain thread | Medium-high | Problem is real but purchase timing may be weak. |
| Retargeting previous visitors | Medium-high | Some interest already exists. |
| Lookalike audience | Medium | Pattern match, not explicit intent. |
| Broad social interest | Low-medium | Attention exists; buying state uncertain. |
| Cold broad display | Low | Requires strong creative and patience. |

## Agent task

Before generating cold ads, the agent must create a demand map:

```text
Problem keywords:
Competitor keywords:
Alternative keywords:
Integration keywords:
Use-case keywords:
Trigger-event keywords:
Forum/community pain phrases:
Review-site complaint phrases:
```

## Demand confidence score

Score each angle:

```text
1 = imagined problem
2 = one or two anecdotal signals
3 = repeated public complaints
4 = search/comparison intent exists
5 = buyers already paying competitors
```

## Rule

If demand confidence is below 3, do not scale paid ads. Run research, founder-led posts, community probing, and manual outbound first.
