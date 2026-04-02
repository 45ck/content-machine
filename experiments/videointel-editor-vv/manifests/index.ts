export { threeSceneListicle } from './three-scene-listicle';
export { singleShotTalking } from './single-shot-talking';
export { fiveSceneHowto } from './five-scene-howto';
export { montageNoSpeech } from './montage-no-speech';
export { realMontage } from './real-montage';
export { realTalkingHead } from './real-talking-head';
export { realVertical } from './real-vertical';
export { realFastCuts } from './real-fast-cuts';
export { ytListicleTips } from './yt-listicle-tips';
export { ytTutorialLobster } from './yt-tutorial-lobster';
export { ytMontageGym } from './yt-montage-gym';
export { ytReactionMeme } from './yt-reaction-meme';
export { ytAsmrCheetos } from './yt-asmr-cheetos';

import { threeSceneListicle } from './three-scene-listicle';
import { singleShotTalking } from './single-shot-talking';
import { fiveSceneHowto } from './five-scene-howto';
import { montageNoSpeech } from './montage-no-speech';
import { realMontage } from './real-montage';
import { realTalkingHead } from './real-talking-head';
import { realVertical } from './real-vertical';
import { realFastCuts } from './real-fast-cuts';
import { ytListicleTips } from './yt-listicle-tips';
import { ytTutorialLobster } from './yt-tutorial-lobster';
import { ytMontageGym } from './yt-montage-gym';
import { ytReactionMeme } from './yt-reaction-meme';
import { ytAsmrCheetos } from './yt-asmr-cheetos';
import type { EditorVVManifest } from '../ground-truth';

export const ALL_MANIFESTS: EditorVVManifest[] = [
  // Tier 1: Synthetic FFmpeg-composed
  threeSceneListicle,
  singleShotTalking,
  fiveSceneHowto,
  montageNoSpeech,
  // Tier 3: Real video footage (stock clips)
  realMontage,
  realTalkingHead,
  realVertical,
  realFastCuts,
  // Tier 4: YouTube Shorts (real creator content)
  ytListicleTips,
  ytTutorialLobster,
  ytMontageGym,
  ytReactionMeme,
  ytAsmrCheetos,
];
