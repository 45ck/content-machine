import { describe, it, expect, vi, beforeEach } from 'vitest';

const kokoroMock = vi.fn(async () => ({
  audioPath: 'out.wav',
  duration: 1,
  sampleRate: 24000,
  cost: 0,
}));

const elevenlabsMock = vi.fn(async () => ({
  audioPath: 'out.wav',
  duration: 1,
  sampleRate: 44100,
  cost: 0,
}));

vi.mock('../../../src/audio/tts/kokoro', () => ({
  synthesizeSpeechKokoro: kokoroMock,
  getAvailableVoicesKokoro: vi.fn(async () => ['af_heart']),
}));

vi.mock('../../../src/audio/tts/elevenlabs', () => ({
  synthesizeSpeechElevenLabs: elevenlabsMock,
}));

describe('TTS router', () => {
  beforeEach(() => {
    vi.resetModules();
    kokoroMock.mockClear();
    elevenlabsMock.mockClear();
  });

  it('routes to kokoro by default', async () => {
    const { synthesizeSpeech } = await import('../../../src/audio/tts');
    await synthesizeSpeech({ text: 'hi', voice: 'af_heart', outputPath: 'out.wav' });
    expect(kokoroMock).toHaveBeenCalledTimes(1);
    expect(elevenlabsMock).toHaveBeenCalledTimes(0);
  });

  it('routes to elevenlabs when engine=elevenlabs', async () => {
    const { synthesizeSpeech } = await import('../../../src/audio/tts');
    await synthesizeSpeech({
      engine: 'elevenlabs',
      text: 'hi',
      voice: 'voice-id',
      outputPath: 'out.wav',
    } as any);
    expect(elevenlabsMock).toHaveBeenCalledTimes(1);
    expect(kokoroMock).toHaveBeenCalledTimes(0);
  });
});
