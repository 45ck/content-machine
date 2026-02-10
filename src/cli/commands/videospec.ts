/**
 * VideoSpec command - reverse-engineer a short-form video into VideoSpec.v1.json
 *
 * Usage:
 *   cm videospec -i input.mp4 -o output/videospec.v1.json
 */
import { Command } from 'commander';
import { handleCommandError, parseWhisperModel } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { analyzeVideoToVideoSpecV1, type NarrativeMode, type VideoSpecPass } from '../../videospec';
import { CMError } from '../../core/errors';

interface VideoSpecOptions {
  input: string;
  output: string;
  pass: VideoSpecPass;
  cache: boolean;
  cacheDir?: string;
  maxSeconds?: string;
  shotDetector: 'auto' | 'pyscenedetect' | 'ffmpeg';
  shotThreshold?: string;
  ocr: boolean;
  ocrFps?: string;
  asr: boolean;
  asrModel?: string;
  narrative: NarrativeMode;
}

function parsePositiveNumber(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new CMError('INVALID_ARGUMENT', `Invalid ${name}: ${value}`, {
      fix: `Use a positive number for ${name}`,
    });
  }
  return n;
}

export const videospecCommand = new Command('videospec')
  .description(
    'Reverse-engineer a video into VideoSpec.v1.json (shots, OCR captions, transcript, narrative)'
  )
  .requiredOption('-i, --input <path>', 'Input video path (mp4/webm/mkv)')
  .option('-o, --output <path>', 'Output VideoSpec JSON path', 'videospec.v1.json')
  .option('--pass <p>', 'Pass: 1 (fast), 2 (refine), both', '1')
  .option('--no-cache', 'Disable module result caching')
  .option('--cache-dir <path>', 'Cache directory (overrides $CM_VIDEOSPEC_CACHE_DIR)')
  .option('--max-seconds <n>', 'Only analyze the first N seconds (dev/fast)')
  .option('--shot-detector <mode>', 'auto|pyscenedetect|ffmpeg', 'auto')
  .option('--shot-threshold <n>', 'PySceneDetect threshold (default 30)', '30')
  .option('--no-ocr', 'Disable OCR (captions/overlays)')
  .option('--ocr-fps <n>', 'OCR FPS sampling rate (default depends on pass)', undefined)
  .option('--no-asr', 'Disable ASR (transcript)')
  .option('--asr-model <model>', 'Whisper model: tiny|base|small|medium|large', 'base')
  .option('--narrative <mode>', 'Narrative mode: heuristic|llm|off', 'heuristic')
  .action(async (options: VideoSpecOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Analyzing video...').start();

    try {
      const passRaw = String(options.pass ?? '1');
      const pass: VideoSpecPass =
        passRaw === '1' || passRaw === '2' || passRaw === 'both' ? passRaw : '1';

      const narrativeRaw = String(options.narrative ?? 'heuristic') as NarrativeMode;
      const narrative: NarrativeMode =
        narrativeRaw === 'heuristic' || narrativeRaw === 'llm' || narrativeRaw === 'off'
          ? narrativeRaw
          : 'heuristic';

      if (runtime.offline && narrative === 'llm') {
        throw new CMError('INVALID_ARGUMENT', '--narrative llm is not allowed in --offline mode', {
          fix: 'Use --narrative heuristic or remove --offline',
        });
      }

      const shotDetector = options.shotDetector;
      if (
        shotDetector !== 'auto' &&
        shotDetector !== 'pyscenedetect' &&
        shotDetector !== 'ffmpeg'
      ) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --shot-detector: ${shotDetector}`, {
          fix: 'Use: auto, pyscenedetect, ffmpeg',
        });
      }

      const maxSeconds = options.maxSeconds
        ? parsePositiveNumber(options.maxSeconds, '--max-seconds')
        : undefined;
      const shotThreshold = parsePositiveNumber(options.shotThreshold, '--shot-threshold');
      const ocrFps = options.ocrFps ? parsePositiveNumber(options.ocrFps, '--ocr-fps') : undefined;
      const asrModel = parseWhisperModel(options.asrModel);

      const result = await analyzeVideoToVideoSpecV1({
        inputPath: options.input,
        outputPath: options.output,
        pass,
        cache: options.cache,
        cacheDir: options.cacheDir,
        maxSeconds,
        shotDetector,
        shotThreshold,
        ocr: options.ocr,
        ocrFps,
        asr: options.asr,
        asrModel,
        narrative,
      });

      spinner.succeed('VideoSpec generated');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'videospec',
            args: {
              input: options.input,
              output: options.output,
              pass,
              cache: options.cache,
              maxSeconds: maxSeconds ?? null,
              shotDetector,
              shotThreshold: shotThreshold ?? null,
              ocr: options.ocr,
              ocrFps: ocrFps ?? null,
              asr: options.asr,
              asrModel,
              narrative,
            },
            outputs: {
              videospecPath: options.output,
              shots: result.spec.timeline.shots.length,
              transcriptSegments: result.spec.audio.transcript.length,
              captions: result.spec.editing.captions.length,
              overlays: result.spec.editing.text_overlays.length,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(0);
      }

      writeStderrLine(`Shots: ${result.spec.timeline.shots.length}`);
      writeStderrLine(`Transcript segments: ${result.spec.audio.transcript.length}`);
      writeStderrLine(`OCR captions: ${result.spec.editing.captions.length}`);
      writeStderrLine(`OCR overlays: ${result.spec.editing.text_overlays.length}`);

      // Human-mode stdout: primary artifact path only.
      writeStdoutLine(options.output);
      process.exit(0);
    } catch (error) {
      spinner.fail('VideoSpec failed');
      handleCommandError(error);
    }
  });
