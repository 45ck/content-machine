#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

sharp.cache(false);
sharp.concurrency(1);

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..', '..');
const defaultOut = join(repoRoot, 'experiments', `video-quality-review-${todayStamp()}`);

const args = parseArgs(process.argv.slice(2));
const inputDir = resolve(args.inputDir ?? join(repoRoot, 'docs', 'demo'));
const outputDir = resolve(args.outputDir ?? defaultOut);
const fps = Number(args.fps ?? 1);
const maxFrames = Number(args.maxFrames ?? 8);
const contactFrames = Number(args.contactFrames ?? 12);
const videoEvaluatorRoot = resolveVideoEvaluatorRoot();
let videoEvaluatorModulePromise = null;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function slugify(filePath) {
  return basename(filePath).replace(/\.mp4$/i, '');
}

function resolveVideoEvaluatorRoot() {
  const explicit = args.videoEvaluatorRoot ?? process.env.VIDEO_EVALUATOR_ROOT;
  if (explicit) {
    const root = resolve(String(explicit));
    return hasRunnableVideoEvaluator(root) ? root : null;
  }
  const sibling = resolve(repoRoot, '..', 'video-evaluator');
  return hasRunnableVideoEvaluator(sibling) ? sibling : null;
}

function hasRunnableVideoEvaluator(root) {
  return (
    existsSync(join(root, 'dist', 'index.js')) ||
    existsSync(join(root, 'agent', 'run-tool.mjs')) ||
    existsSync(join(root, 'scripts', 'harness', 'layout-safety-review.ts'))
  );
}

function resolveVideoEvaluatorEntrypoints() {
  const entrypoints = ['@45ck/video-evaluator'];
  if (videoEvaluatorRoot) {
    const distPath = join(videoEvaluatorRoot, 'dist', 'index.js');
    if (existsSync(distPath)) entrypoints.push(pathToFileURL(distPath).href);
  }
  return entrypoints;
}

async function loadVideoEvaluatorModule() {
  if (!videoEvaluatorModulePromise) {
    videoEvaluatorModulePromise = (async () => {
      for (const specifier of resolveVideoEvaluatorEntrypoints()) {
        try {
          const mod = await import(specifier);
          const runLayoutSafetyReview = mod.runLayoutSafetyReview ?? mod.reviewLayoutSafety;
          if (typeof runLayoutSafetyReview === 'function') {
            return { runLayoutSafetyReview };
          }
        } catch {
          // Optional adapter: keep the local audit path when the package is unavailable.
        }
      }
      return null;
    })();
  }
  return videoEvaluatorModulePromise;
}

function run(command, args, opts = {}) {
  return execFileSync(command, args, {
    encoding: opts.encoding ?? 'utf8',
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
  });
}

function ffprobe(videoPath) {
  const raw = run('ffprobe', [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    videoPath,
  ]);
  const data = JSON.parse(raw);
  const video = data.streams.find((s) => s.codec_type === 'video');
  const audio = data.streams.find((s) => s.codec_type === 'audio');
  return {
    path: videoPath,
    width: Number(video?.width ?? 0),
    height: Number(video?.height ?? 0),
    durationSeconds: Number(data.format?.duration ?? video?.duration ?? 0),
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    hasAudio: Boolean(audio),
    frameRate: parseFrameRate(video?.r_frame_rate),
    bitRate: Number(data.format?.bit_rate ?? 0),
  };
}

function parseFrameRate(value) {
  if (!value || typeof value !== 'string') return null;
  const [n, d] = value.split('/').map(Number);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return n / d;
}

function audioStats(videoPath) {
  if (!existsSync(videoPath)) return null;
  const result = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', videoPath, '-af', 'volumedetect', '-vn', '-f', 'null', '-'],
    { encoding: 'utf8' }
  );
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return parseVolumedetect(text);
}

function parseVolumedetect(text) {
  const mean = text.match(/mean_volume:\s*(-?\d+(?:\.\d+)?) dB/);
  const max = text.match(/max_volume:\s*(-?\d+(?:\.\d+)?) dB/);
  return {
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
  };
}

