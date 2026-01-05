# Evaluation Datasets

# Test cases for content-machine LLM evaluation

This directory contains ground truth test cases for evaluating LLM outputs.

## Files

### script-test-cases.json

Test cases for `cm script` evaluation. Each case includes:

- `topic`: The video topic
- `archetype`: Content archetype (listicle, versus, story, etc.)
- `expectedQualities`: What we expect from a good script

### visual-test-cases.json

Test cases for `cm visuals` evaluation. Each case includes:

- `narration`: Scene narration text
- `visualDirection`: Script's visual direction
- `acceptableTerms`: Search terms that would be acceptable
- `unacceptableTerms`: Terms that should NOT be used

## Usage

```bash
# Run evals with dataset
npx promptfoo eval -c configs/cm-script.yaml --var-file datasets/script-test-cases.json

# Run specific subset
npx promptfoo eval -c configs/cm-script.yaml --filter-pattern "listicle"
```

## Adding Test Cases

When adding new test cases:

1. Include clear expected qualities
2. Add both positive and negative examples
3. Cover edge cases (short topics, long topics, controversial topics)
4. Update the corresponding eval config if new assertions are needed
