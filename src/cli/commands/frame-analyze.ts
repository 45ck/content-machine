import { Command } from 'commander';
import { basename, extname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { handleCommandError } from '../utils';
import { CMError } from '../../core/errors';

type Mode = 'fps' | 'shots' | 'both';

type AnalyzeOptions = {
  output: string;
  fps: string;
  segments: string;
  shots: string;
  mode: Mode;
};

type CapturedFrame = {
  index: number;
  timeSec: number;
  path: string;
};

function baseNameNoExt(filePath: string): string {
  const name = basename(filePath);
  const ext = extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

function resolveBundledBinary(name: 'ffmpeg' | 'ffprobe'): string {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const bundled = resolve(
    process.cwd(),
    'node_modules',
    '@remotion',
    'compositor-win32-x64-msvc',
    exe
  );
  return existsSync(bundled) ? bundled : exe;
}

function probeDurationSec(videoPath: string, ffprobePath: string): number {
  const out = execFileSync(ffprobePath, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    videoPath,
  ]).toString('utf8');
  const duration = Number.parseFloat(out.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new CMError('VIDEO_PROBE_ERROR', 'Could not read video duration for frame analysis', {
      videoPath,
    });
  }
  return duration;
}

function buildEvenTimes(duration: number, count: number): number[] {
  if (count <= 1) return [0];
  const epsilon = 0.05;
  const safeDuration = Math.max(0, duration - epsilon);
  return Array.from({ length: count }, (_, i) => (safeDuration * i) / (count - 1));
}

function captureFrameAt(
  ffmpegPath: string,
  inputVideo: string,
  timeSec: number,
  outputPng: string
): void {
  execFileSync(ffmpegPath, [
    '-hide_banner',
    '-y',
    '-ss',
    String(timeSec),
    '-i',
    inputVideo,
    '-update',
    '1',
    '-frames:v',
    '1',
    outputPng,
  ]);
}

async function captureShots(params: {
  ffmpegPath: string;
  inputVideo: string;
  durationSec: number;
  count: number;
  dir: string;
}): Promise<CapturedFrame[]> {
  const times = buildEvenTimes(params.durationSec, params.count);
  const out: CapturedFrame[] = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i] ?? 0;
    const name = `shot_${String(i + 1).padStart(3, '0')}_${t.toFixed(3)}s.png`;
    const path = join(params.dir, name);
    captureFrameAt(params.ffmpegPath, params.inputVideo, t, path);
    out.push({ index: i + 1, timeSec: t, path });
  }
  return out;
}

async function captureByFps(params: {
  ffmpegPath: string;
  inputVideo: string;
  durationSec: number;
  fps: number;
  dir: string;
}): Promise<CapturedFrame[]> {
  const count = Math.max(1, Math.floor(params.durationSec * params.fps) + 1);
  const times = buildEvenTimes(params.durationSec, count);
  const out: CapturedFrame[] = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i] ?? 0;
    const name = `fps_${String(i + 1).padStart(3, '0')}_${t.toFixed(3)}s.png`;
    const path = join(params.dir, name);
    captureFrameAt(params.ffmpegPath, params.inputVideo, t, path);
    out.push({ index: i + 1, timeSec: t, path });
  }
  return out;
}

function buildSegments(durationSec: number, segments: number): Array<{ index: number; startSec: number; endSec: number }> {
  const out: Array<{ index: number; startSec: number; endSec: number }> = [];
  const segLen = durationSec / Math.max(1, segments);
  for (let i = 0; i < segments; i++) {
    const startSec = i * segLen;
    const endSec = i === segments - 1 ? durationSec : (i + 1) * segLen;
    out.push({ index: i + 1, startSec, endSec });
  }
  return out;
}