function extractFrames(videoPath, dir, durationSeconds) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const count = Math.max(3, Math.min(maxFrames, Math.floor(durationSeconds * fps) + 1));
  const times = Array.from({ length: count }, (_, i) => {
    if (count === 1) return 0;
    return Math.min(Math.max(0, durationSeconds - 0.1), (durationSeconds * i) / (count - 1));
  });

  return times.map((time, index) => {
    const out = join(dir, `frame-${String(index + 1).padStart(3, '0')}-${time.toFixed(2)}s.jpg`);
    run(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        String(time),
        '-i',
        videoPath,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        out,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return { index: index + 1, timeSeconds: time, path: out };
  });
}

async function imageMetrics(frame) {
  const image = sharp(frame.path).resize(180, 320, { fit: 'fill' }).removeAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  let lumaSum = 0;
  let white = 0;
  let black = 0;
  let saturatedBright = 0;
  let captionBandBright = 0;
  let captionBandHighContrast = 0;
  let captionBandPixels = 0;
  let edgeWhite = 0;
  let edgeBlack = 0;
  let edgePixels = 0;
  const lumas = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const px = y * width + x;
      lumas[px] = l;
      lumaSum += l;
      if (r > 245 && g > 245 && b > 245) white++;
      if (r < 10 && g < 10 && b < 10) black++;
      if (l > 0.78 && sat > 0.35) saturatedBright++;

      const inCaptionBand =
        y > height * 0.34 && y < height * 0.78 && x > width * 0.06 && x < width * 0.94;
      if (inCaptionBand) {
        captionBandPixels++;
        if (l > 0.72) captionBandBright++;
        if ((l > 0.72 && sat > 0.12) || (l > 0.88 && sat < 0.12)) captionBandHighContrast++;
      }

      const edge =
        x < width * 0.015 || x > width * 0.985 || y < height * 0.015 || y > height * 0.985;
      if (edge) {
        edgePixels++;
        if (r > 245 && g > 245 && b > 245) edgeWhite++;
        if (r < 10 && g < 10 && b < 10) edgeBlack++;
      }
    }
  }

  return {
    ...frame,
    meanLuma: lumaSum / (width * height),
    whiteRatio: white / (width * height),
    blackRatio: black / (width * height),
    saturatedBrightRatio: saturatedBright / (width * height),
    captionBandSignalRatio:
      captionBandPixels > 0 ? (captionBandBright + captionBandHighContrast) / captionBandPixels : 0,
    edgeWhiteRatio: edgePixels > 0 ? edgeWhite / edgePixels : 0,
    edgeBlackRatio: edgePixels > 0 ? edgeBlack / edgePixels : 0,
    lumas,
  };
}

function diffScore(a, b) {
  if (!a || !b || a.lumas.length !== b.lumas.length) return null;
  let sum = 0;
  for (let i = 0; i < a.lumas.length; i++) {
    sum += Math.abs(a.lumas[i] - b.lumas[i]);
  }
  return sum / a.lumas.length;
}

function contiguousRuns(frames, predicate) {
  const runs = [];
  let current = null;
  for (const frame of frames) {
    if (predicate(frame)) {
      if (!current)
        current = { start: frame.timeSeconds, end: frame.timeSeconds, count: 0, frames: [] };
      current.end = frame.timeSeconds;
      current.count++;
      current.frames.push(frame.index);
    } else if (current) {
      runs.push(current);
      current = null;
    }
  }
  if (current) runs.push(current);
  return runs.map((run) => ({ ...run, durationSeconds: Math.max(0, run.end - run.start) }));
}

async function makeContactSheet(frames, outPath) {
  const selected = pickEven(frames, contactFrames);
  const thumbs = await Promise.all(
    selected.map(async (frame) => {
      const label = `${frame.timeSeconds.toFixed(1)}s`;
      const img = await sharp(frame.path)
        .resize(270, 480, { fit: 'cover' })
        .composite([
          {
            input: Buffer.from(
              `<svg width="270" height="42"><rect width="270" height="42" fill="rgba(0,0,0,0.68)"/><text x="12" y="28" font-size="22" font-family="Arial" fill="white">${escapeXml(
                label
              )}</text></svg>`
            ),
            top: 0,
            left: 0,
          },
        ])
        .jpeg({ quality: 86 })
        .toBuffer();
      return img;
    })
  );
  const cols = 4;
  const rows = Math.ceil(thumbs.length / cols);
  const canvas = sharp({
    create: {
      width: cols * 270,
      height: rows * 480,
      channels: 3,
      background: '#111111',
    },
  });
  await canvas
    .composite(
      thumbs.map((input, i) => ({ input, left: (i % cols) * 270, top: Math.floor(i / cols) * 480 }))
    )
    .jpeg({ quality: 88 })
    .toFile(outPath);
}

