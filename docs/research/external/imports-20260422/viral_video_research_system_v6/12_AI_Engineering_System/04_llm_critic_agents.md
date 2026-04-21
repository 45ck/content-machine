# LLM critic agents

## Agent set

### 1. Classification Critic

Checks whether the topic is legible.

Questions:

```text
Can a cold viewer classify this in one second?
Can the platform infer the topic from speech/text/caption?
```

### 2. Hook Critic

Scores tension, specificity, and payoff accuracy.

### 3. Cognitive Load Critic

Checks text density, visual clutter, and competing information.

### 4. Proof Critic

Checks whether claims are supported by visible evidence.

### 5. Trust Critic

Flags clickbait, exaggeration, misleading claims, policy risk, and brand damage.

### 6. Action Critic

Checks whether CTA matches the video’s value.

### 7. Series Critic

Checks whether the video reinforces account memory.

## Output format

```text
Score: 0–5
Failure reason:
Suggested rewrite:
Primary metric likely affected:
Guardrail warning:
```

## Rule

A video must pass all critical agents before publication.
