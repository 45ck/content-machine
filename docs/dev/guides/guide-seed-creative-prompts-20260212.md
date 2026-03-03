# Seed Creative Prompt Pack Guide (2026-02-12)

## Goal

Convert Seedance/Seedream research into reusable `PromptTemplate` assets that fit
content-machine's existing prompt registry.

## Added templates

- `image-generation/seedream-hero-still`
- `image-generation/seedream-reference-anchored`
- `image-generation/seedream-stylized-remix`
- `visuals/seedance-shot-spec`

## Why this shape

- Reuses existing prompt-registry architecture in `src/prompts/`.
- Keeps terminology aligned with ubiquitous language (`PromptTemplate`, `provider`,
  `visuals`, `image-generation`).
- Encodes practical constraints from research: identity anchors, shot specification,
  one-variable-at-a-time edits, and artifact suppression.
- Includes a stylized remix template to reduce dependence on real-person likeness.

## Usage example

```ts
import { getPrompt, renderPrompt, SEED_CREATIVE_PROMPTS } from '../../src/prompts';

const heroTemplate = getPrompt(SEED_CREATIVE_PROMPTS.seedreamHeroStill);
if (!heroTemplate) throw new Error('Missing seedream hero template');

const rendered = renderPrompt(heroTemplate, {
  characterBrief: 'fictional antihero chemistry teacher, shaved head, glasses',
  wardrobe: 'dark jacket, wireframe glasses',
  location: 'desert roadside at sunset',
});

console.log(rendered.user);
```

## Validation

Run the focused prompt tests:

```bash
npm run test:run -- tests/unit/prompts/registry.test.ts
```
