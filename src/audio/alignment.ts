/**
 * Audio alignment helpers
 *
 * Builds spoken units and scene timestamps from script text.
 */
import type { ScriptOutput, WordTimestamp, SceneTimestamp } from '../domain';
import { restorePunctuation } from './asr/post-processor';

export interface SpokenUnit {
  id: string;
  text: string;
}

function sanitizeForTts(text: string): string {
  return text.replace(/[`*_]/g, '');
}

export function normalizeSpokenText(text: string): string {
  return sanitizeForTts(text).replace(/\s+/g, ' ').trim();
}

function normalizeForMatch(text: string): string {
  return normalizeSpokenText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hookAppearsInScene(hook: string, scene: string): boolean {
  const normalizedHook = normalizeForMatch(hook);
  const normalizedScene = normalizeForMatch(scene);

  if (!normalizedHook || !normalizedScene) {
    return false;
  }

  if (normalizedScene.startsWith(normalizedHook) || normalizedScene.includes(normalizedHook)) {
    return true;
  }

  const hookWords = normalizedHook.split(' ');
  const sceneWords = normalizedScene.split(' ');
  if (hookWords.length >= 4 && sceneWords.length >= 4) {
    const prefixLen = Math.min(6, hookWords.length, sceneWords.length);
    const hookPrefix = hookWords.slice(0, prefixLen).join(' ');
    const scenePrefix = sceneWords.slice(0, prefixLen).join(' ');
    if (hookPrefix === scenePrefix) {
      return true;
    }
  }

  return false;
}

function resolveTotalDuration(totalDuration: number | undefined, words: WordTimestamp[]): number {
  if (typeof totalDuration === 'number' && Number.isFinite(totalDuration)) {
    return totalDuration;
  }
  if (words.length === 0) {
    return 0;
  }
  return words[words.length - 1].end;
}

export function buildAlignmentUnits(script: ScriptOutput): SpokenUnit[] {
  const units: SpokenUnit[] = [];
  const scenes = script.scenes;

  const lastSceneText =
    scenes.length > 0 ? normalizeSpokenText(scenes[scenes.length - 1].text) : '';

  // Check if hook is already included in first scene to prevent duplication
  // The LLM often returns a hook field AND includes the hook in scene 1
  const hookText = script.hook ? normalizeSpokenText(script.hook) : '';
  const hookAlreadyInScene1 =
    hookText && scenes.length > 0 ? hookAppearsInScene(script.hook ?? '', scenes[0].text) : false;

  if (hookText && !hookAlreadyInScene1) {
    units.push({ id: 'hook', text: script.hook! });
  }

  units.push(...scenes.map((scene) => ({ id: scene.id, text: scene.text })));

  const ctaText = script.cta ? normalizeSpokenText(script.cta) : '';
  if (ctaText && ctaText !== lastSceneText) {
    units.push({ id: 'cta', text: script.cta! });
  }

  return units;
}

/**
 * Append remaining ASR words to the last scene or create a fallback scene.
 * Ensures we never drop trailing words (prevents audio continuing after visuals).
 */
function appendRemainingWords(
  result: SceneTimestamp[],
  units: SpokenUnit[],
  words: WordTimestamp[],
  wordIndex: number
): void {
  if (wordIndex >= words.length) return;

  const remaining = words.slice(wordIndex);

  if (result.length > 0) {
    const lastScene = result[result.length - 1];
    lastScene.words.push(...remaining);
    lastScene.audioEnd = remaining[remaining.length - 1].end;
    return;
  }

  // Defensive fallback: if no scene got words, attach everything to the first unit
  if (units.length > 0) {
    result.push({
      sceneId: units[0].id,
      audioStart: words[0].start,
      audioEnd: words[words.length - 1].end,
      words: [...words],
    });
  }
}

/**
 * Build scene timestamps from words and scene text structure.
 * Assigns words to scenes proportionally based on word count.
 * Also restores punctuation from original script text.
 */
export function buildSceneTimestamps(
  words: WordTimestamp[],
  units: SpokenUnit[],
  totalDuration?: number
): SceneTimestamp[] {
  const result: SceneTimestamp[] = [];
  let wordIndex = 0;
  const duration = resolveTotalDuration(totalDuration, words);

  // Combine all unit texts for punctuation restoration
  const fullScriptText = units.map((unit) => unit.text).join(' ');

  // Restore punctuation to all words before assigning to scenes
  const punctuatedWords = restorePunctuation(words, fullScriptText);

  for (const unit of units) {
    const targetWordCount = unit.text.split(/\s+/).filter(Boolean).length;
    const sceneWords: WordTimestamp[] = [];

    while (wordIndex < punctuatedWords.length && sceneWords.length < targetWordCount) {
      sceneWords.push(punctuatedWords[wordIndex]);
      wordIndex++;
    }

    if (sceneWords.length > 0) {
      result.push({
        sceneId: unit.id,
        audioStart: sceneWords[0].start,
        audioEnd: sceneWords[sceneWords.length - 1].end,
        words: sceneWords,
      });
    }
  }

  appendRemainingWords(result, units, punctuatedWords, wordIndex);

  if (result.length > 0) {
    const lastScene = result[result.length - 1];
    lastScene.audioEnd = Math.max(lastScene.audioEnd, duration);
  }

  return result;
}
