import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const laneDir = path.resolve('experiments/proving-wave-2/text-thread-reveal');
const timestampsPath = path.join(laneDir, 'output', 'audio', 'timestamps.json');
const visualsPath = path.join(laneDir, 'output', 'visuals', 'visuals.json');
const audioPath = path.join(laneDir, 'output', 'audio', 'audio.wav');
const captionsPath = path.join(laneDir, 'output', 'render', 'captions.ass');
const outputPath = path.join(laneDir, 'output', 'render', 'video.mp4');
const segmentsDir = path.join(laneDir, 'output', 'render', 'segments');
const concatListPath = path.join(laneDir, 'output', 'render', 'segments.ffconcat');

const timestamps = JSON.parse(fs.readFileSync(timestampsPath, 'utf8'));
const visuals = JSON.parse(fs.readFileSync(visualsPath, 'utf8'));

fs.mkdirSync(segmentsDir, { recursive: true });

function runFfmpeg(args) {
  execFileSync('ffmpeg', ['-y', ...args], { stdio: 'ignore' });
}

for (const [index, scene] of visuals.scenes.entries()) {
  const duration = Number(scene.duration);
  const segmentPath = path.join(segmentsDir, `${String(index + 1).padStart(2, '0')}.mp4`);
  runFfmpeg([
    '-loop',
    '1',
    '-t',
    String(duration),
    '-i',
    scene.assetPath,
    '-vf',
    'scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,format=yuv420p,fps=30',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '18',
    segmentPath
  ]);
}

fs.writeFileSync(
  concatListPath,
  visuals.scenes
    .map((_, index) => {
      const segmentPath = path.join(segmentsDir, `${String(index + 1).padStart(2, '0')}.mp4`);
      return `file '${segmentPath.replaceAll("'", "'\\''")}'`;
    })
    .join('\n') + '\n',
  'utf8'
);

const topPath = path.join(laneDir, 'output', 'render', 'top-lane.mp4');
runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', topPath]);

const gameplayPath = visuals.gameplayClip.path;
const totalDuration = Number(timestamps.totalDuration);
const escapedCaptions = captionsPath.replace(/\\/gu, '\\\\').replace(/:/gu, '\\:').replace(/,/gu, '\\,').replace(/'/gu, "\\'");

runFfmpeg([
  '-stream_loop',
  '-1',
  '-i',
  gameplayPath,
  '-i',
  topPath,
  '-i',
  audioPath,
  '-filter_complex',
  [
    `[0:v]scale=1080:-2,crop=1080:960:(iw-1080)/2:(ih-960)/2,trim=duration=${totalDuration},setpts=PTS-STARTPTS[bottom]`,
    `[1:v]trim=duration=${totalDuration},setpts=PTS-STARTPTS[top]`,
    `[top][bottom]vstack=inputs=2[stacked]`,
    `[stacked]subtitles='${escapedCaptions}'[v]`
  ].join(';'),
  '-map',
  '[v]',
  '-map',
  '2:a',
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-crf',
  '18',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-t',
  String(totalDuration),
  outputPath
]);

console.log(outputPath);
