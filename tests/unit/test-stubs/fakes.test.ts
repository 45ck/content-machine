import { describe, it, expect } from 'vitest';
import { FakeTTSProvider } from '../../../src/test/stubs/fake-tts';
import { FakeASRProvider } from '../../../src/test/stubs/fake-asr';
import { FakePexelsProvider } from '../../../src/test/stubs/fake-pexels';

describe('FakeTTSProvider', () => {
  it('returns queued responses and tracks calls', async () => {
    const provider = new FakeTTSProvider();
    provider.queueResponse({
      audioPath: 'queued.wav',
      duration: 2,
      sampleRate: 24000,
      cost: 0,
    });

    const result = await provider.synthesize({
      text: 'hello world',
      voice: 'test',
      outputPath: 'out.wav',
    });

    expect(result.audioPath).toBe('queued.wav');
    expect(provider.getCalls()).toHaveLength(1);
    expect(provider.getLastCall()?.voice).toBe('test');
  });

  it('uses default response when queue is empty', async () => {
    const provider = new FakeTTSProvider();
    const result = await provider.synthesize({
      text: 'hello world',
      voice: 'test',
      outputPath: 'out.wav',
    });

    expect(result.audioPath).toBe('out.wav');
    expect(result.duration).toBeGreaterThan(0);
  });
});

describe('FakeASRProvider', () => {
  it('queues responses from text', async () => {
    const provider = new FakeASRProvider();
    provider.queueFromText('hello world');

    const result = await provider.transcribe({
      audioPath: 'audio.wav',
    });

    expect(result.text).toBe('hello world');
    expect(result.words.length).toBeGreaterThan(0);
  });

  it('returns a default transcription when no response queued', async () => {
    const provider = new FakeASRProvider();
    const result = await provider.transcribe({
      audioPath: 'audio.wav',
    });

    expect(result.text).toContain('Test');
    expect(provider.getCalls()).toHaveLength(1);
  });
});

describe('FakePexelsProvider', () => {
  it('returns queued videos and tracks queries', async () => {
    const provider = new FakePexelsProvider();
    provider.queueDefaultVideos(2);

    const results = await provider.search({
      query: 'mountains',
      orientation: 'portrait',
      perPage: 5,
    });

    expect(results).toHaveLength(2);
    expect(provider.getQueries()).toEqual(['mountains']);
  });

  it('throws queued errors', async () => {
    const provider = new FakePexelsProvider();
    provider.queueError('boom');

    await expect(
      provider.search({ query: 'fail', orientation: 'portrait', perPage: 1 })
    ).rejects.toThrow('boom');
  });
});
