#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_CSV = '/home/calvin/Downloads/short_form_video_repos_179.csv';
const DEFAULT_ROOT = 'vendor/imports-20260423-shortform-github';

const curatedRepos = [
  { slug: 'alperensumeroglu/ai-clips-maker', group: 'direct-generators', reason: 'Long-form to vertical clipper with diarization and resizing.' },
  { slug: 'ArcReel/ArcReel', group: 'direct-generators', reason: 'Agent-driven workspace for composable AI video workflows.' },
  { slug: 'Dark2C/Viral-Faceless-Shorts-Generator', group: 'direct-generators', reason: 'FFmpeg-heavy faceless shorts pipeline.' },
  { slug: 'dr34ming/shorts-project', group: 'direct-generators', reason: 'Mixes Manim, Remotion, and uploads in one shorts stack.' },
  { slug: 'gyoridavid/short-video-maker', group: 'direct-generators', reason: 'Closest TypeScript + Remotion reference to this repo.' },
  { slug: 'imgly/videoclipper', group: 'direct-generators', reason: 'Browser-based clipping flow for ready-to-post shorts.' },
  { slug: 'mutonby/openshorts', group: 'direct-generators', reason: 'Open platform angle for clip generation and orchestration.' },
  { slug: 'RayVentura/ShortGPT', group: 'direct-generators', reason: 'Most cited open-source shorts automation baseline.' },
  { slug: 'SaarD00/AI-Youtube-Shorts-Generator', group: 'direct-generators', reason: 'Faceless automation variant worth comparing to SamurAIGPT fork.' },
  { slug: 'SamurAIGPT/AI-Youtube-Shorts-Generator', group: 'direct-generators', reason: 'Long-form to shorts pipeline worth decomposing into skills.' },
  { slug: 'SamurAIGPT/Clip-Anything', group: 'direct-generators', reason: 'Natural-language clipping and highlight extraction patterns.' },
  { slug: 'zhouxiaoka/autoclip', group: 'direct-generators', reason: 'AI highlight generation for clip extraction.' },
  { slug: 'Aegisub/Aegisub', group: 'captions-subtitles', reason: 'Advanced subtitle authoring and timing reference.' },
  { slug: 'absadiki/subsai', group: 'captions-subtitles', reason: 'Whisper-powered subtitle generation with UI and CLI paths.' },
  { slug: 'agermanidis/autosub', group: 'captions-subtitles', reason: 'Classic automatic subtitle generator baseline.' },
  { slug: 'baxtree/subaligner', group: 'captions-subtitles', reason: 'Subtitle alignment and translation workflow reference.' },
  { slug: 'ggml-org/whisper.cpp', group: 'captions-subtitles', reason: 'Portable local ASR for caption generation.' },
  { slug: 'jianfch/stable-ts', group: 'captions-subtitles', reason: 'Timestamp stabilization patterns for better word timing.' },
  { slug: 'kaegi/alass', group: 'captions-subtitles', reason: 'Automatic subtitle synchronization reference.' },
  { slug: 'libass/libass', group: 'captions-subtitles', reason: 'Core subtitle rendering engine used under FFmpeg pipelines.' },
  { slug: 'linto-ai/whisper-timestamped', group: 'captions-subtitles', reason: 'Improved word timestamps from Whisper outputs.' },
  { slug: 'm-bain/whisperX', group: 'captions-subtitles', reason: 'Word-level timestamps and diarization reference.' },
  { slug: 'm1guelpf/auto-subtitle', group: 'captions-subtitles', reason: 'Well-known subtitle burn-in baseline.' },
  {
    slug: 'tkarabela/pysubs2',
    csvSlug: 'pysubs2/pysubs2',
    url: 'https://github.com/tkarabela/pysubs2',
    group: 'captions-subtitles',
    reason: 'Programmatic subtitle editing library.',
  },
  { slug: 'smacke/ffsubsync', group: 'captions-subtitles', reason: 'Subtitle sync accuracy reference.' },
  { slug: 'SubtitleEdit/subtitleedit', group: 'captions-subtitles', reason: 'Comprehensive subtitle editing and format support reference.' },
  { slug: 'SYSTRAN/faster-whisper', group: 'captions-subtitles', reason: 'Fast production ASR implementation.' },
  { slug: 'designcombo/react-video-editor', group: 'rendering', reason: 'Remotion-powered editor patterns for reusable building blocks.' },
  { slug: 'ffmpeg/ffmpeg', group: 'rendering', reason: 'Canonical raw media tool for future skill-first runtime.' },
  { slug: 'mifi/editly', group: 'rendering', reason: 'Declarative Node.js video editing useful for prompt-language flows.' },
  { slug: 'motion-canvas/motion-canvas', group: 'rendering', reason: 'Code-first motion graphics alternative to compare against Remotion.' },
  {
    slug: 'Breakthrough/PySceneDetect',
    csvSlug: 'PySceneDetect/PySceneDetect',
    url: 'https://github.com/Breakthrough/PySceneDetect',
    group: 'rendering',
    reason: 'Scene detection for clipping and media segmentation.',
  },
  { slug: 'remotion-dev/remotion', group: 'rendering', reason: 'Primary React-based video framework.' },
  { slug: 'remotion-dev/template-prompt-to-video', group: 'rendering', reason: 'Prompt-to-video template closer to current repo direction.' },
  { slug: 'trykimu/videoeditor', group: 'rendering', reason: 'Remotion-based editor/copilot patterns.' },
  { slug: 'WyattBlue/auto-editor', group: 'rendering', reason: 'Timing-based auto editing from source media.' },
];

