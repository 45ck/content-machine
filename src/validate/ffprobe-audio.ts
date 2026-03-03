import { execFile } from 'node:child_process';
import { CMError } from '../core/errors';

function execFileJson(
  cmd: string,
  args: string[],
  options: { timeout: number; windowsHide: boolean }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  sample_rate?: string;
  channels?: number;
}

interface FfprobeFormat {
  format_name?: string;
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

interface ProbeOptions {
  timeoutMs?: number;
  ffprobePath?: string;
}

export interface AudioInfo {
  path: string;
  durationSeconds: number;
  sampleRate: number;
  channels?: number;
  codec: string;
  container: string;
}

function normalizeContainer(formatName: string | undefined): string {
  if (!formatName) return 'unknown';
  const normalized = formatName.toLowerCase();
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('ogg')) return 'ogg';
  return normalized.split(',')[0] ?? 'unknown';
}

async function executeFfprobe(audioPath: string, options: Required<ProbeOptions>): Promise<string> {
  const { stdout } = await execFileJson(
    options.ffprobePath,
    ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', audioPath],
    { timeout: options.timeoutMs, windowsHide: true }
  );
  return stdout;
}

function parseStreams(parsed: FfprobeOutput): { audio?: FfprobeStream } {
  const streams = parsed.streams ?? [];
  return {
    audio: streams.find((stream) => stream.codec_type === 'audio'),
  };
}

function validateAndExtractInfo(parsed: FfprobeOutput, audioPath: string): AudioInfo {
  const { audio: audioStream } = parseStreams(parsed);
  const durationRaw = parsed.format?.duration;
  const durationSeconds = durationRaw ? Number(durationRaw) : NaN;
  const sampleRate = audioStream?.sample_rate ? Number(audioStream.sample_rate) : NaN;

  if (!audioStream) {
    throw new CMError('AUDIO_PROBE_ERROR', 'ffprobe output missing audio stream', { audioPath });
  }
  if (!Number.isFinite(sampleRate)) {
    throw new CMError('AUDIO_PROBE_ERROR', 'ffprobe output missing sample rate', { audioPath });
  }
  if (!Number.isFinite(durationSeconds)) {
    throw new CMError('AUDIO_PROBE_ERROR', 'ffprobe output missing duration', { audioPath });
  }

  return {
    path: audioPath,
    durationSeconds,
    sampleRate,
    channels: audioStream.channels,
    codec: audioStream.codec_name ?? 'unknown',
    container: normalizeContainer(parsed.format?.format_name),
  };
}

function handleProbeError(error: unknown, audioPath: string, ffprobePath: string): never {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new CMError('DEPENDENCY_MISSING', 'ffprobe is required but was not found on PATH', {
      ffprobePath,
    });
  }
  if (error instanceof SyntaxError) {
    throw new CMError('AUDIO_PROBE_ERROR', 'ffprobe returned invalid JSON', { audioPath }, error);
  }
  if (error instanceof CMError) {
    throw error;
  }
  throw new CMError(
    'AUDIO_PROBE_ERROR',
    `Failed to probe audio: ${error instanceof Error ? error.message : String(error)}`,
    { audioPath },
    error instanceof Error ? error : undefined
  );
}

export async function probeAudioWithFfprobe(
  audioPath: string,
  options?: ProbeOptions
): Promise<AudioInfo> {
  const resolvedOptions: Required<ProbeOptions> = {
    timeoutMs: options?.timeoutMs ?? 10_000,
    ffprobePath: options?.ffprobePath ?? 'ffprobe',
  };

  try {
    const stdout = await executeFfprobe(audioPath, resolvedOptions);
    const parsed = JSON.parse(stdout) as FfprobeOutput;
    return validateAndExtractInfo(parsed, audioPath);
  } catch (error) {
    handleProbeError(error, audioPath, resolvedOptions.ffprobePath);
  }
}
