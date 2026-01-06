import { describe, expect, it } from 'vitest';
import { scoreScript } from './scorer';
import type { ScriptOutput } from '../script/schema';
import type { PackageOutput } from '../package/schema';

function baseScript(partial?: Partial<ScriptOutput>): ScriptOutput {
  return {
    schemaVersion: '1.0.0',
    scenes: [
      { id: 'scene-001', text: 'Hook line here', visualDirection: 'show text' },
      { id: 'scene-002', text: 'Main point one', visualDirection: 'b-roll' },
      { id: 'scene-003', text: 'Payoff and CTA', visualDirection: 'text' },
    ],
    reasoning: 'n/a',
    title: 'Redis vs Postgres for caching',
    hook: 'Stop caching wrong',
    meta: {
      archetype: 'versus',
      topic: 'Redis vs Postgres',
      generatedAt: new Date().toISOString(),
      wordCount: 30,
      estimatedDuration: 12,
    },
  };
}

describe('scoreScript', () => {
  it('fails on packaging/title mismatch', () => {
    const packaging: PackageOutput = {
      schemaVersion: '1.0.0',
      topic: 'x',
      platform: 'tiktok',
      variants: [
        {
          title: 'Expected title',
          coverText: 'cover',
          onScreenHook: 'hook',
        },
      ],
      selectedIndex: 0,
      selected: {
        title: 'Expected title',
        coverText: 'cover',
        onScreenHook: 'hook',
      },
      meta: { generatedAt: new Date().toISOString() },
    };

    const result = scoreScript({
      script: baseScript({ title: 'Different title' }),
      scriptPath: 'script.json',
      packaging,
      packagePath: 'packaging.json',
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((c) => c.checkId === 'title-matches-packaging')?.passed).toBe(false);
  });

  it('flags rage bait as an error', () => {
    const result = scoreScript({
      script: baseScript({ hook: "Everyone is wrong about caching, you're an idiot" }),
      scriptPath: 'script.json',
    });

    expect(result.checks.find((c) => c.checkId === 'no-rage-bait')?.passed).toBe(false);
    expect(result.passed).toBe(false);
  });
});

