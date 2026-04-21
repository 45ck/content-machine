# Visual Load / Clutter

| Method Code | Short Code | Canonical Name | Definition / What to try | Mechanism | Minimum Viable Experiment | Primary Metrics |
| --- | --- | --- | --- | --- | --- | --- |
| VLD-001 | VLAW | Visual-Load Adaptive Word Count | Use fewer overlay words when the frame is visually busy. | Balances visual-channel load. | Fixed vs adaptive density. | Gist; visual recall; effort |
| VLD-002 | DML | Demo Minimal Labels | During demonstrations, show only verbs or labels: twist, lock, pull. | Preserves action visibility. | Sentence captions vs labels in demo. | Task recall; completion |
| VLD-003 | BBAP | Busy Background Auto-Plate | Add a soft plate behind text only when background is complex. | Improves readability with minimal obstruction. | Auto plate vs always/never plate. | Readability; aesthetic rating |
| VLD-004 | BDW | Background Dimming Window | Temporarily dim non-essential background behind text. | Reduces crowding and contrast problems. | Dimming vs none. | Readability; immersion |
| VLD-005 | VCS | Visual Complexity Score | Compute frame-level complexity and use it to regulate overlay density. | Makes density adaptive and testable. | Manual vs automated complexity rules. | Prediction accuracy; recall |
| VLD-006 | CCD2 | Caption Conflict Detector | Detect when too many text layers exist simultaneously. | Prevents split attention and crowding. | Conflict detector on/off. | Text count; effort; recall |
| VLD-007 | HMS | High-Motion Suppression | Reduce caption animation and density during high visual motion. | Prevents competing motion streams. | Motion-adaptive vs fixed overlay. | Visual recall; comprehension |
| VLD-008 | STB | Simultaneous Text Budget | Limit screen to one primary text block plus one micro-label. | Keeps working memory manageable. | Budgeted vs unbudgeted overlays. | Effort; recall |
| VLD-009 | NCCC | Native Caption Conflict Checker | Avoid overlay collisions with platform auto-captions or imported captions. | Separates full caption layer and semantic layer. | With/without conflict checking. | Occlusion; user complaints |
| VLD-010 | BPD | Background Pattern Detector | Flag stripes, grids, leaves, and high-frequency textures behind text. | Crowding and contrast risk is high on patterned backgrounds. | Pattern-aware vs fixed placement. | Readability; failure rate |
| VLD-011 | FLCC | Frame-Level Contrast Correction | Auto adjust text/backplate contrast per frame. | Keeps readability stable across video. | Static style vs auto-correct. | WCAG ratio; readability |
| VLD-012 | TDB | Text Dwell Budget | Limit total seconds of on-screen text per 10 seconds of video. | Prevents turning video into reading task. | Low/medium/high dwell budgets. | Visual recall; effort; muted comprehension |
| VLD-013 | DVG | Density by Viewer Goal | Use heavier overlays for learning clips, lighter for entertainment clips. | Matches intrinsic task demands. | Category-specific vs universal density. | Recall; retention by category |
| VLD-014 | CSEF | Caption Safe Empty Frames | Intentionally reserve clean frames for text instead of adding text anywhere. | Production-level planning reduces clutter. | Planned empty frames vs reactive overlays. | Readability; production time |
| VLD-015 | RFL | Readability Failure Log | Annotate every point where a tester missed or struggled with text. | Creates iterative quality loop. | No log vs failure-log revision. | Revision improvement rate |
