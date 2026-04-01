export { threeSceneListicle } from './three-scene-listicle';
export { singleShotTalking } from './single-shot-talking';
export { fiveSceneHowto } from './five-scene-howto';
export { montageNoSpeech } from './montage-no-speech';

import { threeSceneListicle } from './three-scene-listicle';
import { singleShotTalking } from './single-shot-talking';
import { fiveSceneHowto } from './five-scene-howto';
import { montageNoSpeech } from './montage-no-speech';
import type { EditorVVManifest } from '../ground-truth';

export const ALL_MANIFESTS: EditorVVManifest[] = [
  threeSceneListicle,
  singleShotTalking,
  fiveSceneHowto,
  montageNoSpeech,
];
