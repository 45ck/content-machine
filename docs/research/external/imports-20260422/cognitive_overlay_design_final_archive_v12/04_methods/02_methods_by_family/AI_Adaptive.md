# AI / Adaptive

| Method Code | Short Code | Canonical Name | Definition / What to try | Mechanism | Minimum Viable Experiment | Primary Metrics |
| --- | --- | --- | --- | --- | --- | --- |
| AIA-001 | SBE | Semantic Beat Extractor | LLM extracts proposition, role, and beat boundaries from transcript. | Automates compression pipeline. | Human vs AI beat extraction. | Edit distance; accuracy; time saved |
| AIA-002 | GEN | Overlay Variant Generator | Auto-generates transcript, keyword, compression, BCC, BCC+, and controls. | Speeds A/B testing. | Manual vs generated variants. | Production time; quality score |
| AIA-003 | SHP | Saliency Heatmap Placement | Predict likely gaze heatmaps and avoid high-conflict zones. | Automates gaze-safe placement. | Fixed vs saliency-aware placement. | Visual recall; occlusion rate |
| AIA-004 | FMHO | Face/Mouth/Hand/Object Detector | Detect visual regions that should not be covered. | Automates safe zones. | Manual vs CV safe-zone detection. | Occlusion errors; readability |
| AIA-005 | VLP | Visual Load Predictor | Estimate per-frame visual complexity to choose word count. | Controls visual-channel load. | Human-coded vs model-coded load. | Prediction validity; recall |
| AIA-006 | GSWE | Gaze Simulation Without Eye Tracker | Use saliency/meaning maps to simulate likely gaze conflict. | Low-cost proxy for early testing. | Model score vs user gaze subset. | Correlation with gaze/errors |
| AIA-007 | ABG | Automatic A/B Generator | Generate and track variants across platforms. | Creates evidence loop at scale. | Randomized content batches. | Variant lift; confidence intervals |
| AIA-008 | BRAS | BCC+ Rubric Auto-Scorer | Score compression, anchors, placement, load, contrast, muted clarity. | Standardizes human review. | Rubric vs no rubric production. | Failure rate; pilot performance |
| AIA-009 | PSZT | Platform Safe-Zone Templates | Reusable templates for TikTok/Reels/Shorts/Stories UI zones. | Prevents UI occlusion. | Template vs manual export. | Occlusion rate by platform |
| AIA-010 | CRO | Compression Ratio Optimizer | Suggest percent transcript to display based on speech rate/visual load. | Data-driven text density. | Heuristic vs learned optimizer. | Gist/effort efficiency |
| AIA-011 | RWET | Remote Webcam Eye-Tracking Pilot | Use webcam gaze estimation for rough large-sample placement tests. | Scales beyond lab eye-tracking. | Webcam vs self-report vs subset eye tracker. | Gaze estimates; recall |
| AIA-012 | MPFE | Meaning-Per-Fixation Estimator | Combine recall results and gaze/text dwell to estimate efficiency. | Optimizes for cognitive value, not watch time alone. | Estimate vs actual recall. | Predictive validity |
| AIA-013 | AR | Adaptive Renderer | Renders overlays based on detected shot type and visual load. | Turns research into production system. | Manual vs adaptive renderer. | Quality; retention; revision count |
| AIA-014 | HLE | Human-in-the-Loop Editor | AI proposes; editor approves proposition, anchor, placement, timing. | Balances speed with correctness. | AI-only vs human-in-loop. | Accuracy; time saved |
| AIA-015 | SRNG | Source/Risk Note Generator | For research/health/finance clips, overlay flags if claim is advice, evidence, or speculation. | Reduces misinformation risk. | No risk note vs risk-tagged version. | Trust; comments; comprehension |
