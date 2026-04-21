# AI Static and Video Creative Pipeline

## Purpose

Use generative AI to increase creative throughput without creating visual slop, fake proof, or brand risk.

## Static creative pipeline

1. Generate creative brief.
2. Validate claims and visual constraints.
3. Generate 5–20 concepts.
4. Score concepts for clarity, novelty, brand fit, proof strength, and policy risk.
5. Generate final image prompts.
6. Produce drafts with image model/design tooling.
7. Run visual QA.
8. Human review if brand-sensitive or claim-heavy.
9. Export platform-specific ratios.
10. Attach asset metadata and claim IDs.

## Video pipeline

1. Define buyer moment.
2. Write 15s/30s/60s script.
3. Create storyboard.
4. Generate or record product screen footage.
5. Generate supporting scenes only where truthful.
6. Add captions.
7. Add proof frame.
8. Add CTA frame.
9. Run policy/claim check.
10. Launch small test.

## Visual QA checks

- Does the image imply a feature that does not exist?
- Does it show fake UI/data/results?
- Does it use competitor logos or marks improperly?
- Does it imply certification or endorsement?
- Does it imply guaranteed results?
- Does it use sensitive personal attributes?
- Does the landing page match the visual promise?

## AI image prompt template

```text
Create a clean B2B SaaS ad concept for [persona] who struggles with [problem].
Show [truthful visual transformation] without fake charts, fake customer logos, or impossible UI.
Style: [brand constraints].
Include no text except: [approved short text], or leave text blank for designer overlay.
Avoid: [prohibited visual claims, protected attributes, competitor logos, fake metrics].
```

## Video prompt/storyboard template

```json
{
  "hook": "A messy support email should not become an engineering guessing game.",
  "scene_1": "Messy inbound customer email with generic placeholder data.",
  "scene_2": "Product transforms it into a structured ticket draft.",
  "scene_3": "Human reviews the fields before publishing.",
  "proof_frame": "Watch the full workflow with sample data.",
  "cta": "Try the sandbox"
}
```

## Current platform direction

Google Demand Gen has moved toward more AI-assisted creative and video variation workflows, including Veo-powered variation from static images in Google Ads. Treat that as a signal: creative volume will matter, but only if the factory has strong truth and brand controls.

Source: https://blog.google/products/ads-commerce/demand-gen-drop-march-2026/
