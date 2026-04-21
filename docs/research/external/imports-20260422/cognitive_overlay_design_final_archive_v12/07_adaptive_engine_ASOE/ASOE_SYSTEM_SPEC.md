# Adaptive Semantic Overlay Engine — ASOE System Spec

## Goal

ASOE generates and routes semantic overlay methods by context.

It should not merely style captions. It should decide:

1. what meaning to show;
2. how much text to show;
3. when to show it;
4. where to place it;
5. whether anchors help;
6. whether motion helps;
7. whether muted-first support is needed;
8. whether full captions are preserved;
9. whether the overlay violates guardrails.

## Modules

| Module | Function |
|---|---|
| Transcript Parser | Converts speech to transcript and sentence units. |
| Proposition Extractor | Finds underlying claims and actions. |
| Semantic Beat Extractor | Splits propositions into overlay beats. |
| Method Selector | Chooses SCC, BCC, BCC+, labels, beat cards, etc. |
| Anchor Selector | Chooses operator and concept anchors. |
| Visual Load Predictor | Scores frame complexity. |
| ROI Detector | Detects face, mouth, hands, product, object, UI. |
| Placement Engine | Chooses gaze-safe zone. |
| Timing Engine | Sets cue timing and exposure. |
| Accessibility Guard | Ensures full captions remain available. |
| Quality Gate | Scores overlay with rubric. |
| Experiment Logger | Records condition, metrics, and result. |
| Adaptive Router | Updates method routing by evidence. |

## Default routing

| Context | First method | Fallback |
|---|---|---|
| Clean talking head | SCC/BCC | BCC+ if mouth/UI risk |
| Dense education | SCC + PCFB | BCC+ with micro-rests |
| Product demo | VLAC + object labels | no-text action moments |
| Fitness/cooking | action labels | pre/post caption summary |
| Emotional story | affective-semantic low density | plain SCC |
| Muted likely | MFC + DLC + BCC+ | full captions |
| L2 audience | simplified SCC + DLC | full captions |
| Expert audience | compact SCC/BCC | standard SCC |

## MVP scope

Start with human-in-the-loop ASOE:

1. Generate suggestions.
2. Human editor approves.
3. Run QA checklist.
4. Export overlays.
5. Log performance.
