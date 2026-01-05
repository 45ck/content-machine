# RQ-24: LLM Evaluation & Quality Assurance

**Research Question:** How do we validate and verify LLM outputs throughout the content-machine pipeline using LLM-as-judge, model-graded evaluation, and automated quality assurance?

**Status:** Complete  
**Date:** 2026-01-05  
**Priority:** CRITICAL  
**Category:** Quality Assurance, Testing  
**Dependencies:** RQ-10 (Video Testing), RQ-13 (Video Quality Metrics)

---

## Executive Summary

This research establishes a comprehensive Validation & Verification (V&V) framework for content-machine's 4-stage pipeline. Each stage has distinct evaluation needs:

| Stage          | Output Type            | Evaluation Method                                    |
| -------------- | ---------------------- | ---------------------------------------------------- |
| **cm script**  | JSON (LLM-generated)   | LLM-as-judge, promptfoo assertions                   |
| **cm audio**   | WAV + timestamps       | Word-level alignment accuracy, audio quality metrics |
| **cm visuals** | JSON (footage matches) | Relevance scoring, visual-text alignment             |
| **cm render**  | MP4 video              | Frame comparison, PSNR/SSIM/VMAF (covered in RQ-13)  |

**Key Insight:** LLM outputs are non-deterministic. We cannot assert exact outputs. Instead, we evaluate _qualities_ using model-graded evaluation with scoring rubrics.

---

## 1. The V&V Challenge for LLM Systems

### 1.1 Why Traditional Testing Fails

Traditional testing uses exact assertions:

```typescript
expect(result).toEqual(expectedValue);
```

LLM outputs are probabilistic. The same prompt can produce different valid outputs:

- "5 JavaScript Tips" → "1. Use const..." OR "Tip #1: Arrow functions..."
- Both are valid; neither is "correct" in an absolute sense

### 1.2 Solution: Quality-Based Evaluation

Instead of asserting exact outputs, we evaluate qualities:

| Quality                   | Evaluator    | Pass Criteria     |
| ------------------------- | ------------ | ----------------- |
| Has hook within 3 seconds | LLM-as-judge | Yes/No            |
| Scene count               | Programmatic | 3-8 scenes        |
| TikTok style language     | LLM-as-judge | Score ≥0.8        |
| Factual accuracy          | LLM-as-judge | No contradictions |

---

## 2. LLM-as-Judge Pattern

### 2.1 Core Concept

Use a separate LLM call to evaluate the quality of another LLM's output. The "judge" LLM applies a rubric and returns a structured verdict.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ User Input  │ ──▶ │ LLM (Worker) │ ──▶ │   Output    │
│   "topic"   │     │ cm script    │     │ script.json │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                                                ▼
                    ┌──────────────┐     ┌─────────────┐
                    │ LLM (Judge)  │ ◀── │  + Rubric   │
                    │ gpt-4o-mini  │     │ "Has hook?" │
                    └──────┬───────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Verdict   │
                    │ {pass, score, reason} │
                    └─────────────┘
```

### 2.2 OpenAI SimpleQA Pattern

From `vendor/research/gpt-researcher/evals/simple_evals/simpleqa_eval.py`:

```python
GRADER_TEMPLATE = """
Your job is to look at a question, a gold target, and a predicted answer,
and then assign a grade of either ["CORRECT", "INCORRECT", "NOT_ATTEMPTED"].

First, I will give examples of each grade, and then you will grade a new example.

The following are examples of CORRECT predicted answers.
```

Question: What are the names of Barack Obama's children?
Gold target: Malia Obama and Sasha Obama
Predicted answer 1: sasha and malia obama
Predicted answer 2: Barack Obama has two daughters...

```

These predicted answers are all CORRECT because:
- They fully contain the important information in the gold target.
- They do not contain any information that contradicts the gold target.
...
"""

CHOICE_STRINGS = ["CORRECT", "INCORRECT", "NOT_ATTEMPTED"]
```

**Key Pattern:** Provide examples for each grade (few-shot), then ask for single-letter output.

### 2.3 Promptfoo LLM-Rubric Pattern

From `vendor/observability/promptfoo/examples/self-grading/promptfooconfig.yaml`:

```yaml
defaultTest:
  assert:
    - type: llm-rubric
      value: Do not mention that you are an AI or chat assistant
    - type: javascript
      value: Math.max(0, Math.min(1, 1 - (output.length - 100) / 900));
