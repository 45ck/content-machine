/**
 * Logger tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, createLogger, logTiming } from './logger';

describe('Logger', () => {
  describe('logger', () => {
    it('should be a pino logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('createLogger', () => {
    it('should create a child logger with context', () => {
      const childLogger = createLogger({ module: 'test', stage: 'script' });
      
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });

    it('should include context in log output', () => {
      const childLogger = createLogger({ pipeline: 'audio' });
      
      // Child logger should have bindings
      expect(childLogger.bindings()).toEqual({ pipeline: 'audio' });
    });
  });

  describe('logTiming', () => {
    it('should measure execution time of async function', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      const result = await logTiming('test operation', mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from function', async () => {
      const error = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(logTiming('failing operation', mockFn)).rejects.toThrow('Test error');
    });

    it('should use provided logger', async () => {
      const customLogger = createLogger({ custom: true });
      const mockFn = vi.fn().mockResolvedValue('done');

      const result = await logTiming('custom log', mockFn, customLogger);

      expect(result).toBe('done');
    });
  });
});
