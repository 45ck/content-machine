# Claude Opus 4.7 Benchmark Dossier

This dossier is a practical interpretation layer for Claude Opus 4.7 and related coding-agent benchmarks. It is not a fan document. It is a decision document.

## Source hierarchy

1. **Official technical docs**: best for model IDs, pricing, context, API behavior, Claude Code features.
2. **System cards**: best for vendor-disclosed capability and safety evaluations.
3. **Independent public leaderboards**: useful for comparison, but scaffold-sensitive.
4. **Peer-reviewed benchmark criticism**: required to avoid benchmark overconfidence.
5. **Your own eval**: decisive for adoption.

## Claude Opus 4.7 — reported capability snapshot

The following capability table is based on Anthropic's Claude Opus 4.7 System Card, accessed from Anthropic's official system-card index. Treat these as vendor-reported benchmark results unless independently reproduced.

| Evaluation | Claude Opus 4.7 | Claude Opus 4.6 | GPT-5.4 | GPT-5.4 Pro | Gemini 3.1 Pro | What it suggests |
|---|---:|---:|---:|---:|---:|---|
| SWE-bench Verified | 87.6% | 80.8% | - | - | 80.6% | Strong real-issue patching signal on verified tasks. |
| SWE-bench Pro | 64.3% | 53.4% | 57.7% | - | 54.2% | Bigger gain on harder long-horizon coding tasks. |
| SWE-bench Multilingual | 80.5% | 77.8% | - | - | - | Cross-language coding improvement signal. |
| SWE-bench Multimodal | 34.5% | 27.1% | - | - | - | Better but still limited visual-software issue solving. |
| Terminal-Bench 2.0 | 69.4% | 65.4% | 75.1% | - | 68.5% | Good terminal-agent score, but not the row leader in reported table. |
| BrowseComp | 79.3% | 83.7% | 82.7% | 89.3% | 85.9% | Not a universal win; other models may lead on research/search. |
| MMMLU | 91.5% | 91.1% | - | - | 92.6% | Broad multilingual academic knowledge remains competitive, not dominant. |
| Humanity's Last Exam, no tools | 46.9% | 40.0% | 39.8% | 42.7% | 44.4% | General reasoning improvement. |
| Humanity's Last Exam, with tools | 54.7% | 53.3% | 52.1% | 58.7% | 51.4% | Tool use helps, but another model may lead. |
| CharXiv Reasoning, no tools | 82.1% | 69.1% | - | - | - | Strong chart/figure reasoning. |
| CharXiv Reasoning, with tools | 91.0% | 84.7% | - | - | - | Programmatic tool use improves visual reasoning. |
| OSWorld | 78.0% | 72.7% | 75.0% | - | - | Computer-use/desktop workflow signal. |
| GPQA Diamond | 94.2% | 91.3% | 92.8% | 94.4% | 94.3% | Very high science reasoning, but not unique dominance. |
| ScreenSpot-Pro, no tools | 79.5% | 57.7% | - | - | - | Major visual grounding gain. |
| ScreenSpot-Pro, with tools | 87.6% | 83.1% | - | - | - | Tool-assisted visual workflows improve. |
| OfficeQA | 86.3% | 73.5% | 68.1% | - | - | Office/document workflow strength. |
| OfficeQA Pro | 80.6% | 57.1% | 51.1% | - | 42.9% | Strong document-office task signal. |
| Finance Agent | 64.4% | 60.1% | 57.2% | 61.5% | 59.7% | Strong agentic finance/workflow signal. |
| MCP-Atlas | 77.3% | 75.8% | 68.1% | - | 73.9% | Tool orchestration signal. |
| ARC-AGI-1 | 92.0% | 93.0% | 93.7% | 94.5% | 98.0% | Opus 4.7 is not universally top. |
| ARC-AGI-2 | 75.83% | 68.8% | 73.3% | 83.3% | 77.1% | Improved abstraction; not row leader. |

## The obvious interpretation

Opus 4.7 appears especially strong where tasks require:

- long-horizon coding;
- multi-file reasoning;
- persistent agentic execution;
- visual/document understanding;
- tool orchestration;
- maintaining context over complex workflows.

## The disciplined interpretation

Do not say: “Opus 4.7 is the best model.”

Say: **“Opus 4.7 is a strong candidate for hard coding-agent, long-context, visual-document, and tool-orchestration workflows; but specific task families still require direct comparison.”**

## Why the benchmark gains matter

A 6–11 point benchmark gain is meaningful only if it crosses a deployment threshold. Examples:

- If old models needed 5 human interventions and Opus 4.7 needs 1, that changes workflow design.
- If old models failed hard tasks but Opus 4.7 reaches an acceptable first PR rate, you can delegate bigger chunks.
- If token usage rises faster than success rate, the ROI may not improve.
- If the model becomes better at visual verification, it can support ad/landing-page/prototype workflows more directly.

## Why the benchmark gains may not matter

They do not matter if:

- your tasks are small and cheap models already pass;
- your bottleneck is product judgment, not implementation;
- your codebase lacks tests or verification commands;
- you cannot sandbox actions safely;
- your buyer problem is unclear;
- your marketing claims are not grounded in product evidence;
- the benchmark task distribution does not resemble your work.

## The right business question

Not: “Is Opus 4.7 smarter?”

Ask: **“Can I now delegate a larger unit of economically valuable work with lower review burden and acceptable risk?”**

For a software business, the economically valuable unit is not a line of code. It is a shipped improvement that changes user behavior, conversion, activation, retention, implementation time, or support load.