function parseArgs(argv) {
  const result = {
    csv: DEFAULT_CSV,
    root: DEFAULT_ROOT,
    update: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--csv') {
      result.csv = argv[index + 1];
      index += 1;
    } else if (arg === '--root') {
      result.root = argv[index + 1];
      index += 1;
    } else if (arg === '--update') {
      result.update = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return result;
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = [];
    let current = '';
    let insideQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];
      if (char === '"' && insideQuotes && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function normalizeRow(row) {
  const slug = row.repo_slug || row.repo || `${row.owner ?? ''}/${row.repo ?? ''}`;
  const url = row.github_url || row.url || '';
  return {
    slug,
    url,
    category: row.category || '',
    kind: row.fit || row.kind || '',
    note: row.note || row.why_relevant || '',
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const detail = stderr || stdout || `exit ${result.status}`;
    throw new Error(`${command} ${args.join(' ')} failed: ${detail}`);
  }

  return result.stdout?.trim() ?? '';
}

async function main() {
  const { csv, root, update } = parseArgs(process.argv.slice(2));
  const csvText = await readFile(csv, 'utf8');
  const rows = parseCsv(csvText);
  const normalizedRows = rows.map(normalizeRow);
  const rowsBySlug = new Map(normalizedRows.map((row) => [row.slug, row]));

  const targetRoot = path.resolve(root);
  await mkdir(targetRoot, { recursive: true });

  const summary = [];

  for (const repo of curatedRepos) {
    const row = rowsBySlug.get(repo.csvSlug ?? repo.slug);
    if (!row) {
      summary.push({ ...repo, status: 'missing-from-csv', path: null });
      continue;
    }

    const repoDirName = repo.slug.replace('/', '__');
    const destination = path.join(targetRoot, repo.group, repoDirName);
    await mkdir(path.dirname(destination), { recursive: true });

    try {
      const gitDir = path.join(destination, '.git');
      const hasGit = spawnSync('test', ['-d', gitDir]).status === 0;

      if (!hasGit) {
        run('git', ['clone', '--depth', '1', repo.url ?? row.url, destination]);
        summary.push({ ...repo, status: 'cloned', path: destination, note: row.note, category: row.category, kind: row.kind });
      } else if (update) {
        run('git', ['-C', destination, 'pull', '--ff-only']);
        summary.push({ ...repo, status: 'updated', path: destination, note: row.note, category: row.category, kind: row.kind });
      } else {
        summary.push({ ...repo, status: 'exists', path: destination, note: row.note, category: row.category, kind: row.kind });
      }
    } catch (error) {
      summary.push({
        ...repo,
        status: 'failed',
        path: destination,
        note: row.note,
        category: row.category,
        kind: row.kind,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const manifestPath = path.join(targetRoot, 'manifest.json');
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        csv,
        root: targetRoot,
        selectedCount: curatedRepos.length,
        summary,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const cloned = summary.filter((item) => item.status === 'cloned').length;
  const updated = summary.filter((item) => item.status === 'updated').length;
  const exists = summary.filter((item) => item.status === 'exists').length;
  const failed = summary.filter((item) => item.status === 'failed').length;
  const missing = summary.filter((item) => item.status === 'missing-from-csv').length;

  console.log(`root=${targetRoot}`);
  console.log(`manifest=${manifestPath}`);
  console.log(`selected=${curatedRepos.length} cloned=${cloned} updated=${updated} exists=${exists} failed=${failed} missing=${missing}`);
  for (const item of summary) {
    const suffix = item.error ? ` :: ${item.error}` : '';
    console.log(`${item.status.padEnd(16)} ${item.slug} -> ${item.path ?? '-'}${suffix}`);
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
