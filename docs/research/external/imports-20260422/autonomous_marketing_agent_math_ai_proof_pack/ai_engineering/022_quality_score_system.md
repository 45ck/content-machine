# Quality Score System

## Purpose

Score campaign artifacts before launch.

## Scores

| Dimension | Weight |
|---|---:|
| buyer-state fit | 20 |
| specificity | 15 |
| offer strength | 15 |
| proof path | 20 |
| measurement clarity | 15 |
| channel fit | 10 |
| economic sanity | 5 |

## Launch threshold

```text
total_score >= 80
no critical score below 3/5
```

## Critical scores

```text
proof path
measurement clarity
economic sanity
```
