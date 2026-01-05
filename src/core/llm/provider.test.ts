/**
 * LLM Provider Tests
 * TDD: Write tests FIRST, then implement
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import type { LLMMessage } from './provider';

describe('LLMProvider Interface', () => {
  describe('FakeLLMProvider', () => {
    let provider: FakeLLMProvider;

    beforeEach(() => {
      provider = new FakeLLMProvider();
    });

    it('should implement LLMProvider interface', () => {
      expect(provider.name).toBe('fake');
      expect(typeof provider.chat).toBe('function');
    });

    it('should return queued response', async () => {
      provider.queueResponse({
        content: 'Hello, world!',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });

      const messages: LLMMessage[] = [{ role: 'user', content: 'Hi' }];
      const response = await provider.chat(messages);

      expect(response.content).toBe('Hello, world!');
      expect(response.usage.totalTokens).toBe(15);
    });

    it('should return queued JSON response', async () => {
      const data = { title: 'Test', scenes: [] };
      provider.queueJsonResponse(data);

      const messages: LLMMessage[] = [{ role: 'user', content: 'Generate' }];
      const response = await provider.chat(messages);

      expect(JSON.parse(response.content)).toEqual(data);
    });

    it('should track all calls', async () => {
      provider.queueResponse({
        content: 'Response 1',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
      provider.queueResponse({
        content: 'Response 2',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });

      await provider.chat([{ role: 'user', content: 'First' }]);
      await provider.chat([{ role: 'user', content: 'Second' }]);

      const calls = provider.getCalls();
      expect(calls).toHaveLength(2);
      expect(calls[0][0].content).toBe('First');
      expect(calls[1][0].content).toBe('Second');
    });

    it('should return last call', async () => {
      provider.queueResponse({
        content: 'Response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });

      await provider.chat([
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ]);

      const lastCall = provider.getLastCall();
      expect(lastCall).toHaveLength(2);
      expect(lastCall?.[1].content).toBe('Hello');
    });

    it('should throw when no response queued', async () => {
      await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        'No response queued'
      );
    });

    it('should queue error', async () => {
      provider.queueError(new Error('API Error'));

      await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('API Error');
    });

    it('should track total tokens used', async () => {
      provider.queueResponse({
        content: 'R1',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
      provider.queueResponse({
        content: 'R2',
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      });

      await provider.chat([{ role: 'user', content: 'A' }]);
      await provider.chat([{ role: 'user', content: 'B' }]);

      expect(provider.getTotalTokens()).toBe(45);
    });

    it('should reset state', async () => {
      provider.queueResponse({
        content: 'R1',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
      await provider.chat([{ role: 'user', content: 'A' }]);

      provider.reset();

      expect(provider.getCalls()).toHaveLength(0);
      expect(provider.getTotalTokens()).toBe(0);
    });
  });
});

describe('LLMMessage', () => {
  it('should support all role types', () => {
    const messages: LLMMessage[] = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'User message' },
      { role: 'assistant', content: 'Assistant response' },
    ];

    expect(messages).toHaveLength(3);
  });
});