async function makeReviewContactSheet(reports, outPath) {
  const selected = reports.filter((report) => existsSync(report.contactSheetPath));
  const thumbs = await Promise.all(
    selected.map(async (report) => {
      const worst = report.issues.some((i) => i.severity === 'error')
        ? 'ERROR'
        : report.issues.some((i) => i.severity === 'warning')
          ? 'WARN'
          : 'PASS';
      const badge = worst === 'ERROR' ? '#d71920' : worst === 'WARN' ? '#f2a900' : '#178a44';
      const label = `${worst} ${basename(report.videoPath)}`;
      return sharp(report.contactSheetPath)
        .resize(540, 960, { fit: 'cover' })
        .composite([
          {
            input: Buffer.from(
              `<svg width="540" height="74"><rect width="540" height="74" fill="rgba(0,0,0,0.74)"/><rect x="12" y="15" width="92" height="44" rx="8" fill="${badge}"/><text x="29" y="45" font-size="24" font-family="Arial" font-weight="700" fill="white">${worst}</text><text x="120" y="46" font-size="22" font-family="Arial" fill="white">${escapeXml(
                label.slice(worst.length + 1)
              )}</text></svg>`
            ),
            top: 0,
            left: 0,
          },
        ])
        .jpeg({ quality: 86 })
        .toBuffer();
    })
  );
  const cols = 3;
  const rows = Math.ceil(thumbs.length / cols);
  const canvas = sharp({
    create: {
      width: cols * 540,
      height: rows * 960,
      channels: 3,
      background: '#101010',
    },
  });
  await canvas
    .composite(
      thumbs.map((input, i) => ({ input, left: (i % cols) * 540, top: Math.floor(i / cols) * 960 }))
    )
    .jpeg({ quality: 88 })
    .toFile(outPath);
}

function escapeXml(value) {
  return value.replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]
  );
}

function pickEven(items, count) {
  if (items.length <= count) return items;
  return Array.from(
    { length: count },
    (_, i) => items[Math.round((i * (items.length - 1)) / (count - 1))]
  );
}

function issue(severity, code, message, details = {}) {
  return { severity, code, message, details };
}