tests:
  - vars:
      name: Bob
      question: Can you help me find a specific product?
```

**Key Pattern:** `llm-rubric` assertion type with natural language criteria.

### 2.4 Custom Grading Prompts

From `vendor/observability/promptfoo/examples/custom-grading-prompt/promptfooconfig.yaml`:

```yaml
defaultTest:
  options:
    rubricPrompt:
      - role: system
        content: >-
          Grade the output by the following specifications:
          Did the output mention {{x}}? +1 point
          Did the output describe {{y}}? +1 point
          Did the output ask to clarify {{z}}? +1 point
          Calculate the score. Output in JSON: {pass: true, score: number, reason: string}
      - role: user
        content: 'Output: {{ output }}'
```

**Key Pattern:** Custom rubric with point-based scoring, template variables for context.

---

## 3. G-Eval Framework

### 3.1 Multi-Criteria Evaluation

From `vendor/observability/promptfoo/examples/g-eval/promptfooconfig.yaml`:

```yaml
tests:
  - assert:
      - type: g-eval
        value: >-
          Coherence - the collective quality of all sentences. The reply 
          should be well-structured and well-organized. The reply should 
          not just be a heap of related information, but should build from 
          sentence to a coherent body of information about a topic.
  - assert:
      - type: g-eval
        value: >-
          Consistency - the factual alignment between the reply and the source.
          A factually consistent reply contains only statements that are
          entailed by the source document.
  - assert:
      - type: g-eval
        value: >-
          Fluency - the quality of the reply in terms of grammar, spelling,
          punctuation, word choice, and sentence structure.
  - assert:
      - type: g-eval
        value: >-
          Relevance - selection of important content for the source.
```

**Key Pattern:** Evaluate multiple quality dimensions independently. G-Eval is particularly suited for generation tasks like script writing.

---

## 4. Factuality Evaluation

### 4.1 Closed-QA Pattern

From `vendor/observability/promptfoo/examples/openai-eval-factuality/promptfooconfig.yaml`:

```yaml
tests:
  - vars:
      location: Sacramento
    assert:
      # Ensure the answer agrees with the provided facts
      - type: factuality
        value: The capital of California is Sacramento

      # Ensure the answer meets criteria
      - type: model-graded-closedqa
        value: Does not include any extra information about Sacramento
```

**Key Pattern:** Combine factuality check (against gold answer) with closed-QA check (specific criteria).

### 4.2 Hallucination Detection

From `vendor/research/gpt-researcher/evals/hallucination_eval`:

```python
def evaluate_hallucination(output: str, sources: List[str]) -> dict:
    """
    Compare generated content against source materials.
    Returns: {is_hallucination: bool, confidence_score: float, reasoning: str}
    """
```

**Application for content-machine:** Verify visual search terms match script content (no hallucinated keywords).

---

## 5. RAG-Style Evaluation Metrics

### 5.1 Multi-Metric Assertions

From `vendor/observability/promptfoo/examples/rag-eval/promptfooconfig.yaml`:

```yaml
tests:
  - vars:
      query: What is the max purchase that doesn't require approval?
      context: file://docs/reimbursement.md
    assert:
      - type: contains
        value: '$500'
      - type: factuality
        value: the employee's manager is responsible for approvals
      - type: answer-relevance
        threshold: 0.9
      - type: context-recall
        threshold: 0.9
        value: max purchase price without approval is $500
      - type: context-relevance
        threshold: 0.9
      - type: context-faithfulness
        threshold: 0.9
```

**Key Metrics:**

- `answer-relevance` — Does the answer address the question?
- `context-recall` — Does the answer cover important context?
- `context-faithfulness` — Does the answer stay true to context?

**Application for content-machine:** Evaluate if visual descriptions match scene narration.

---

## 6. Content-Machine V&V Framework

### 6.1 Stage 1: cm script Evaluation

**Qualities to Evaluate:**

| Quality             | Type         | Criteria                                                      |
| ------------------- | ------------ | ------------------------------------------------------------- |
| Hook strength       | LLM-rubric   | Opens with attention-grabbing statement within first 10 words |
| Archetype adherence | LLM-rubric   | Follows {archetype} structure pattern correctly               |
| Scene count         | Programmatic | Between 3-8 scenes                                            |
| Word count          | Programmatic | 100-250 words for 30-60s video                                |
| Visual directions   | LLM-rubric   | Each scene has filmable visual description                    |
| TikTok voice        | LLM-rubric   | Casual, direct, no corporate speak                            |
| Factual grounding   | Factuality   | Claims match provided research context                        |

**Promptfoo Configuration:**

```yaml
# evals/cm-script.yaml
description: Evaluate script generation quality

