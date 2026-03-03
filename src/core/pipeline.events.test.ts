/**
 * Pipeline events (Observer pattern) tests
 */

import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { runPipeline } from './pipeline';
import { PipelineEventEmitter, type PipelineEvent } from './events';
import { FakeLLMProvider } from '../test/stubs/fake-llm';
import { ArchetypeIdSchema } from '../domain/ids';

function createFakeScriptResponse(topic: string) {
  return {
    scenes: [
      { text: `About ${topic}`, visualDirection: 'Talking head', mood: 'engaging' },
      { text: 'One key point.', visualDirection: 'B-roll', mood: 'informative' },
    ],
    reasoning: 'test',
    title: `Test: ${topic}`,
    hook: `Hook: ${topic}`,
    cta: 'Follow for more',
    hashtags: ['#test'],
  };
}

describe('runPipeline() progress events', () => {
  it('emits pipeline + stage lifecycle events with stable pipelineId', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'pipeline-events');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const llm = new FakeLLMProvider();
    llm.queueJsonResponse(createFakeScriptResponse('Redis'));

    const emitter = new PipelineEventEmitter();
    const events: PipelineEvent[] = [];
    emitter.on('*', (event) => events.push(event));

    const outputPath = join(outDir, 'video.mp4');

    const result = await runPipeline({
      topic: 'Redis',
      archetype: ArchetypeIdSchema.parse('listicle'),
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 15,
      outputPath,
      keepArtifacts: true,
      mock: true,
      llmProvider: llm,
      eventEmitter: emitter,
    });

    expect(result.outputPath).toBe(outputPath);

    const pipelineStarted = events.find((e) => e.type === 'pipeline:started');
    const pipelineCompleted = events.find((e) => e.type === 'pipeline:completed');
    expect(pipelineStarted).toBeDefined();
    expect(pipelineCompleted).toBeDefined();

    const pipelineId = pipelineStarted?.pipelineId;
    expect(pipelineId).toBeTruthy();
    expect(events.every((e) => e.pipelineId === pipelineId)).toBe(true);

    const stageStarted = events.filter((e) => e.type === 'stage:started');
    const stageCompleted = events.filter((e) => e.type === 'stage:completed');
    expect(stageStarted).toHaveLength(4);
    expect(stageCompleted).toHaveLength(4);

    expect(stageStarted[0]).toMatchObject({ stage: 'script', stageIndex: 0, totalStages: 4 });
    expect(stageStarted[1]).toMatchObject({ stage: 'audio', stageIndex: 1, totalStages: 4 });
    expect(stageStarted[2]).toMatchObject({ stage: 'visuals', stageIndex: 2, totalStages: 4 });
    expect(stageStarted[3]).toMatchObject({ stage: 'render', stageIndex: 3, totalStages: 4 });
  });

  it('emits progress events for long stages (visuals/render)', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'pipeline-events-progress');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const llm = new FakeLLMProvider();
    llm.queueJsonResponse(createFakeScriptResponse('Redis'));

    const emitter = new PipelineEventEmitter();
    const events: PipelineEvent[] = [];
    emitter.on('*', (event) => events.push(event));

    const outputPath = join(outDir, 'video.mp4');

    await runPipeline({
      topic: 'Redis',
      archetype: ArchetypeIdSchema.parse('listicle'),
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 15,
      outputPath,
      keepArtifacts: true,
      mock: true,
      llmProvider: llm,
      eventEmitter: emitter,
    });

    const progressEvents = events.filter((e) => e.type === 'stage:progress');
    const visualsProgress = progressEvents.filter((e) => e.stage === 'visuals');
    const renderProgress = progressEvents.filter((e) => e.stage === 'render');

    expect(visualsProgress.length).toBeGreaterThan(0);
    expect(renderProgress.length).toBeGreaterThan(0);

    for (const ev of [...visualsProgress, ...renderProgress]) {
      expect(ev.progress).toBeGreaterThanOrEqual(0);
      expect(ev.progress).toBeLessThanOrEqual(1);
    }
  });
});
