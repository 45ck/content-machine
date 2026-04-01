/**
 * FFmpeg composition engine for the editor V&V experiment.
 *
 * Builds a single MP4 from a manifest's segment list using FFmpeg
 * filter_complex (color bars + drawtext captions + sine/silence audio).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { resolveFfmpegPath } from '../../src/core/video/ffmpeg';
import type { EditorVVManifest } from './ground-truth';

const execFileAsync = promisify(execFile);

/** Windows-safe font path for drawtext filter. */
const FONT_FILE =
  process.platform === 'win32'
    ? 'C\\:/Windows/Fonts/arial.ttf'
    : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

/**
 * Compose an MP4 from a manifest's FFmpeg segments.
 *
 * @returns Absolute path to the generated MP4.
 */
export async function composeFromManifest(
  manifest: EditorVVManifest,
  outputDir: string,
  opts?: { verbose?: boolean }
): Promise<string> {
  if (!manifest.segments || manifest.segments.length === 0) {
    throw new Error(`Manifest "${manifest.name}" has no FFmpeg segments`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${manifest.name}.mp4`);
  const args = buildFfmpegArgs(manifest, outputPath);

  if (opts?.verbose) {
    console.log(`    ffmpeg ${args.join(' ').slice(0, 200)}...`);
  }

  const ffmpegPath = resolveFfmpegPath();
  try {
    await execFileAsync(ffmpegPath, args, {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`FFmpeg failed for "${manifest.name}": ${msg}`);
  }

  return outputPath;
}

/* ------------------------------------------------------------------ */
/*  Argument builder                                                    */
/* ------------------------------------------------------------------ */

function buildFfmpegArgs(manifest: EditorVVManifest, outputPath: string): string[] {
  const segments = manifest.segments!;
  const { width, height } = manifest.resolution;
  const size = `${width}x${height}`;
  const fps = manifest.fps;

  const inputs: string[] = [];
  const filterParts: string[] = [];
  const concatInputs: string[] = [];

  let inputIdx = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Video input
    inputs.push(
      '-f',
      'lavfi',
      '-i',
      `color=c=${seg.video.color}:s=${size}:d=${seg.duration}:r=${fps}`
    );
    const vidIdx = inputIdx++;

    // Audio input
    if (seg.audio.type === 'sine') {
      inputs.push(
        '-f',
        'lavfi',
        '-i',
        `sine=frequency=${seg.audio.frequency}:duration=${seg.duration}`
      );
    } else {
      inputs.push('-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`);
      // We'll trim silence to segment duration in the filter
    }
    const audIdx = inputIdx++;

    // Video filter: optionally apply drawtext
    const vidLabel = `v${i}`;
    if (seg.drawtext) {
      const dt = seg.drawtext;
      const escapedText = dt.text.replace(/'/g, "\\'");
      filterParts.push(
        `[${vidIdx}:v]drawtext=fontfile=${FONT_FILE}:text='${escapedText}':fontsize=${dt.fontsize}:fontcolor=${dt.fontcolor}:x=${dt.x}:y=${dt.y}[${vidLabel}]`
      );
    } else {
      filterParts.push(`[${vidIdx}:v]null[${vidLabel}]`);
    }

    // Audio filter: trim silence sources to segment duration
    const audLabel = `a${i}`;
    if (seg.audio.type === 'silence') {
      filterParts.push(`[${audIdx}:a]atrim=0:${seg.duration},asetpts=PTS-STARTPTS[${audLabel}]`);
    } else {
      filterParts.push(`[${audIdx}:a]anull[${audLabel}]`);
    }

    concatInputs.push(`[${vidLabel}][${audLabel}]`);
  }

  // Concat filter
  const n = segments.length;
  filterParts.push(`${concatInputs.join('')}concat=n=${n}:v=1:a=1[vout][aout]`);

  const filterComplex = filterParts.join('; ');

  return [
    '-y',
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '28',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '64k',
    '-movflags',
    '+faststart',
    outputPath,
  ];
}
