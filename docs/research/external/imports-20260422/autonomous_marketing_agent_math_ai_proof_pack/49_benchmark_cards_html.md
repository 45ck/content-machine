# Benchmark Cards

Converted from `49_benchmark_cards.html` so the pack remains Markdown-only.

```html
<!doctype html>
<html lang='en'>
<head>
<meta charset='utf-8'>
<title>Coding Agent Benchmark Cards</title>
<style>
body { font-family: Arial, sans-serif; line-height: 1.45; margin: 2rem; max-width: 1100px; }
.card { border: 1px solid #ddd; border-radius: 12px; padding: 1rem; margin: 1rem 0; }
h2 { margin-top: 0; }
.badge { display: inline-block; padding: .15rem .45rem; border: 1px solid #aaa; border-radius: 999px; font-size: .85rem; margin-right: .3rem; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: .5rem; text-align: left; vertical-align: top; }
</style>
</head>
<body>
<h1>Coding Agent Benchmark Cards</h1>
<p>Use these cards to prevent benchmark overconfidence. A benchmark score is a signal about a task family, not a universal truth about business value.</p>

<div class='card'>
<h2>SWE-bench Verified</h2>
<p><span class='badge'>Tests</span> Real GitHub issue patching on a human-verified subset</p>
<p><span class='badge'>Use when</span> Comparing repo-level bug-fixing ability</p>
<p><span class='badge'>Do not use for</span> Predicting architecture, product sense, marketing, or net team productivity</p>
<p><span class='badge'>Failure mode</span> Can reward patches that pass tests without truly solving the issue; Python/repo concentration</p>
<p><span class='badge'>Mindset</span> Useful but incomplete evidence</p>
</div>

<div class='card'>
<h2>SWE-bench Pro</h2>
<p><span class='badge'>Tests</span> Harder long-horizon software tasks with larger diffs and actively maintained repos</p>
<p><span class='badge'>Use when</span> Evaluating frontier coding agents for multi-file changes</p>
<p><span class='badge'>Do not use for</span> Assuming the model can autonomously run your engineering org</p>
<p><span class='badge'>Failure mode</span> Harness, task mix, private/public split, and test-oracle choices dominate comparisons</p>
<p><span class='badge'>Mindset</span> Better proxy, still not production</p>
</div>

<div class='card'>
<h2>SWE-bench Multilingual</h2>
<p><span class='badge'>Tests</span> SWE-style tasks across multiple languages</p>
<p><span class='badge'>Use when</span> Checking non-Python coverage and cross-language robustness</p>
<p><span class='badge'>Do not use for</span> Assuming high score means expertise in your stack/framework</p>
<p><span class='badge'>Failure mode</span> Language distribution may not match your stack</p>
<p><span class='badge'>Mindset</span> Ask: does it cover my language and framework?</p>
</div>

<div class='card'>
<h2>SWE-bench Multimodal</h2>
<p><span class='badge'>Tests</span> Software tasks needing visual context</p>
<p><span class='badge'>Use when</span> UI bug fixing, screenshots, design-to-code workflows</p>
<p><span class='badge'>Do not use for</span> General backend evaluation</p>
<p><span class='badge'>Failure mode</span> Visual harness differences and screenshot interpretation</p>
<p><span class='badge'>Mindset</span> Use for UI-aware agents only</p>
</div>

<div class='card'>
<h2>Aider Polyglot</h2>
<p><span class='badge'>Tests</span> Code editing across C++, Go, Java, JavaScript, Python, Rust exercises</p>
<p><span class='badge'>Use when</span> Testing edit discipline and test-feedback repair loops</p>
<p><span class='badge'>Do not use for</span> Measuring large-codebase search, integration, product decisions</p>
<p><span class='badge'>Failure mode</span> Aider-specific prompting/edit protocol; exercise tasks not production tickets</p>
<p><span class='badge'>Mindset</span> Good for edit mechanics</p>
</div>

<div class='card'>
<h2>Terminal-Bench 2.0</h2>
<p><span class='badge'>Tests</span> Hard command-line/terminal tasks with verification</p>
<p><span class='badge'>Use when</span> CLI agents, build/debug workflows, data/scientific computing tasks</p>
<p><span class='badge'>Do not use for</span> Frontend product work or sales/marketing systems directly</p>
<p><span class='badge'>Failure mode</span> Timeouts and harness differences change outcomes</p>
<p><span class='badge'>Mindset</span> Evaluate agent+tool loop, not just model brain</p>
</div>

<div class='card'>
<h2>BrowseComp</h2>
<p><span class='badge'>Tests</span> Agentic search and hard web research</p>
<p><span class='badge'>Use when</span> Research agents, competitive intelligence, sourcing evidence</p>
<p><span class='badge'>Do not use for</span> Coding claims or closed-codebase work</p>
<p><span class='badge'>Failure mode</span> Search environment and source access dominate results</p>
<p><span class='badge'>Mindset</span> Good for research workflows</p>
</div>

<div class='card'>
<h2>MCP-Atlas</h2>
<p><span class='badge'>Tests</span> Tool use through MCP-like interfaces</p>
<p><span class='badge'>Use when</span> Tool orchestration and agent integrations</p>
<p><span class='badge'>Do not use for</span> Raw reasoning quality</p>
<p><span class='badge'>Failure mode</span> Tool definitions, permissions, and connector quality dominate</p>
<p><span class='badge'>Mindset</span> Measure the tool loop</p>
</div>

<div class='card'>
<h2>OSWorld / ScreenSpot</h2>
<p><span class='badge'>Tests</span> Computer use and visual UI interaction</p>
<p><span class='badge'>Use when</span> Browser/desktop automation, visual verification, screenshot workflows</p>
<p><span class='badge'>Do not use for</span> Backend coding or abstract reasoning</p>
<p><span class='badge'>Failure mode</span> UI state instability and coordinate issues</p>
<p><span class='badge'>Mindset</span> Good for visual operations</p>
</div>

<div class='card'>
<h2>GPQA / MMMLU / HLE</h2>
<p><span class='badge'>Tests</span> Knowledge and difficult reasoning</p>
<p><span class='badge'>Use when</span> Checking broad reasoning floor</p>
<p><span class='badge'>Do not use for</span> Choosing a coding agent by itself</p>
<p><span class='badge'>Failure mode</span> Can be irrelevant to your actual task distribution</p>
<p><span class='badge'>Mindset</span> General capability, not workflow fit</p>
</div>

<div class='card'>
<h2>Private vendor evals: CursorBench, Rakuten-SWE-Bench, BigLaw Bench</h2>
<p><span class='badge'>Tests</span> Internal production-adjacent workloads</p>
<p><span class='badge'>Use when</span> Directional signal from high-quality practitioners</p>
<p><span class='badge'>Do not use for</span> Rank-ordering models without public reproducibility</p>
<p><span class='badge'>Failure mode</span> Selection bias, private harness, marketing incentives</p>
<p><span class='badge'>Mindset</span> Treat as case studies, not law</p>
</div>

<div class='card'>
<h2>Your own eval</h2>
<p><span class='badge'>Tests</span> Your repo, your tasks, your acceptance tests</p>
<p><span class='badge'>Use when</span> Every serious buying/deployment decision</p>
<p><span class='badge'>Do not use for</span> Public comparison charts unless you normalize carefully</p>
<p><span class='badge'>Failure mode</span> Small samples, unstable tests, human reviewer inconsistency</p>
<p><span class='badge'>Mindset</span> This is the truth layer</p>
</div>
</body></html>
```
