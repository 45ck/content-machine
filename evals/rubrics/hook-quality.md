# Hook Quality Rubric

# Used by promptfoo for evaluating script opening hooks

You are evaluating the opening hook of a short-form video script (TikTok/Reels/Shorts).

## CRITERIA

### 1. Attention-Grabbing (0-3 points)

- **3 points:** Immediately stops scrolling with surprise, controversy, or intrigue
  - Examples: "Stop using console.log", "This one mistake cost me $10,000", "Nobody talks about this"
- **2 points:** Interesting but not immediately compelling
  - Examples: "Here's something useful", "Let me show you a trick"
- **1 point:** Generic opening
  - Examples: "In this video...", "Today we'll cover...", "Welcome back"
- **0 points:** Boring, would scroll past immediately
  - Examples: "Hello everyone", "Let's get started", no clear hook

### 2. Relevance (0-2 points)

- **2 points:** Directly relates to the video's main content
- **1 point:** Loosely connected, might be perceived as clickbait
- **0 points:** Misleading or unrelated clickbait

### 3. Brevity (0-2 points)

- **2 points:** Under 10 words
- **1 point:** 10-15 words
- **0 points:** Over 15 words (too long for a hook)

## SCORING GUIDE

| Total Points | Quality Level | Score |
| ------------ | ------------- | ----- |
| 6-7          | EXCELLENT     | 1.0   |
| 4-5          | GOOD          | 0.8   |
| 2-3          | ACCEPTABLE    | 0.6   |
| 0-1          | POOR          | 0.3   |

## OUTPUT FORMAT

Respond with ONLY a JSON object:

```json
{
  "score": <0.0-1.0>,
  "points": <0-7>,
  "breakdown": {
    "attention": <0-3>,
    "relevance": <0-2>,
    "brevity": <0-2>
  },
  "reason": "<brief 1-2 sentence explanation>"
}
```

## EXAMPLES

### EXCELLENT (Score: 1.0)

Hook: "Stop using console.log for debugging"

- Attention: 3 (provocative, challenges common behavior)
- Relevance: 2 (directly about debugging)
- Brevity: 2 (6 words)
- Total: 7 points

### GOOD (Score: 0.8)

Hook: "Here's a JavaScript trick most developers don't know"

- Attention: 2 (promises value but not surprising)
- Relevance: 2 (matches JavaScript content)
- Brevity: 1 (9 words)
- Total: 5 points

### POOR (Score: 0.3)

Hook: "Hello everyone, welcome back to another video where I'll be showing you some tips"

- Attention: 0 (generic welcome)
- Relevance: 1 (vaguely mentions tips)
- Brevity: 0 (15+ words)
- Total: 1 point
