# Failure Mode and Effects Analysis for Viral Video Experiments

FMEA prevents vague diagnosis.

## Failure table

| Failure mode | Likely cause | Detection metric | Corrective action |
|---|---|---|---|
| Low shown/impressions | topic/account eligibility, weak initial signals, inconsistency | shown in feed, reach | strengthen topic clarity, use controlled exposure, repost only with meaningful variant |
| High shown, low viewed/chose-to-view | first frame weak | CTV, swipe-away | redesign first frame, show result/problem earlier |
| Good first second, weak 3-sec hold | hook weak or unclear | EHR | rewrite hook, reduce context, increase tension |
| Good early hold, poor completion | body slow, payoff late | APV, CPL | compress setup, add proof beats, move payoff earlier |
| Good completion, low saves | not reusable | SAV | convert to checklist/template/framework |
| Good completion, low sends | not socially transferable | SND | add recipient-specific framing |
| High comments, weak retention | controversy without watchability | CMT + APV | add proof, reduce bait, resolve argument clearly |
| High saves, low follows | account promise unclear | SAV + FOL | add series identity and profile alignment |
| High views, weak trust | clickbait or mismatch | sentiment, negative comments, hides | tighten promise accuracy |
| Good 24h, dead by 7d | feed-only asset | 7d/30d curve | add search-native version |
| Good search, weak feed | useful but boring package | SEA + CTV | create feed-native first frame/hook |

## Severity scores

Use 1–5.

```text
1 = small tactical issue
2 = fix in edit
3 = format-level problem
4 = platform/audience mismatch
5 = trust or eligibility risk
```

## Occurrence score

```text
1 = rare
3 = repeated twice
5 = repeated across batch
```

## Detection score

```text
1 = obvious from analytics
3 = requires comment/retention review
5 = unclear, needs more controlled testing
```

## Risk Priority Number

```text
RPN = severity × occurrence × detection
```

Act first on high RPN failures.
