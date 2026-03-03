/**
 * TTS (ElevenLabs) - Cloud Text-to-Speech
 *
 * Implementation notes:
 * - We stream ElevenLabs output to a temporary file, then (optionally) transcode to the
 *   requested output extension using FFmpeg. This keeps the rest of the pipeline
 *   (Whisper resampling, rendering) consistent with existing WAV defaults.
 */

import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createLogger } from '../../core/logger';
import { APIError, RateLimitError } from '../../core/errors';
import { getApiKey } from '../../core/config';
import { withRetry } from '../../core/retry';
import type { TTSOptions, TTSResult } from './types';

const execAsync = promisify(exec);

async function ffprobeDurationSeconds(filePath: string): Promise<number> {
  const abs = resolve(filePath);
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${abs}"`
  );
  const dur = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new Error(`Invalid duration from ffprobe: ${stdout.trim()}`);
  }
  return dur;
}

async function ffprobeSampleRate(filePath: string): Promise<number> {
  const abs = resolve(filePath);
  const { stdout } = await execAsync(
    `ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 "${abs}"`
  );
  const rate = Number.parseInt(stdout.trim(), 10);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid sample rate from ffprobe: ${stdout.trim()}`);
  }
  return rate;
}

async function transcodeToWav(params: { inputPath: string; outputPath: string }): Promise<void> {
  const inAbs = resolve(params.inputPath);
  const outAbs = resolve(params.outputPath);
  await execAsync(`ffmpeg -y -i "${inAbs}" -ac 1 -ar 44100 -c:a pcm_s16le "${outAbs}"`, {
    maxBuffer: 1024 * 1024,
  });
}

/**
 * Synthesize speech using ElevenLabs and write the resulting audio artifact to `outputPath`.
 */
export async function synthesizeSpeechElevenLabs(options: TTSOptions): Promise<TTSResult> {
  const log = createLogger({ module: 'tts', engine: 'elevenlabs', voice: options.voice });
  const apiKey = getApiKey('ELEVENLABS_API_KEY');
  const apiBaseUrl = options.elevenlabs?.apiBaseUrl ?? 'https://api.elevenlabs.io';
  const modelId = options.elevenlabs?.modelId ?? 'eleven_multilingual_v2';
  const outputFormat = options.elevenlabs?.outputFormat ?? 'mp3_44100_128';

  const outAbs = resolve(options.outputPath);
  await mkdir(dirname(outAbs), { recursive: true });

  const tmpPath = join(dirname(outAbs), `${basename(outAbs)}.elevenlabs.tmp`);
  const url = `${apiBaseUrl.replace(/\/+$/u, '')}/v1/text-to-speech/${encodeURIComponent(
    options.voice
  )}/stream`;

  log.info({ textLength: options.text.length, outputFormat, modelId }, 'Starting ElevenLabs TTS');

  const res = await withRetry(
    async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text: options.text,
          model_id: modelId,
          output_format: outputFormat,
          voice_settings: options.elevenlabs?.voiceSettings ?? undefined,
        }),
      });

      if (response.status === 429) {
        const retryAfterRaw = response.headers.get('retry-after');
        const retryAfter = retryAfterRaw ? Number.parseInt(retryAfterRaw, 10) : 10;
        throw new RateLimitError('elevenlabs', Number.isFinite(retryAfter) ? retryAfter : 10);
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new APIError(
          `ElevenLabs TTS failed: ${response.status} ${response.statusText} ${errText}`,
          {
            provider: 'elevenlabs',
            status: response.status,
            voice: options.voice,
            engine: 'elevenlabs',
          }
        );
      }

      return response;
    },
    { context: { provider: 'elevenlabs', op: 'tts' } }
  );

  if (!res.body) {
    throw new APIError(`ElevenLabs TTS returned no body`, {
      provider: 'elevenlabs',
      status: 200,
      engine: 'elevenlabs',
      voice: options.voice,
    });
  }

  // Stream response bytes to a temporary mp3 file.
  await pipeline(Readable.fromWeb(res.body as any), createWriteStream(tmpPath));

  const ext = extname(outAbs).toLowerCase();
  try {
    if (ext === '.mp3') {
      await rename(tmpPath, outAbs);
    } else {
      // Default pipeline output is WAV; keep that consistent by transcoding.
      await transcodeToWav({ inputPath: tmpPath, outputPath: outAbs });
      await rm(tmpPath, { force: true });
    }
  } catch (error) {
    throw new APIError(`ElevenLabs output post-processing failed. Ensure FFmpeg is installed.`, {
      error: String(error),
      outputPath: outAbs,
    });
  }

  // Derive media metadata from the output artifact.
  try {
    const [duration, sampleRate] = await Promise.all([
      ffprobeDurationSeconds(outAbs),
      ffprobeSampleRate(outAbs),
    ]);

    return {
      audioPath: outAbs,
      duration,
      sampleRate,
      cost: 0,
    };
  } catch (error) {
    log.error({ error }, 'Failed to probe ElevenLabs output metadata');
    throw new APIError(`Failed to probe ElevenLabs output metadata. Ensure FFmpeg is installed.`, {
      engine: 'elevenlabs',
      outputPath: outAbs,
    });
  }
}