function analyzeIssues({ info, audio, frames }) {
  const issues = [];
  if (info.width !== 1080 || info.height !== 1920) {
    issues.push(
      issue('error', 'wrong-resolution', `Expected 1080x1920, got ${info.width}x${info.height}`)
    );
  }
  if (!info.hasAudio) {
    issues.push(issue('error', 'missing-audio', 'No audio stream detected.'));
  } else if (audio?.maxVolumeDb != null && audio.maxVolumeDb < -35) {
    issues.push(
      issue(
        'error',
        'near-silent-audio',
        `Audio peak is very low (${audio.maxVolumeDb} dB).`,
        audio
      )
    );
  }

  const whiteFrames = frames.filter((f) => f.meanLuma > 0.9 || f.whiteRatio > 0.55);
  if (whiteFrames.length > 0) {
    issues.push(
      issue(
        'warning',
        'white-flash-or-white-frame',
        `${whiteFrames.length} sampled frame(s) are mostly white/very bright.`,
        { times: whiteFrames.slice(0, 8).map((f) => Number(f.timeSeconds.toFixed(2))) }
      )
    );
  }

  const blackFrames = frames.filter((f) => f.meanLuma < 0.04 || f.blackRatio > 0.82);
  if (blackFrames.length > 0) {
    issues.push(
      issue('error', 'black-frame', `${blackFrames.length} sampled frame(s) are mostly black.`, {
        times: blackFrames.slice(0, 8).map((f) => Number(f.timeSeconds.toFixed(2))),
      })
    );
  }

  const edgeWhiteFrames = frames.filter((f) => f.edgeWhiteRatio > 0.45);
  if (edgeWhiteFrames.length > Math.max(2, frames.length * 0.12)) {
    issues.push(
      issue(
        'warning',
        'white-edge-artifact',
        'White pixels appear on frame edges in many sampled frames.',
        {
          count: edgeWhiteFrames.length,
          times: edgeWhiteFrames.slice(0, 8).map((f) => Number(f.timeSeconds.toFixed(2))),
        }
      )
    );
  }

  const edgeBlackFrames = frames.filter((f) => f.edgeBlackRatio > 0.55 && f.meanLuma > 0.08);
  if (edgeBlackFrames.length > Math.max(2, frames.length * 0.12)) {
    issues.push(
      issue(
        'error',
        'black-gutter-artifact',
        'Black gutters or boxed-in source media appear on frame edges.',
        {
          count: edgeBlackFrames.length,
          times: edgeBlackFrames.slice(0, 8).map((f) => Number(f.timeSeconds.toFixed(2))),
        }
      )
    );
  }

  const lowMotionRuns = contiguousRuns(
    frames,
    (f) => f.diffFromPrevious != null && f.diffFromPrevious < 0.006
  ).filter((r) => r.durationSeconds >= 4);
  if (lowMotionRuns.length > 0) {
    issues.push(
      issue('warning', 'low-motion-run', 'Long low-motion/static sampled run detected.', {
        runs: lowMotionRuns.map((r) => ({
          start: Number(r.start.toFixed(2)),
          end: Number(r.end.toFixed(2)),
          duration: Number(r.durationSeconds.toFixed(2)),
        })),
      })
    );
  }

  const sparseCaptionRuns = contiguousRuns(frames, (f) => f.captionBandSignalRatio < 0.008).filter(
    (r) => r.durationSeconds >= 4
  );
  if (sparseCaptionRuns.length > 0) {
    issues.push(
      issue(
        'info',
        'caption-band-sparse',
        'Caption/text signal is sparse for a long run. This is heuristic and needs visual review.',
        {
          runs: sparseCaptionRuns.slice(0, 5).map((r) => ({
            start: Number(r.start.toFixed(2)),
            end: Number(r.end.toFixed(2)),
            duration: Number(r.durationSeconds.toFixed(2)),
          })),
        }
      )
    );
  }
  return issues;
}

function findLayoutSidecar(videoPath) {
  const candidate = videoPath.replace(/\.mp4$/i, '.layout.json');
  return existsSync(candidate) ? candidate : null;
}

async function runLayoutSafetyReview(videoPath, slug) {
  const layoutPath = findLayoutSidecar(videoPath);
  if (!layoutPath) return null;
  const reviewOutputDir = join(outputDir, slug, 'video-evaluator-layout-safety');
  const moduleAdapter = await loadVideoEvaluatorModule();
  if (moduleAdapter) {
    try {
      const parsed = await moduleAdapter.runLayoutSafetyReview({
        videoPath,
        layoutPath,
        outputDir: reviewOutputDir,
        frameCount: 8,
        samplingMode: 'hybrid',
        runOcr: false,
      });
      return parsed.report;
    } catch (error) {
      return {
        failed: true,
        stderr: error instanceof Error ? error.message : String(error),
        stdout: '',
      };
    }
  }

  if (!videoEvaluatorRoot) return null;
  const scriptPath = join(videoEvaluatorRoot, 'scripts', 'harness', 'layout-safety-review.ts');
  const agentPath = join(videoEvaluatorRoot, 'agent', 'run-tool.mjs');
  const distPath = join(videoEvaluatorRoot, 'dist', 'index.js');
  const useBuiltAgent = existsSync(agentPath) && existsSync(distPath);
  if (!useBuiltAgent && !existsSync(scriptPath)) return null;
  const result = spawnSync(
    process.execPath,
    useBuiltAgent ? [agentPath, 'layout-safety-review'] : ['--import', 'tsx', scriptPath],
    {
      cwd: videoEvaluatorRoot,
      encoding: 'utf8',
      input: `${JSON.stringify({
        videoPath,
        layoutPath,
        outputDir: reviewOutputDir,
        frameCount: 8,
        samplingMode: 'hybrid',
        runOcr: false,
      })}\n`,
    }
  );
  if (result.status !== 0) {
    return {
      failed: true,
      stderr: result.stderr,
      stdout: result.stdout,
    };
  }
  const parsed = JSON.parse(result.stdout);
  return parsed.result.report;
}

