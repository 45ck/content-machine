import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const laneDir = path.resolve('experiments/proving-wave-2/text-thread-reveal');
const svgDir = path.join(laneDir, 'assets', 'messages', 'generated');
const pngDir = path.join(laneDir, 'assets', 'messages', 'render');

fs.mkdirSync(pngDir, { recursive: true });

for (const file of fs.readdirSync(svgDir)) {
  if (!file.endsWith('.svg')) {
    continue;
  }
  const svgPath = path.join(svgDir, file);
  const pngPath = path.join(pngDir, file.replace(/\.svg$/u, '.png'));
  execFileSync(
    'ffmpeg',
    ['-y', '-i', svgPath, '-frames:v', '1', pngPath],
    { stdio: 'ignore' }
  );
  console.log(pngPath);
}
