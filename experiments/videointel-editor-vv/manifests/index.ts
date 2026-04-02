export { threeSceneListicle } from './three-scene-listicle';
export { singleShotTalking } from './single-shot-talking';
export { fiveSceneHowto } from './five-scene-howto';
export { montageNoSpeech } from './montage-no-speech';
export { realMontage } from './real-montage';
export { realTalkingHead } from './real-talking-head';
export { realVertical } from './real-vertical';
export { realFastCuts } from './real-fast-cuts';

import { threeSceneListicle } from './three-scene-listicle';
import { singleShotTalking } from './single-shot-talking';
import { fiveSceneHowto } from './five-scene-howto';
import { montageNoSpeech } from './montage-no-speech';
import { realMontage } from './real-montage';
import { realTalkingHead } from './real-talking-head';
import { realVertical } from './real-vertical';
import { realFastCuts } from './real-fast-cuts';
import type { EditorVVManifest } from '../ground-truth';

export const ALL_MANIFESTS: EditorVVManifest[] = [
  // Tier 1: Synthetic FFmpeg-composed
  threeSceneListicle,
  singleShotTalking,
  fiveSceneHowto,
  montageNoSpeech,
  // Tier 3: Real video footage
  realMontage,
  realTalkingHead,
  realVertical,
  realFastCuts,
];