function severityRank(severity) {
  return severity === 'error' ? 3 : severity === 'warning' ? 2 : 1;
}

async function analyzeVideo(videoPath) {
  const slug = slugify(videoPath);
  const outDir = join(outputDir, slug);
  const framesDir = join(outDir, 'frames');
  mkdirSync(outDir, { recursive: true });
  const info = ffprobe(videoPath);
  const audio = info.hasAudio ? audioStats(videoPath) : null;
  const frameRefs = extractFrames(videoPath, framesDir, info.durationSeconds);
  const frames = [];
  let previous = null;
  for (const frame of frameRefs) {
    const metrics = await imageMetrics(frame);
    metrics.diffFromPrevious = diffScore(previous, metrics);
    previous = { lumas: metrics.lumas };
    const serializableMetrics = { ...metrics };
    delete serializableMetrics.lumas;
    frames.push(serializableMetrics);
  }
  const contactSheetPath = join(outDir, 'contact-sheet.jpg');
  await makeContactSheet(frames, contactSheetPath);
  const issues = analyzeIssues({ info, audio, frames }).sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity)
  );
  const layoutSafety = await runLayoutSafetyReview(videoPath, slug);
  if (layoutSafety?.failed) {
    issues.push(
      issue(
        'warning',
        'layout-safety-review-failed',
        'video-evaluator layout safety review failed.',
        {
          stderr: layoutSafety.stderr,
        }
      )
    );
  } else if (layoutSafety) {
    for (const layoutIssue of layoutSafety.issues) {
      issues.push(
        issue(
          layoutIssue.severity,
          `layout-${layoutIssue.code}`,
          layoutIssue.message,
          layoutIssue.details
        )
      );
    }
    issues.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  }
  const report = {
    videoPath,
    slug,
    info,
    audio,
    contactSheetPath,
    sampledFrameCount: frames.length,
    issues,
    layoutSafety: layoutSafety?.failed ? { failed: true } : layoutSafety,
    metrics: {
      maxWhiteRatio: Math.max(...frames.map((f) => f.whiteRatio)),
      maxEdgeWhiteRatio: Math.max(...frames.map((f) => f.edgeWhiteRatio)),
      maxEdgeBlackRatio: Math.max(...frames.map((f) => f.edgeBlackRatio)),
      minMeanLuma: Math.min(...frames.map((f) => f.meanLuma)),
      maxMeanLuma: Math.max(...frames.map((f) => f.meanLuma)),
      minCaptionBandSignalRatio: Math.min(...frames.map((f) => f.captionBandSignalRatio)),
      medianDiffFromPrevious: median(
        frames.map((f) => f.diffFromPrevious).filter((n) => n != null)
      ),
    },
    frames: frames.map((f) => ({
      index: f.index,
      timeSeconds: Number(f.timeSeconds.toFixed(3)),
      meanLuma: round(f.meanLuma),
      whiteRatio: round(f.whiteRatio),
      blackRatio: round(f.blackRatio),
      edgeWhiteRatio: round(f.edgeWhiteRatio),
      edgeBlackRatio: round(f.edgeBlackRatio),
      captionBandSignalRatio: round(f.captionBandSignalRatio),
      diffFromPrevious: f.diffFromPrevious == null ? null : round(f.diffFromPrevious),
      path: f.path,
    })),
  };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  return report;
}

