# Temporal Coordination Windows

Timing is one of the strongest signals because independent users rarely repeat the same action together many times within short windows.

## Pairwise time difference

For account pair `(i,j)` and content item `c`:

`δ_ijc = |t_ic - t_jc|`

A coordination event occurs if:

`δ_ijc ≤ Δ`

## Window selection

Choose `Δ` based on the platform and action.

| Context | Candidate windows |
|---|---|
| X reposting / link sharing | 10s, 60s, 5min |
| TikTok clip posting | 5min, 30min, 2hr |
| Reddit astroturfing | 1hr, 6hr, 24hr |
| Product Hunt launch | 15min, 1hr, launch day |
| App-store reviews | day, week |
| Fake leads | minute, hour, day |
| Streaming fraud | seconds, minutes, session window |

## Burst ratio

For a campaign object:

`burst_ratio = actions_in_peak_window / total_actions`

High values suggest concentrated waves.

## Repeat synchronization

A stronger metric:

`repeat_sync_ij = count of unique objects where pair i,j co-acted within Δ`

This avoids over-reading one viral event.

## Interpretation

Short-window synchronization is suspicious when:

- it repeats across many objects
- the accounts are otherwise unrelated
- captions/content are also similar
- the same accounts appear in multiple campaigns
- there is no disclosure or obvious public event explaining the behaviour
