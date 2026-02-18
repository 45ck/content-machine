import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { count: 5 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') out.input = argv[++i];
    else if (a === '--out') out.outDir = argv[++i];
    else if (a === '--count') out.count = Number(argv[++i]);
  }
  return out;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function mustExist(p, label) {
  if (!fs.existsSync(p)) {
    throw new Error(`${label} not found: ${p}`);
  }
}

const args = parseArgs(process.argv);
if (!args.input || !args.outDir) {
  // eslint-disable-next-line no-console
  console.error('Usage: node scripts/qa/extract-screenshots.mjs --input <video.mp4> --out <dir> [--count 5]');
  process.exit(2);
}

const repoRoot = process.cwd();
const ffmpegExe = path.resolve(repoRoot, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe');
const ffprobeExe = path.resolve(repoRoot, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffprobe.exe');

mustExist(ffmpegExe, 'ffmpeg');
mustExist(ffprobeExe, 'ffprobe');

const inputAbs = path.resolve(repoRoot, args.input);
mustExist(inputAbs, 'input video');

const outDirAbs = path.resolve(repoRoot, args.outDir);
ensureDir(outDirAbs);

const durationStr = execFileSync(ffprobeExe, [
  '-v',
  'error',
  '-show_entries',
  'format=duration',
  '-of',
  'default=noprint_wrappers=1:nokey=1',
  inputAbs,
]).toString('utf8').trim();

const duration = Number.parseFloat(durationStr);
if (!Number.isFinite(duration) || duration <= 0) {
  throw new Error(`Could not read duration from ffprobe. Got: ${JSON.stringify(durationStr)}`);
}

const count = Number.isFinite(args.count) && args.count >= 2 ? Math.floor(args.count) : 5;
// If we seek to exactly the end timestamp, ffmpeg may return no frame. Keep a tiny epsilon.
const epsilon = 0.05;
const safeDuration = Math.max(0, duration - epsilon);
const times = Array.from({ length: count }, (_, idx) => (safeDuration * idx) / (count - 1));

for (let i = 0; i < times.length; i++) {
  const t = times[i];
  const name = `shot_${String(i + 1).padStart(2, '0')}_${t.toFixed(3)}s.png`;
  const outPath = path.join(outDirAbs, name);
  execFileSync(ffmpegExe, [
    '-hide_banner',
    '-y',
    '-ss',
    String(t),
    '-i',
    inputAbs,
    '-update',
    '1',
    '-frames:v',
    '1',
    outPath,
  ]);
}