prompts:
  - file://src/script/prompts/generate-script.yaml

providers:
  - openai:gpt-4o

defaultTest:
  assert:
    # Programmatic checks
    - type: javascript
      value: |
        const script = JSON.parse(output);
        return script.scenes && script.scenes.length >= 3 && script.scenes.length <= 8;
    - type: javascript
      value: |
        const script = JSON.parse(output);
        const wordCount = script.scenes.reduce((acc, s) => acc + s.narration.split(' ').length, 0);
        return wordCount >= 100 && wordCount <= 250;

    # LLM-graded checks
    - type: llm-rubric
      value: The script opens with an attention-grabbing hook in the first 10 words
    - type: llm-rubric
      value: Each scene has a clear, filmable visual description
    - type: llm-rubric
      value: The language is casual and conversational, suitable for TikTok

tests:
  - vars:
      topic: '5 JavaScript tips every developer should know'
      archetype: 'listicle'
  - vars:
      topic: 'Redis vs PostgreSQL for caching'
      archetype: 'versus'
  - vars:
      topic: 'How I learned React in 2 weeks'
      archetype: 'story'
```

### 6.2 Stage 2: cm audio Evaluation

**Qualities to Evaluate:**

| Quality                 | Type          | Criteria                            |
| ----------------------- | ------------- | ----------------------------------- |
| Word alignment accuracy | Programmatic  | 95%+ words correctly timestamped    |
| Audio duration match    | Programmatic  | Within 5% of expected duration      |
| Silence gaps            | Programmatic  | No gaps >500ms (unless intentional) |
| Sample rate             | Programmatic  | Exactly 44100 Hz                    |
| TTS clarity             | External tool | Mozilla DeepSpeech WER <10%         |

**Evaluation Code:**

```typescript
// src/audio/evaluators.ts
interface AudioEvalResult {
  wordAlignmentAccuracy: number; // 0-1
  durationDeltaPercent: number; // absolute deviation
  maxSilenceGap: number; // milliseconds
  wer: number; // word error rate from ASR re-transcription
}

async function evaluateAudioOutput(
  audioPath: string,
  expectedTranscript: string,
  timestamps: WordTimestamp[]
): Promise<AudioEvalResult> {
  // Re-transcribe with Whisper to verify alignment
  const verification = await whisper.transcribe(audioPath);

  // Calculate word error rate
  const wer = calculateWER(expectedTranscript, verification.text);

  // Check alignment accuracy
  const alignmentScore = compareTimestamps(timestamps, verification.words);

  // Detect silence gaps
  const gaps = detectSilenceGaps(audioPath);

  return {
    wordAlignmentAccuracy: alignmentScore,
    durationDeltaPercent: Math.abs(expectedDuration - actualDuration) / expectedDuration,
    maxSilenceGap: Math.max(...gaps),
    wer,
  };
}
```

### 6.3 Stage 3: cm visuals Evaluation

**Qualities to Evaluate:**

| Quality              | Type         | Criteria                           |
| -------------------- | ------------ | ---------------------------------- |
| Keyword relevance    | LLM-rubric   | Search terms match scene content   |
| Footage availability | Programmatic | All scenes have valid Pexels URLs  |
| Orientation correct  | Programmatic | All clips are portrait (1080x1920) |
| Duration coverage    | Programmatic | Total footage ≥ audio duration     |
| Visual variety       | LLM-rubric   | No duplicate clips across scenes   |

**Promptfoo Configuration:**

```yaml
# evals/cm-visuals.yaml
description: Evaluate visual matching quality

tests:
  - vars:
      scene_narration: 'Redis stores everything in memory, making it incredibly fast'
      search_terms: ['redis database', 'fast server', 'memory chip']
    assert:
      - type: llm-rubric
        value: |
          The search terms are relevant to the narration content.
          "redis database" should match technology content.
          Visual terms should be filmable and concrete.
      - type: model-graded-closedqa
        value: Search terms do not include abstract concepts that cannot be filmed
