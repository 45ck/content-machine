# Report

Status: completed with a local-only fallback MP4

## Outcome

A real reviewable MP4 was produced at:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-003-ffmpeg/video.mp4`

Properties verified with `ffprobe`:

- duration: `32.666667s`
- size: `5552223` bytes
- video: `h264`, `1080x1920`, `30 fps`
- audio: `aac`

## What Worked

1. `doctor-report` succeeded locally and wrote:
   `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/doctor/doctor.json`
2. Local Kokoro TTS produced a real WAV:
   `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/audio.wav`
3. Local-only visuals succeeded with `local-media.manifest.json` and
   existing repo motion clips, producing:
   `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/visuals/visuals.json`
4. A local FFmpeg fallback assembled the final MP4 from the real WAV,
   scene timings, existing repo media, and scene-level SRT captions.

## What Blocked

1. The repo `script-to-audio` wrapper produced the real WAV and
   `audio_16khz.wav`, then stalled before writing `timestamps.json`.
   To keep the lane local-only and moving, I generated a proportional
   timing artifact manually from the script scene durations.
2. The repo `video-render` harness started Remotion and Chrome workers
   successfully but did not emit `render/video.mp4` or `render/render.json`
   under the lane output before I cut it off in favor of the local FFmpeg
   fallback.
3. The doctor report still warns about:
   `Node.js 18.20.5 (recommended >= 20.6.0)` and missing `yt-dlp`.
   Neither warning blocked the final local-only MP4 path.

## Exact Commands Used

```bash
cat experiments/proving-wave-1/saas-problem-solution/doctor-request.json | \
  node --import tsx scripts/harness/doctor-report.ts
```

```bash
cat experiments/proving-wave-1/saas-problem-solution/script-to-audio.request.json | \
  node --import tsx scripts/harness/script-to-audio.ts
```

```bash
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const scriptPath = 'experiments/proving-wave-1/saas-problem-solution/inputs/manual-script.json';
const audioPath = 'experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/audio.wav';
const timestampsPath = 'experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/timestamps.json';
const audioMetaPath = 'experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/audio.json';
const duration = 32.68;
const sampleRate = 24000;
const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
const scenes = script.scenes;
const totalRequested = scenes.reduce((sum, scene) => sum + (scene.duration ?? 0), 0);
let cursor = 0;
const sceneOutputs = [];
const allWords = [];
for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
  const scene = scenes[sceneIndex];
  const scaledDuration = duration * ((scene.duration ?? 0) / totalRequested);
  const words = scene.text.trim().split(/\s+/).filter(Boolean);
  const perWord = scaledDuration / Math.max(words.length, 1);
  const sceneWords = words.map((word, wordIndex) => {
    const start = Number((cursor + wordIndex * perWord).toFixed(3));
    const end = Number((cursor + (wordIndex + 1) * perWord).toFixed(3));
    return { word, start, end, confidence: 1 };
  });
  const audioStart = Number(cursor.toFixed(3));
  cursor += scaledDuration;
  const audioEnd = sceneIndex === scenes.length - 1 ? duration : Number(cursor.toFixed(3));
  if (sceneWords.length > 0) sceneWords[sceneWords.length - 1].end = audioEnd;
  sceneOutputs.push({ sceneId: scene.id, audioStart, audioEnd, words: sceneWords });
  allWords.push(...sceneWords);
}
const timestamps = {
  schemaVersion: '1.0.0',
  scenes: sceneOutputs,
  allWords,
  totalDuration: duration,
  ttsEngine: 'kokoro',
  asrEngine: 'manual-proportional-timings',
  analysis: { reconciled: false },
  wordCount: allWords.length,
};
const audioMeta = {
  schemaVersion: '1.0.0',
  audioPath: '/home/calvin/Documents/GitHub/content-machine/' + audioPath,
  timestampsPath: '/home/calvin/Documents/GitHub/content-machine/' + timestampsPath,
  timestamps,
  duration,
  wordCount: allWords.length,
  voice: 'af_heart',
  sampleRate,
};
mkdirSync(dirname(timestampsPath), { recursive: true });
writeFileSync(timestampsPath, JSON.stringify(timestamps, null, 2) + '\n');
writeFileSync(audioMetaPath, JSON.stringify(audioMeta, null, 2) + '\n');
EOF
```

```bash
cat experiments/proving-wave-1/saas-problem-solution/timestamps-to-visuals.request.json | \
  node --import tsx scripts/harness/timestamps-to-visuals.ts
