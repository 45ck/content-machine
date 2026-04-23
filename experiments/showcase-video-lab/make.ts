#!/usr/bin/env npx tsx
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { resolveFfmpegPath } from '../../src/core/video/ffmpeg';
import { runPublishPrep } from '../../src/harness/publish-prep';
import {
  SHOWCASE_CONCEPTS,
  DEMO_CLIPS,
  type OverlayPosition,
  type ShowcaseConcept,
} from './concepts';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const resultsRoot = resolve(__dirname, 'results');
const fontFile =
  process.platform === 'win32'
    ? 'C\\:/Windows/Fonts/arialbd.ttf'
    : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

function escapeDrawText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/%/g, '\\%');
}

function overlayLayout(position: OverlayPosition | undefined): {
  cardY: number;
  titleY: number;
  subY: number;
} {
  switch (position) {
    case 'top':
      return { cardY: 110, titleY: 220, subY: 430 };
    case 'bottom':
      return { cardY: 1210, titleY: 1320, subY: 1530 };
    case 'center':
    default:
      return { cardY: 650, titleY: 760, subY: 970 };
  }
}

function buildScriptJson(concept: ShowcaseConcept) {
  const estimatedDuration = Number(
    concept.beats.reduce((sum, beat) => sum + beat.duration, 0).toFixed(2)
  );

  return {
    schemaVersion: '1.0.0',
    title: concept.title,
    hook: concept.hook,
    reasoning: concept.thesis,
    scenes: concept.beats.map((beat, index) => ({
      id: `scene-${index + 1}`,
      text: `${beat.headline}. ${beat.subhead}.`,
      visualDirection: `${concept.label} remix over ${beat.clip} footage with bold overlay typography.`,
      duration: beat.duration,
    })),
    meta: {
      archetype: 'story',
      topic: concept.slug,
      estimatedDuration,
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildFfmpegArgs(concept: ShowcaseConcept, outputPath: string): string[] {
  const inputs: string[] = [];
  const filters: string[] = [];
  const concatInputs: string[] = [];
  const totalBeats = concept.beats.length;
  let inputIndex = 0;

  for (let i = 0; i < concept.beats.length; i++) {
    const beat = concept.beats[i];
    const clipPath = DEMO_CLIPS[beat.clip];
    if (!existsSync(clipPath)) {
      throw new Error(`Missing demo clip: ${clipPath}`);
    }

    inputs.push('-ss', String(beat.start), '-t', String(beat.duration), '-i', clipPath);
    const videoInputIndex = inputIndex++;

    inputs.push(
      '-f',
      'lavfi',
      '-t',
      String(beat.duration),
      '-i',
      `sine=frequency=${beat.toneHz}:sample_rate=44100`
    );
    const audioInputIndex = inputIndex++;

    const { cardY, titleY, subY } = overlayLayout(beat.position);
    const accentY = cardY + 18;
    const progressWidth = Math.round((960 * (i + 1)) / totalBeats);
    const fadeOutStart = Math.max(0, beat.duration - 0.25).toFixed(2);
    const alphaExpr = `if(lt(t\\,0.22)\\,t/0.22\\,if(lt(t\\,${fadeOutStart})\\,1\\,(${beat.duration.toFixed(
      2
    )}-t)/0.25))`;

    filters.push(
      `[${videoInputIndex}:v]setpts=PTS-STARTPTS,` +
        `scale=1080:1920:force_original_aspect_ratio=increase,` +
        `crop=1080:1920,` +
        `eq=saturation=1.18:contrast=1.06:brightness=0.02,` +
        `drawbox=x=52:y=${cardY}:w=976:h=430:color=black@0.48:t=fill,` +
        `drawbox=x=52:y=${accentY}:w=976:h=16:color=${concept.accentColor}@1:t=fill,` +
        `drawbox=x=60:y=1834:w=${progressWidth}:h=20:color=${concept.accentColor}@0.95:t=fill,` +
        `drawtext=fontfile=${fontFile}:text='${escapeDrawText(concept.label)}':` +
        `fontcolor=${concept.accentColor}:fontsize=34:x=78:y=${cardY + 56}:alpha='${alphaExpr}',` +
        `drawtext=fontfile=${fontFile}:text='${escapeDrawText(beat.headline)}':` +
        `fontcolor=white:fontsize=88:x=(w-text_w)/2:y=${titleY}:alpha='${alphaExpr}',` +
        `drawtext=fontfile=${fontFile}:text='${escapeDrawText(beat.subhead)}':` +
        `fontcolor=white:fontsize=42:x=(w-text_w)/2:y=${subY}:alpha='${alphaExpr}'` +
        `[v${i}]`
    );

    filters.push(
      `[${audioInputIndex}:a]volume=0.9,` +
        `aecho=0.8:0.7:36:0.22,` +
        `loudnorm=I=-18:TP=-1.5:LRA=7,` +
        `afade=t=in:st=0:d=0.08,` +
        `afade=t=out:st=${Math.max(0, beat.duration - 0.14).toFixed(2)}:d=0.14` +
        `[a${i}]`
    );

    concatInputs.push(`[v${i}][a${i}]`);
  }

  filters.push(`${concatInputs.join('')}concat=n=${concept.beats.length}:v=1:a=1[vout][aout]`);

  return [
    '-y',
    ...inputs,
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-r',
    '30',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath,
  ];
}

async function renderConcept(concept: ShowcaseConcept): Promise<void> {
  const conceptDir = join(resultsRoot, concept.slug);
  const outputPath = join(conceptDir, 'video.mp4');
  const scriptPath = join(conceptDir, 'script.json');
  const conceptPath = join(conceptDir, 'concept.md');

  await mkdir(conceptDir, { recursive: true });
  await writeFile(scriptPath, `${JSON.stringify(buildScriptJson(concept), null, 2)}\n`, 'utf8');
  await writeFile(
    conceptPath,
    `# ${concept.title}\n\n` +
      `- Hook: ${concept.hook}\n` +
      `- Thesis: ${concept.thesis}\n` +
      `- Beat count: ${concept.beats.length}\n`,
    'utf8'
  );

  const ffmpegPath = resolveFfmpegPath();
  const args = buildFfmpegArgs(concept, outputPath);
  await execFileAsync(ffmpegPath, args, {
    timeout: 240_000,
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });

  await runPublishPrep({
    videoPath: outputPath,
    scriptPath,
    outputDir: join(conceptDir, 'publish-prep'),
    platform: 'tiktok',
    validate: {
      profile: 'portrait',
      cadence: true,
      audioSignal: true,
      freeze: true,
      temporal: true,
    },
  });
}

async function main(): Promise<void> {
  await mkdir(resultsRoot, { recursive: true });

  for (const concept of SHOWCASE_CONCEPTS) {
    process.stdout.write(`Rendering ${concept.slug}...\n`);
    await renderConcept(concept);
  }

  process.stdout.write(`Finished. Outputs are under ${resultsRoot}\n`);
}

await main();