```

### 6.4 Stage 4: cm render Evaluation

Video quality metrics are covered in **RQ-13: Video Quality Metrics**. Key thresholds:

| Metric | Good   | Acceptable | Poor   |
| ------ | ------ | ---------- | ------ |
| PSNR   | >35 dB | 30-35 dB   | <30 dB |
| SSIM   | >0.95  | 0.90-0.95  | <0.90  |
| VMAF   | >80    | 70-80      | <70    |

**Additional Render Evaluations:**

| Quality            | Type         | Criteria                                  |
| ------------------ | ------------ | ----------------------------------------- |
| Caption sync       | Programmatic | Caption appears within 50ms of word audio |
| Resolution correct | Programmatic | Exactly 1080x1920                         |
| Frame rate         | Programmatic | Exactly 30 fps                            |
| Audio sync         | Programmatic | A/V drift <100ms                          |
| No black frames    | FFmpeg       | No frames with avg brightness <5          |

---

## 7. Implementation: Promptfoo Integration

### 7.1 Directory Structure

```
evals/
├── configs/
│   ├── cm-script.yaml          # Script generation evals
│   ├── cm-script-listicle.yaml # Archetype-specific
│   ├── cm-script-versus.yaml
│   ├── cm-visuals.yaml         # Visual matching evals
│   └── cm-integration.yaml     # End-to-end pipeline
├── datasets/
│   ├── script-test-cases.json  # Ground truth examples
│   ├── visual-test-cases.json
│   └── golden-outputs/         # Reference outputs
├── rubrics/
│   ├── hook-quality.txt        # Reusable rubric prompts
│   ├── tiktok-voice.txt
│   ├── visual-relevance.txt
│   └── factuality.txt
└── results/
    └── .gitkeep
```

### 7.2 Running Evaluations

```bash
# Run script generation eval
npx promptfoo eval -c evals/configs/cm-script.yaml --env-file .env

# Run with specific dataset
npx promptfoo eval -c evals/configs/cm-script.yaml --var-file evals/datasets/script-test-cases.json

# Run without cache (for CI)
npx promptfoo eval -c evals/configs/cm-script.yaml --no-cache

# View results in UI
npx promptfoo view
```

### 7.3 CI Integration

```yaml
# .github/workflows/evals.yml
name: LLM Evaluations

on:
  push:
    paths:
      - 'src/script/**'
      - 'src/visuals/**'
      - 'evals/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run script evals
        run: npx promptfoo eval -c evals/configs/cm-script.yaml --no-cache -o results.json
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Check pass rate
        run: |
          PASS_RATE=$(jq '.results.stats.successes / .results.stats.total' results.json)
          if (( $(echo "$PASS_RATE < 0.8" | bc -l) )); then
            echo "Pass rate $PASS_RATE below 80% threshold"
            exit 1
          fi
```

---

## 8. Langfuse Observability Integration

### 8.1 Tracing LLM Calls

From `vendor/observability/langfuse`:

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

// Trace script generation
const trace = langfuse.trace({ name: 'cm-script' });

const generation = trace.generation({
  name: 'generate-script',
  model: 'gpt-4o',
  input: { topic, archetype },
  metadata: { version: '1.0' },
});

const result = await llm.generate(prompt);

generation.end({
  output: result,
  usage: { promptTokens: 500, completionTokens: 200 },
});

// Score the output
trace.score({
  name: 'hook-quality',
  value: 0.9,
  comment: 'Strong opening hook',
});
```

### 8.2 Dashboard Metrics

Langfuse provides:

- **Token usage tracking** — Cost per generation
- **Latency monitoring** — P50/P95 response times
- **Quality scores over time** — Track improvement
- **A/B testing** — Compare prompt versions

---

## 9. Regression Testing with Golden Outputs

### 9.1 Golden Output Pattern

Store known-good outputs and compare against them:

```typescript
// tests/regression/script.test.ts
import { describe, it, expect } from 'vitest';
import { generateScript } from '../src/script/generator';

describe('Script Generation Regression', () => {
  it('should match golden output structure for listicle', async () => {
    const result = await generateScript({
      topic: '5 JavaScript tips',
      archetype: 'listicle',
    });

    // Don't compare exact text, compare structure
    expect(result.scenes.length).toBeGreaterThanOrEqual(5);
    expect(result.scenes[0]).toHaveProperty('narration');
    expect(result.scenes[0]).toHaveProperty('visualDirection');

    // Use LLM judge for content quality
    const hookScore = await evaluateWithLLM(
      result.scenes[0].narration,
      'Opens with attention-grabbing statement'
    );
    expect(hookScore).toBeGreaterThan(0.7);
  });
});
```

