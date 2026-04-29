import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const laneDir = path.resolve('experiments/proving-wave-2/stock-b-roll-explainer');
const visualsPath = path.join(laneDir, 'outputs', 'work', 'visuals.json');
const audioPath = path.join(laneDir, 'outputs', 'work', 'audio', 'audio.wav');
const srtPath = path.join(laneDir, 'outputs', 'final', 'captions.srt');
const outputPath = path.join(laneDir, 'outputs', 'final', 'video.mp4');

const visuals = JSON.parse(fs.readFileSync(visualsPath, 'utf8'));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const inputs = [];
const filters = [];
const concatRefs = [];

visuals.scenes.forEach((scene, index) => {
  inputs.push('-i', scene.assetPath);
  const start = Number(scene.trimStart ?? 0);
  const end = Number(scene.trimEnd ?? start + scene.duration);
  filters.push(
    `[${index}:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[v${index}]`
  );
  concatRefs.push(`[v${index}]`);
});

filters.push(`${concatRefs.join('')}concat=n=${visuals.scenes.length}:v=1:a=0[base]`);
const subtitlePath = srtPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
filters.push(
  `[base]subtitles=${subtitlePath}:force_style='FontName=Arial,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H66000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=110,Alignment=2'[vout]`
);

const args = [
  '-y',
  ...inputs,
  '-i',
  audioPath,
  '-filter_complex',
  filters.join(';'),
  '-map',
  '[vout]',
  '-map',
  `${visuals.scenes.length}:a`,
  '-c:v',
  'libx264',
  '-preset',
  'ultrafast',
  '-crf',
  '26',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-movflags',
  '+faststart',
  '-shortest',
  outputPath,
];

const result = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log(outputPath);