```

```bash
cat experiments/proving-wave-1/saas-problem-solution/video-render.request.json | \
  node --import tsx scripts/harness/video-render.ts
```

```bash
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const script = JSON.parse(readFileSync('experiments/proving-wave-1/saas-problem-solution/inputs/manual-script.json', 'utf8'));
const timestamps = JSON.parse(readFileSync('experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/timestamps.json', 'utf8'));
const outDir = 'experiments/proving-wave-1/saas-problem-solution/output/attempt-003-ffmpeg';
mkdirSync(outDir, { recursive: true });
const fmt = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(milli).padStart(3, '0')}`;
};
const sceneById = new Map(script.scenes.map((scene) => [scene.id, scene]));
const srt = timestamps.scenes
  .map((scene, index) => {
    const text = sceneById.get(scene.sceneId)?.text ?? scene.sceneId;
    return `${index + 1}\n${fmt(scene.audioStart)} --> ${fmt(scene.audioEnd)}\n${text}\n`;
  })
  .join('\n');
writeFileSync(`${outDir}/scene-captions.srt`, srt);
EOF
```

```bash
ffmpeg -y \
  -i experiments/codex-bread-and-butter-blackbox-v1/project/assets/motion/19603948406abbdb.mp4 \
  -i experiments/codex-bread-and-butter-blackbox-v1/project/assets/motion/3390acb0f9876bbb.mp4 \
  -i experiments/codex-bread-and-butter-blackbox-v1/project/assets/motion/6d742a7beb553de8.mp4 \
  -i experiments/codex-bread-and-butter-blackbox-v1/project/assets/motion/9ccb00879c4042b5.mp4 \
  -i experiments/codex-bread-and-butter-blackbox-v1/project/assets/motion/08863321c7fa9937.mp4 \
  -i experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/audio.wav \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,trim=duration=5.836,setpts=PTS-STARTPTS[v0];[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,trim=duration=5.835,setpts=PTS-STARTPTS[v1];[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,trim=duration=8.170,setpts=PTS-STARTPTS[v2];[3:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,trim=duration=8.170,setpts=PTS-STARTPTS[v3];[4:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,trim=duration=4.669,setpts=PTS-STARTPTS[v4];[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[base];[base]subtitles=experiments/proving-wave-1/saas-problem-solution/output/attempt-003-ffmpeg/scene-captions.srt:force_style='FontName=Arial,FontSize=20,BorderStyle=3,Outline=1,Shadow=0,MarginV=110,Alignment=2'[v]" \
  -map "[v]" \
  -map 5:a \
  -c:v libx264 \
  -preset veryfast \
  -pix_fmt yuv420p \
  -c:a aac \
  -movflags +faststart \
  -shortest \
  experiments/proving-wave-1/saas-problem-solution/output/attempt-003-ffmpeg/video.mp4
```

## Exact Output Paths Produced

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/doctor/doctor.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/audio.wav`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/audio_16khz.wav`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/timestamps.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/audio/audio.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/visuals/visuals.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/visuals/visual-quality.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-003-ffmpeg/scene-captions.srt`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-003-ffmpeg/video.mp4`

## Notes For The Lane

- The lane currently proves that local TTS plus deterministic local
  media mapping is viable.
- The lane does not yet prove a clean end-to-end repo-owned local render
  because `script-to-audio` stalled after WAV generation and
  `video-render` did not finish into lane outputs.
- The visual recipe is still weak for true SaaS demos because no product
  screenshots or dashboard clips were supplied; the successful MP4 uses
  generic existing repo motion clips.
