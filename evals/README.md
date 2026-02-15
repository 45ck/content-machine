# content-machine Evaluation Suite

This directory contains the LLM evaluation framework for content-machine using [promptfoo](https://promptfoo.dev/).

## Quick Start

```bash
# Run script generation evals
npx promptfoo eval -c evals/configs/cm-script.yaml --env-file .env

# Run visual matching evals
npx promptfoo eval -c evals/configs/cm-visuals.yaml --env-file .env

# View results in browser
npx promptfoo view
```

## Directory Structure

```
evals/
├── README.md                    # This file
├── configs/                     # Promptfoo configuration files
│   ├── cm-script.yaml          # Script generation evaluation
│   └── cm-visuals.yaml         # Visual matching evaluation
├── rubrics/                     # Evaluation rubric definitions
│   ├── hook-quality.md         # Hook quality scoring guide
│   ├── tiktok-voice.md         # TikTok language style rubric
│   └── visual-relevance.md     # Stock footage search relevance
├── datasets/                    # Test case datasets
│   ├── README.md               # Dataset documentation
│   └── *.json                  # Ground truth test cases
└── results/                     # Eval run outputs (gitignored)
```

## Evaluation Layers

We use a 4-layer evaluation approach:

| Layer | Type                | Example                               |
| ----- | ------------------- | ------------------------------------- |
| 1     | Schema Validation   | JSON structure, required fields       |
| 2     | Programmatic Checks | Word count, scene count, duration     |
| 3     | LLM-as-Judge        | Hook quality, TikTok voice, relevance |
| 4     | Human Review        | Random sample quality check           |

## Available Evaluations

### cm-script.yaml

Evaluates script generation quality:

- JSON schema compliance
- Scene count (3-8 scenes)
- Word count (100-250 words)
- Hook quality (attention-grabbing opening)
- TikTok voice (casual, conversational language)
- Visual directions (filmable descriptions)
- Archetype adherence (listicle, versus, story, etc.)

### cm-visuals.yaml

Evaluates stock footage search term generation:

- Search term relevance to narration
- Filmability (concrete vs abstract terms)
- Variety of visual options

## Configuration

### Environment Variables

Create a `.env` file with:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional
```

### Promptfoo Options

```bash
# Skip cache (fresh results)
npx promptfoo eval -c configs/cm-script.yaml --no-cache

# Output to file
npx promptfoo eval -c configs/cm-script.yaml -o results/latest.json

# Run specific tests
npx promptfoo eval -c configs/cm-script.yaml --filter-pattern "listicle"

# Compare against baseline
npx promptfoo eval -c configs/cm-script.yaml --compare results/baseline.json
```

## CI Integration

Add the `run-evals` label to a PR to trigger LLM evaluation:

```yaml
# .github/workflows/evals.yml
jobs:
  llm-evals:
    if: contains(github.event.pull_request.labels.*.name, 'run-evals')
    steps:
      - run: npx promptfoo eval -c evals/configs/cm-script.yaml --no-cache
```

## Quality Thresholds

| Metric                | Target | Alert |
| --------------------- | ------ | ----- |
| Script eval pass rate | ≥80%   | <70%  |
| Visual eval pass rate | ≥80%   | <70%  |
| Hook quality (avg)    | ≥0.8   | <0.7  |
| TikTok voice (avg)    | ≥0.8   | <0.7  |

## Adding New Evaluations

1. Create a new config in `configs/`
2. Define test cases with `vars` and `assert`
3. Use `llm-rubric` for subjective quality checks
4. Use `javascript` assertions for programmatic checks
5. Document rubrics in `rubrics/`

## References

- [Promptfoo Documentation](https://promptfoo.dev/docs/)
- [LLM-Rubric Assertions](https://promptfoo.dev/docs/configuration/expected-outputs/model-graded/)
- [G-Eval Pattern](https://promptfoo.dev/docs/configuration/expected-outputs/model-graded/g-eval/)
- [RQ-24: LLM Evaluation Research](../docs/research/investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md)
- [V&V Framework](../docs/dev/guides/VV-FRAMEWORK-20260105.md)
