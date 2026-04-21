# START HERE — v12

This is the final consolidated Markdown archive for the Cognitive Overlay Design / BCC research system.

## What this archive is

A complete research and execution system for testing short-form video text overlays.

It includes:

- named methods and codes;
- detailed experiment protocols;
- proof rules;
- research evidence;
- measurement plans;
- production protocols;
- adaptive-routing logic;
- 178 method cards;
- 30 deep experiment definitions;
- legacy artifacts from earlier versions.

## The most important distinction

| Code | Meaning | What it proves |
|---|---|---|
| SCC | Semantic Compression Captions | Whether reducing speech to meaning beats full transcript overlays. |
| BCC | Bionic Compression Captioning | Whether bionic concept anchors add value beyond SCC. |
| BCC+ | Bionic Compression Captioning Plus | Whether placement, visual-load adaptation, muted-first design, and dual-layer captions add value beyond BCC. |

## Proof logic

A method is not accepted because it sounds plausible. It is accepted when it beats its comparator on the metric its mechanism predicts.

Examples:

- SCC must beat FTO on gist/action recall or perceived effort.
- BCC must beat SCC on memory, clarity, or attention efficiency.
- BCC+ must beat BCC on gaze preservation, muted comprehension, or visual-load performance.
- HBC should underperform BCC; if it does not, the anchor rules are wrong.

## Recommended next action

Run `EXP-001` and `EXP-002` first.

- `EXP-001`: full multi-condition trial.
- `EXP-002`: SCC vs BCC ablation.

If BCC does not beat SCC, bionic anchors become optional styling. If BCC+ beats BCC, the real advantage is adaptive placement/density/timing.
