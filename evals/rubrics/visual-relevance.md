# Visual Relevance Rubric

# Used by promptfoo for evaluating stock footage search term quality

You are evaluating search terms generated for finding stock footage on Pexels/Pixabay.

## GOAL

Search terms should find video clips that visually complement the narration.
The footage will play as B-roll while the viewer hears the voiceover.

## KEY PRINCIPLE: FILMABILITY

Search terms must describe things that can be **visually captured on camera**.

### FILMABLE (Good)

- Objects: computer, server, person, office
- Actions: typing, running, celebrating
- Settings: data center, coffee shop, sunset
- Emotions (via people): frustrated person, happy team

### NOT FILMABLE (Bad)

- Abstract concepts: efficiency, performance, scalability
- Programming concepts: closure, recursion, API
- Qualities: fast, secure, reliable
- Metaphors without visual: "blazingly fast"

## CRITERIA

### 1. Relevance to Narration (0-3 points)

- **3 points:** Search terms directly relate to narration content
- **2 points:** Generally related, some stretch
- **1 point:** Loosely connected
- **0 points:** Irrelevant to narration

### 2. Filmability (0-3 points)

- **3 points:** All terms are concrete, filmable objects/actions/settings
- **2 points:** Mostly filmable, one abstract term
- **1 point:** Mix of filmable and abstract
- **0 points:** Mostly abstract concepts

### 3. Variety (0-1 point)

- **1 point:** Terms offer different visual options (literal + metaphorical)
- **0 points:** All terms are too similar

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
    "relevance": <0-3>,
    "filmability": <0-3>,
    "variety": <0-1>
  },
  "unfimableTerms": ["list any abstract/non-filmable terms"],
  "reason": "<brief explanation>"
}
```

## EXAMPLES

### EXCELLENT (Score: 1.0)

Narration: "Redis stores everything in memory, making it blazingly fast"
Search Terms: ["server room", "computer RAM", "data center lights", "fast motion blur"]

- Relevance: 3 (servers, memory hardware, speed visual)
- Filmability: 3 (all are physical things that can be filmed)
- Variety: 1 (technical + abstract speed visual)
- Total: 7 points

### GOOD (Score: 0.8)

Narration: "You need to understand how closures work"
Search Terms: ["developer coding", "computer screen code", "programmer thinking"]

- Relevance: 2 (about coding, not closures specifically)
- Filmability: 3 (all filmable)
- Variety: 1 (different angles on coding)
- Total: 6 points (but capped at 0.8 because closures can't really be visualized)

### POOR (Score: 0.3)

Narration: "Redis stores everything in memory"
Search Terms: ["performance", "efficiency", "caching", "fast database"]

- Relevance: 1 (related concepts but not visuals)
- Filmability: 0 (none of these will find footage)
- Variety: 0 (all abstract)
- Total: 1 point
