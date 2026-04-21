# Benchmark Interpretation Matrix

Converted from `53_benchmark_interpretation_matrix.csv` so the pack remains Markdown-only.

| Benchmark | What it tests | Use when | Do not use it for | Main failure mode | Best mindset |
| --- | --- | --- | --- | --- | --- |
| SWE-bench Verified | Real GitHub issue patching on a human-verified subset | Comparing repo-level bug-fixing ability | Predicting architecture, product sense, marketing, or net team productivity | Can reward patches that pass tests without truly solving the issue; Python/repo concentration | Useful but incomplete evidence |
| SWE-bench Pro | Harder long-horizon software tasks with larger diffs and actively maintained repos | Evaluating frontier coding agents for multi-file changes | Assuming the model can autonomously run your engineering org | Harness, task mix, private/public split, and test-oracle choices dominate comparisons | Better proxy, still not production |
| SWE-bench Multilingual | SWE-style tasks across multiple languages | Checking non-Python coverage and cross-language robustness | Assuming high score means expertise in your stack/framework | Language distribution may not match your stack | Ask: does it cover my language and framework? |
| SWE-bench Multimodal | Software tasks needing visual context | UI bug fixing, screenshots, design-to-code workflows | General backend evaluation | Visual harness differences and screenshot interpretation | Use for UI-aware agents only |
| Aider Polyglot | Code editing across C++, Go, Java, JavaScript, Python, Rust exercises | Testing edit discipline and test-feedback repair loops | Measuring large-codebase search, integration, product decisions | Aider-specific prompting/edit protocol; exercise tasks not production tickets | Good for edit mechanics |
| Terminal-Bench 2.0 | Hard command-line/terminal tasks with verification | CLI agents, build/debug workflows, data/scientific computing tasks | Frontend product work or sales/marketing systems directly | Timeouts and harness differences change outcomes | Evaluate agent+tool loop, not just model brain |
| BrowseComp | Agentic search and hard web research | Research agents, competitive intelligence, sourcing evidence | Coding claims or closed-codebase work | Search environment and source access dominate results | Good for research workflows |
| MCP-Atlas | Tool use through MCP-like interfaces | Tool orchestration and agent integrations | Raw reasoning quality | Tool definitions, permissions, and connector quality dominate | Measure the tool loop |
| OSWorld / ScreenSpot | Computer use and visual UI interaction | Browser/desktop automation, visual verification, screenshot workflows | Backend coding or abstract reasoning | UI state instability and coordinate issues | Good for visual operations |
| GPQA / MMMLU / HLE | Knowledge and difficult reasoning | Checking broad reasoning floor | Choosing a coding agent by itself | Can be irrelevant to your actual task distribution | General capability, not workflow fit |
| Private vendor evals: CursorBench, Rakuten-SWE-Bench, BigLaw Bench | Internal production-adjacent workloads | Directional signal from high-quality practitioners | Rank-ordering models without public reproducibility | Selection bias, private harness, marketing incentives | Treat as case studies, not law |
| Your own eval | Your repo, your tasks, your acceptance tests | Every serious buying/deployment decision | Public comparison charts unless you normalize carefully | Small samples, unstable tests, human reviewer inconsistency | This is the truth layer |