export const frameAnalyzeCommand = new Command('frame-analyze')
  .description(
    'Extract review frames from a video (max 1 fps) and split timeline into segments for repeatable analysis'
  )
  .argument('<video>', 'Input video path')
  .option('-o, --output <dir>', 'Output root directory', 'output/analysis')
  .option('--mode <mode>', 'Extraction mode: fps | shots | both', 'both')
  .option('--fps <value>', 'Frames per second to extract (max 1.0)', '1')
  .option('--shots <count>', 'Number of evenly spaced shots', '30')
  .option('--segments <count>', 'Number of timeline segments', '5')
  .action(async (video: string, options: AnalyzeOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Analyzing frames...').start();

    try {
      const modeRaw = String(options.mode ?? 'both').toLowerCase();
      if (modeRaw !== 'fps' && modeRaw !== 'shots' && modeRaw !== 'both') {
        throw new CMError('INVALID_ARGUMENT', `Invalid --mode value: ${options.mode}`, {
          fix: 'Use --mode fps, --mode shots, or --mode both',
        });
      }
      const mode = modeRaw as Mode;
      const fps = Number.parseFloat(String(options.fps ?? '1'));
      if (!Number.isFinite(fps) || fps <= 0 || fps > 1) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --fps value: ${options.fps}`, {
          fix: 'Use a number > 0 and <= 1 for --fps',
        });
      }
      const shots = Number.parseInt(String(options.shots ?? '30'), 10);
      if (!Number.isFinite(shots) || shots < 1) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --shots value: ${options.shots}`, {
          fix: 'Use an integer >= 1 for --shots',
        });
      }
      const segments = Number.parseInt(String(options.segments ?? '5'), 10);
      if (!Number.isFinite(segments) || segments < 1) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --segments value: ${options.segments}`, {
          fix: 'Use an integer >= 1 for --segments',
        });
      }

      const inputVideo = resolve(video);
      if (!existsSync(inputVideo)) {
        throw new CMError('FILE_NOT_FOUND', 'Input video not found', { path: inputVideo });
      }

      const ffmpegPath = resolveBundledBinary('ffmpeg');
      const ffprobePath = resolveBundledBinary('ffprobe');
      const durationSec = probeDurationSec(inputVideo, ffprobePath);
      const root = resolve(options.output, baseNameNoExt(inputVideo));
      const fpsDir = join(root, 'fps');
      const shotsDir = join(root, 'shots');
      await mkdir(root, { recursive: true });
      if (mode === 'fps' || mode === 'both') await mkdir(fpsDir, { recursive: true });
      if (mode === 'shots' || mode === 'both') await mkdir(shotsDir, { recursive: true });

      const fpsFrames =
        mode === 'fps' || mode === 'both'
          ? await captureByFps({ ffmpegPath, inputVideo, durationSec, fps, dir: fpsDir })
          : [];
      const shotFrames =
        mode === 'shots' || mode === 'both'
          ? await captureShots({ ffmpegPath, inputVideo, durationSec, count: shots, dir: shotsDir })
          : [];
      const segmentRanges = buildSegments(durationSec, segments);

      const manifestPath = join(root, 'frame-analysis.json');
      const manifest = {
        inputVideo,
        generatedAt: new Date().toISOString(),
        durationSec,
        mode,
        settings: { fps, shots, segments },
        outputs: {
          root,
          fpsDir: mode === 'fps' || mode === 'both' ? fpsDir : null,
          shotsDir: mode === 'shots' || mode === 'both' ? shotsDir : null,
        },
        segments: segmentRanges,
        fpsFrames,
        shotFrames,
      };
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      spinner.succeed('Frame analysis complete');
      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'frame-analyze',
            args: { video: inputVideo, mode, fps, shots, segments },
            outputs: {
              manifestPath,
              fpsFrameCount: fpsFrames.length,
              shotFrameCount: shotFrames.length,
              outputRoot: root,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
      } else {
        writeStderrLine(`Duration: ${durationSec.toFixed(2)}s`);
        writeStderrLine(`Segments: ${segments}`);
        writeStderrLine(`FPS frames: ${fpsFrames.length}`);
        writeStderrLine(`Shot frames: ${shotFrames.length}`);
        writeStderrLine(`Manifest: ${manifestPath}`);
        writeStdoutLine(manifestPath);
      }
    } catch (error) {
      spinner.fail('Frame analysis failed');
      handleCommandError(error);
    }
  });