function round(n) {
  return Number(n.toFixed(5));
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function markdownSummary(reports) {
  const lines = [
    '# Demo Video Quality Review',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Heuristics used: ffprobe metadata, ffmpeg audio volume, capped even frame sampling, white/black frame detection, edge artifact detection, low-motion runs, caption-band signal, and contact sheets.',
    '',
    '[Aggregate contact sheet](contact-sheet.jpg)',
    '',
    '| Video | Status | Issues | Contact Sheet |',
    '| --- | --- | --- | --- |',
  ];
  for (const report of reports) {
    const worst = report.issues.some((i) => i.severity === 'error')
      ? 'error'
      : report.issues.some((i) => i.severity === 'warning')
        ? 'warning'
        : 'pass';
    const issueText =
      report.issues.length === 0
        ? 'none'
        : report.issues.map((i) => `${i.severity}:${i.code}`).join('<br>');
    lines.push(
      `| \`${basename(report.videoPath)}\` | \`${worst}\` | ${issueText} | [contact-sheet](${relativePath(outputDir, report.contactSheetPath)}) |`
    );
  }
  lines.push('', '## Details', '');
  for (const report of reports) {
    lines.push(`### ${basename(report.videoPath)}`, '');
    lines.push(`- Path: \`${relativePath(repoRoot, report.videoPath)}\``);
    lines.push(`- Resolution: ${report.info.width}x${report.info.height}`);
    lines.push(`- Duration: ${report.info.durationSeconds.toFixed(2)}s`);
    lines.push(
      `- Audio: ${report.info.audioCodec ?? 'none'} ${report.audio ? `(mean ${report.audio.meanVolumeDb} dB, max ${report.audio.maxVolumeDb} dB)` : ''}`
    );
    lines.push(
      `- Contact sheet: [${relativePath(outputDir, report.contactSheetPath)}](${relativePath(outputDir, report.contactSheetPath)})`
    );
    if (report.issues.length === 0) {
      lines.push('- Issues: none detected by automated heuristics');
    } else {
      lines.push('- Issues:');
      for (const issue of report.issues) {
        lines.push(`  - \`${issue.severity}:${issue.code}\` - ${issue.message}`);
      }
    }
    lines.push('');
  }
  while (lines.at(-1) === '') lines.pop();
  return `${lines.join('\n')}\n`;
}

function relativePath(from, to) {
  return to.startsWith(from) ? to.slice(from.length + 1) : to;
}

if (args.videoPath) {
  mkdirSync(outputDir, { recursive: true });
  const videoPath = resolve(String(args.videoPath));
  console.error(`Analyzing ${videoPath}`);
  const report = await analyzeVideo(videoPath);
  console.log(JSON.stringify({ reportPath: join(outputDir, report.slug, 'report.json') }, null, 2));
} else {
  const videos = readdirSync(inputDir)
    .filter((name) => name.endsWith('.mp4'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => join(inputDir, name));

  if (videos.length === 0) {
    throw new Error(`No MP4 files found in ${inputDir}`);
  }

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  const scriptPath = new URL(import.meta.url).pathname;
  const reports = [];
  for (const video of videos) {
    const child = spawnSync(
      process.execPath,
      [
        scriptPath,
        '--videoPath',
        video,
        '--outputDir',
        outputDir,
        '--fps',
        String(fps),
        '--maxFrames',
        String(maxFrames),
        '--contactFrames',
        String(contactFrames),
      ],
      { encoding: 'utf8', stdio: 'inherit' }
    );
    if (child.status !== 0) {
      throw new Error(`Video audit failed for ${video}`);
    }
    reports.push(JSON.parse(readFileSync(join(outputDir, slugify(video), 'report.json'), 'utf8')));
  }
  const aggregateContactSheetPath = join(outputDir, 'contact-sheet.jpg');
  await makeReviewContactSheet(reports, aggregateContactSheetPath);
  const summary = {
    generatedAt: new Date().toISOString(),
    inputDir,
    outputDir,
    aggregateContactSheetPath,
    videoCount: reports.length,
    reports: reports.map((report) => {
      const rest = { ...report };
      delete rest.frames;
      return rest;
    }),
  };
  writeFileSync(join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(join(outputDir, 'README.md'), markdownSummary(reports));
  console.log(
    JSON.stringify(
      {
        outputDir,
        summaryPath: join(outputDir, 'summary.json'),
        readmePath: join(outputDir, 'README.md'),
      },
      null,
      2
    )
  );
}
