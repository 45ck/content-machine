# Negative Control

| Method Code | Short Code | Canonical Name | Definition / What to try | Mechanism | Minimum Viable Experiment | Primary Metrics |
| --- | --- | --- | --- | --- | --- | --- |
| CTL-001 | FTO | Full Transcript Overlay | Use complete burned-in transcript as baseline. | Baseline for exact wording and accessibility-adjacent display. | Compare against compression/BCC. | Exact recall; effort |
| CTL-002 | KHT | Keyword Highlight Transcript | Highlight important words inside full transcript. | Commercial-style baseline. | Compare to semantic compression. | Gist; effort |
| CTL-003 | WWDC | Word-by-Word Dynamic Caption | Active word highlight following speech. | Common creator-tool baseline. | Compare to semantic beats. | Gist; fatigue |
| CTL-004 | HBF | Heavy Bionic Formatting | Apply bionic partial bolding to most words. | Tests whether heavy bionic hurts. | Compare to BCC and compression. | Recall; saccades; effort |
| CTL-005 | ROW | RSVP One-Word Captions | One word at a time in same spot. | Tests speed-reading style in video context. | Compare to semantic beats. | Comprehension; fatigue |
| CTL-006 | CKT | Constant Kinetic Text | Every word moves or pops. | Tests motion overload. | Compare to logic motion. | Recall; fatigue; retention |
| CTL-007 | NNO | No Overlay / Native Captions Only | Baseline platform state. | Determines value of any overlay. | Compare to all variants. | Gist; visual recall; retention |
| CTL-008 | COM | Color-Only Meaning | Use color without labels/icons for semantic roles. | Accessibility negative control. | Compare to color+label. | Role ID; access rating |
| CTL-009 | BOP | Bottom-Only Placement | Always lower-third regardless of content. | Placement baseline. | Compare to gaze-safe. | Occlusion; readability |
| CTL-010 | RSP | Random Saliency Pop | Make random words visually pop. | Tests whether salience without meaning helps. | Compare to semantic cueing. | Gist; trust |
| CTL-011 | HDCS | High-Density Caption Stack | Multiple overlays/captions/stickers simultaneously. | Stress test for visual crowding. | Compare to budgeted text. | Readability; effort |
| CTL-012 | ENS | Emoji/Nonstandard Subtitle Variant | Use platform-native non-standard typography and emoji. | Tests TikTok-native engagement signal. | Compare with clean captioning by category. | Engagement; trust; comprehension |
