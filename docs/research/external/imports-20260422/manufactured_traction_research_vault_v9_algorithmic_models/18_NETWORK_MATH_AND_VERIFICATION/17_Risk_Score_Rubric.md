# Risk Score Rubric

A simple risk score helps compare cases.

## Score dimensions

Each dimension is scored 0–4.

| Dimension | 0 | 4 |
|---|---|---|
| Timing synchronization | none | repeated tight synchronization |
| Content similarity | diverse | highly repeated or templated |
| Network density | sparse | dense repeated cluster |
| Disclosure quality | clear | hidden or absent |
| Actor authenticity | identifiable | fake, throwaway, impersonating |
| Incentive evidence | none | documented payment/incentive |
| Outcome distortion | weak | metrics used as proof |
| External corroboration | none | regulator/platform/reporting evidence |

## Total score

`risk_score = sum(dimensions)`

Suggested interpretation:

- `0–8`: low concern
- `9–16`: weak/moderate concern
- `17–24`: strong concern
- `25+`: high concern / needs formal audit

## Why this helps

It prevents a single dramatic signal from dominating the analysis.