### 9.2 Snapshot Testing for Video

From **RQ-10: Video Output Testing**:

```typescript
// Extract frames at key moments
await execa('ffmpeg', [
  '-i',
  'output.mp4',
  '-vf',
  'select=eq(n,0)+eq(n,30)+eq(n,60)', // Frames 0, 30, 60
  '-vsync',
  'vfr',
  'frame%d.png',
]);

// Compare against baseline
const ssim = await calculateSSIM('frame1.png', 'baseline/frame1.png');
expect(ssim).toBeGreaterThan(0.95);
```

---

## 10. Evaluation Metrics Dashboard

### 10.1 Tracked Metrics

| Metric                     | Target | Alert Threshold |
| -------------------------- | ------ | --------------- |
| Script hook score (avg)    | ≥0.85  | <0.75           |
| Script archetype adherence | ≥0.90  | <0.80           |
| Visual relevance score     | ≥0.80  | <0.70           |
| Word alignment accuracy    | ≥0.95  | <0.90           |
| Video PSNR                 | ≥35 dB | <30 dB          |
| Pipeline success rate      | ≥95%   | <90%            |
| Average cost per video     | <$0.50 | >$1.00          |

### 10.2 Quality Gates

Before merging prompt changes:

1. **Run eval suite** — All evals must pass with ≥80% success rate
2. **Compare to baseline** — No regression in average scores
3. **Cost check** — Token usage within budget
4. **Manual review** — Random sample of generated scripts

---

## 11. Implementation Recommendations

### 11.1 Priority Order

1. **Week 1: cm script evals** — Highest value, most complex LLM output
2. **Week 2: cm visuals evals** — Visual matching quality
3. **Week 3: cm audio tests** — Mostly programmatic
4. **Week 4: cm render tests** — Use existing RQ-10/RQ-13 patterns

### 11.2 Tooling Stack

| Purpose            | Tool                    | Rationale                                  |
| ------------------ | ----------------------- | ------------------------------------------ |
| LLM eval framework | promptfoo               | Already vendored, comprehensive assertions |
| Observability      | Langfuse                | Cost tracking, score history               |
| Video quality      | FFmpeg (PSNR/SSIM/VMAF) | Industry standard, free                    |
| Test runner        | Vitest                  | TypeScript-native, fast                    |
| CI integration     | GitHub Actions          | Standard, promptfoo support                |

### 11.3 Cost Management

LLM-as-judge adds cost. Mitigate with:

1. **Use gpt-4o-mini for judging** — 10x cheaper than gpt-4o
2. **Run full evals on PR only** — Not every commit
3. **Cache eval results** — promptfoo built-in caching
4. **Sample-based testing** — Don't eval every test case in CI

---

## 12. Conclusion

Content-machine requires a layered V&V approach:

1. **Programmatic checks** — Schema validation, duration, counts
2. **LLM-as-judge** — Quality dimensions (hook, voice, relevance)
3. **Model-graded evaluation** — Factuality, coherence, fluency
4. **Video quality metrics** — PSNR/SSIM/VMAF (post-render)
5. **Regression testing** — Golden outputs, frame snapshots

**Critical Success Factor:** Define clear rubrics for each quality dimension. Ambiguous criteria lead to inconsistent grades.

**Next Steps:**

1. Create `evals/` directory structure
2. Write promptfoo configs for cm script
3. Add Langfuse integration to LLM provider
4. Set up CI workflow for eval gating

---

## References

- [promptfoo documentation](https://promptfoo.dev/docs/)
- [Langfuse documentation](https://langfuse.com/docs)
- [OpenAI SimpleQA methodology](https://github.com/openai/simple-evals)
- [G-Eval paper](https://arxiv.org/abs/2303.16634)
- [RQ-10: Video Output Testing](./RQ-10-VIDEO-OUTPUT-TESTING-20260104.md)
- [RQ-13: Video Quality Metrics](./RQ-13-VIDEO-QUALITY-METRICS-20260104.md)
- `vendor/observability/promptfoo/examples/` — Evaluation patterns
- `vendor/research/gpt-researcher/evals/` — SimpleQA implementation

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-05  
**Author:** Research Agent
