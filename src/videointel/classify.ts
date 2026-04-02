/**
 * VideoTheme classification logic.
 *
 * Classifies a VideoSpec.v1 into a VideoTheme.v1 using heuristic analysis
 * or optional LLM-based classification.
 *
 * @module videointel
 */
import type { VideoSpecV1 } from '../domain';
import type { LLMProvider } from '../core/llm/provider';
import {
  VIDEOTHEME_V1_VERSION,
  VideoThemeV1Schema,
  type ArchetypeId,
  type CaptionStyleClass,
  type DominantMotion,
  type EditingDensity,
  type EnergyLevel,
  type VideoFormat,
  type VideoPurpose,
  type VideoThemeV1,
} from '../domain';

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface ClassifyOptions {
  mode?: 'heuristic' | 'llm';
  llmProvider?: LLMProvider;
  sourceVideospecPath?: string;
}

/**
 * Classify a VideoSpec into a VideoTheme.
 *
 * @internal
 */
export async function classifyVideoSpec(
  spec: VideoSpecV1,
  options: ClassifyOptions = {}
): Promise<VideoThemeV1> {
  const mode = options.mode ?? 'heuristic';
  const sourcePath = options.sourceVideospecPath ?? 'unknown';

  if (mode === 'llm' && options.llmProvider) {
    try {
      return await classifyWithLLM(spec, options.llmProvider, sourcePath);
    } catch {
      // Fall back to heuristic on LLM error
      const result = classifyHeuristic(spec, sourcePath);
      result.provenance.notes = 'LLM classification failed; fell back to heuristic';
      return result;
    }
  }

  return classifyHeuristic(spec, sourcePath);
}

/* ------------------------------------------------------------------ */
/*  Heuristic classification                                           */
/* ------------------------------------------------------------------ */

/** @internal */
export function classifyHeuristic(spec: VideoSpecV1, sourcePath: string): VideoThemeV1 {
  const archetype = inferArchetype(spec);
  const purpose = inferPurpose(spec);
  const format = inferFormat(spec);
  const style = inferStyle(spec);
  const editSignature = inferEditSignature(spec);
  const themeLabels = spec.narrative.themes ?? [];

  const archetypeConfidence = computeArchetypeConfidence(spec, archetype);
  const confidence = Math.max(0.1, archetypeConfidence * 0.8 + 0.2);

  return VideoThemeV1Schema.parse({
    version: VIDEOTHEME_V1_VERSION,
    source_videospec: sourcePath,
    archetype,
    archetype_confidence: round(archetypeConfidence),
    purpose,
    format,
    style,
    edit_signature: editSignature,
    theme_labels: themeLabels,
    confidence: round(confidence),
    provenance: {
      method: 'heuristic',
      classified_at: new Date().toISOString(),
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Archetype inference                                                */
/* ------------------------------------------------------------------ */

/** @internal */
export function inferArchetype(spec: VideoSpecV1): ArchetypeId {
  const transcript = getFullTranscript(spec);

  // Listicle: numbered items or "first... second..." patterns
  if (hasListPattern(transcript)) return 'listicle' as ArchetypeId;

  // Versus: "vs" or comparison language
  if (hasVersusPattern(transcript)) return 'versus' as ArchetypeId;

  // How-to: "step 1", "how to", instructional language
  if (hasHowtoPattern(transcript)) return 'howto' as ArchetypeId;

  // Reaction: inserted content blocks dominate
  const insertedBlocks = spec.inserted_content_blocks ?? [];
  if (insertedBlocks.length >= 2) return 'reaction' as ArchetypeId;

  // Story: clear narrative arc with escalation
  if (hasStoryPattern(spec, transcript)) return 'story' as ArchetypeId;

  // Hot take: short, opinionated, single-speaker
  if (hasHotTakePattern(spec, transcript)) return 'hot-take' as ArchetypeId;

  // Compilation: many shots, no/little transcript, music-driven
  if (isCompilation(spec)) return 'montage' as ArchetypeId;

  // Myth: "myth", "debunk", "actually" patterns
  if (hasMythPattern(transcript)) return 'myth' as ArchetypeId;

  // Montage fallback: 3+ shots with no real speech (even without music)
  const shotCount = spec.timeline.pacing.shot_count;
  const hasSpeech = hasRealSpeech(spec);
  if (shotCount >= 3 && !hasSpeech) return 'montage' as ArchetypeId;

  // Story fallback: no real speech, 1-2 shots → generic narrative
  if (!hasSpeech) return 'story' as ArchetypeId;

  // Default fallback (has speech but no pattern matched)
  return 'listicle' as ArchetypeId;
}

function getFullTranscript(spec: VideoSpecV1): string {
  return spec.audio.transcript
    .map((s) => s.text)
    .join(' ')
    .toLowerCase();
}

/**
 * Whisper hallucinates repetitive tokens like "BLANK AUDIO" on silent input.
 * Filter these out to determine if there is genuine speech content.
 * @internal — exported for reuse in blueprint.ts
 */
export const WHISPER_HALLUCINATION =
  /^[\s.,!?♪]*(?:blank|audio|blank audio|music(?:\s+\w+)?|\[.*?\]|\(.*?\)|thank you(?:\s+(?:for watching|so much))?|thanks for watching|subscribe|like and subscribe|\.{2,})*[\s.,!?♪]*$/i;

/** @internal */
export function hasRealSpeech(spec: VideoSpecV1): boolean {
  return spec.audio.transcript.some(
    (seg) => !WHISPER_HALLUCINATION.test(seg.text.trim())
  );
}

function hasListPattern(transcript: string): boolean {
  // "first... second... third..." or "number 1... number 2..."
  const ordinals = /\b(first|second|third|fourth|fifth|1\.|2\.|3\.|number\s+[1-9]|#[1-9])\b/;
  const matches = transcript.match(new RegExp(ordinals.source, 'gi'));
  return (matches?.length ?? 0) >= 2;
}

function hasVersusPattern(transcript: string): boolean {
  return /\b(vs\.?|versus|compared to|better than|or should you)\b/i.test(transcript);
}

function hasHowtoPattern(transcript: string): boolean {
  return /\b(step\s+[1-9]|how\s+to|tutorial|let me show you|here'?s how)\b/i.test(transcript);
}

function hasStoryPattern(spec: VideoSpecV1, transcript: string): boolean {
  const hasNarrativeArc =
    spec.narrative.arc.hook.description.length > 0 &&
    spec.narrative.arc.escalation.description.length > 0 &&
    spec.narrative.arc.payoff.description.length > 0;
  const hasStoryWords = /\b(story|happened|experience|journey|one day|remember when)\b/i.test(
    transcript
  );
  return hasNarrativeArc && (hasStoryWords || spec.narrative.format === 'story');
}

function hasHotTakePattern(spec: VideoSpecV1, transcript: string): boolean {
  const isShort = spec.meta.duration <= 20;
  const singleSpeaker =
    new Set(spec.audio.transcript.map((s) => s.speaker).filter(Boolean)).size <= 1;
  const hasOpinion =
    /\b(unpopular opinion|hot take|controversial|nobody talks about|overrated|underrated)\b/i.test(
      transcript
    );
  return isShort && singleSpeaker && hasOpinion;
}

function isCompilation(spec: VideoSpecV1): boolean {
  const shotCount = spec.timeline.pacing.shot_count;
  const hasMusic = spec.audio.music_segments.length > 0;
  return shotCount >= 10 && !hasRealSpeech(spec) && hasMusic;
}

function hasMythPattern(transcript: string): boolean {
  return /\b(myth|debunk|actually|common misconception|people think|wrong about)\b/i.test(
    transcript
  );
}

/* ------------------------------------------------------------------ */
/*  Purpose, format, style inference                                   */
/* ------------------------------------------------------------------ */

/** @internal */
export function inferPurpose(spec: VideoSpecV1): VideoPurpose {
  const transcript = getFullTranscript(spec);

  if (
    spec.narrative.cta &&
    /\b(buy|link|sign up|subscribe|discount|code)\b/i.test(spec.narrative.cta)
  ) {
    return 'convert';
  }
  if (/\b(should you|which is better|my recommendation)\b/i.test(transcript)) {
    return 'persuade';
  }
  if (/\b(how to|step|tutorial|learn|here'?s how)\b/i.test(transcript)) {
    return 'educate';
  }
  if (/\b(did you know|secret|nobody|shocking|wait for it)\b/i.test(transcript)) {
    return 'provoke_curiosity';
  }
  if (spec.audio.music_segments.length > 0 && spec.audio.transcript.length <= 2) {
    return 'entertain';
  }
  return 'educate';
}

/** @internal */
export function inferFormat(spec: VideoSpecV1): VideoFormat {
  const shotCount = spec.timeline.pacing.shot_count;
  const insertedBlocks = spec.inserted_content_blocks ?? [];
  const transcript = getFullTranscript(spec);
  const hasNarration = hasRealSpeech(spec);

  // Strong content signals first
  if (insertedBlocks.length >= 2) return 'reaction';

  // Explicit narrative format from the spec
  if (spec.narrative.format === 'listicle') return 'listicle';
  if (spec.narrative.format === 'story') return 'story';
  if (spec.narrative.format === 'montage') return 'montage';

  // Transcript-derived format (mirrors archetype inference)
  if (hasNarration && hasListPattern(transcript)) return 'listicle';
  if (hasNarration && hasHowtoPattern(transcript)) return 'tutorial';
  if (hasNarration && hasVersusPattern(transcript)) return 'versus';

  // Single/few shots with narration → talking head
  if (shotCount <= 2 && hasNarration) return 'talking_head';

  // Many shots WITHOUT narration → compilation/montage
  if (shotCount >= 15 && !hasNarration) return 'compilation';
  if (shotCount >= 3 && !hasNarration) return 'montage';

  // Narrated videos with multiple shots → talking head (b-roll cutaway pattern)
  if (hasNarration) return 'talking_head';

  // Silent, 1-2 shots → story (not talking_head)
  return 'story';
}

/** @internal */
export function inferStyle(spec: VideoSpecV1): {
  tone?: string;
  energy: EnergyLevel;
  editing_density: EditingDensity;
} {
  const pacing = spec.timeline.pacing;
  const shotCount = pacing.shot_count;

  // Energy from pacing
  let energy: EnergyLevel = 'medium';
  if (pacing.classification === 'very_fast' || pacing.classification === 'fast') {
    energy = 'high';
  } else if (pacing.classification === 'slow') {
    energy = 'low';
  }

  // Editing density from shot count and effects
  let editingDensity: EditingDensity = 'moderate';
  const jumpCuts = spec.editing.other_effects.jump_cuts?.length ?? 0;
  const totalEffects = jumpCuts + spec.editing.text_overlays.length;

  if (shotCount <= 3 && totalEffects <= 2) {
    editingDensity = 'minimal';
  } else if (shotCount >= 15 || totalEffects >= 10) {
    editingDensity = 'hyper';
  } else if (shotCount >= 8 || totalEffects >= 5) {
    editingDensity = 'dense';
  }

  return {
    tone: spec.narrative.tone,
    energy,
    editing_density: editingDensity,
  };
}

/* ------------------------------------------------------------------ */
/*  Edit signature                                                     */
/* ------------------------------------------------------------------ */

/** @internal */
export function inferEditSignature(spec: VideoSpecV1): {
  caption_style: CaptionStyleClass;
  has_inserted_content: boolean;
  has_music: boolean;
  jump_cut_ratio: number;
  dominant_motion: DominantMotion;
} {
  return {
    caption_style: inferCaptionStyle(spec),
    has_inserted_content: (spec.inserted_content_blocks ?? []).length > 0,
    has_music: spec.audio.music_segments.length > 0,
    jump_cut_ratio: computeJumpCutRatio(spec),
    dominant_motion: inferDominantMotion(spec),
  };
}

function inferCaptionStyle(spec: VideoSpecV1): CaptionStyleClass {
  if (spec.editing.captions.length === 0) return 'none';
  // If captions cover most of the video, they're burned in
  const captionCoverage = spec.editing.captions.reduce((sum, c) => sum + (c.end - c.start), 0);
  const ratio = captionCoverage / Math.max(1, spec.meta.duration);
  if (ratio > 0.3) return 'burned_in';
  return 'animated_word';
}

function computeJumpCutRatio(spec: VideoSpecV1): number {
  const jumpCuts = spec.timeline.shots.filter((s) => s.jump_cut).length;
  const totalShots = spec.timeline.shots.length;
  if (totalShots <= 1) return 0;
  return round(jumpCuts / (totalShots - 1));
}

function inferDominantMotion(spec: VideoSpecV1): DominantMotion {
  const motions = spec.editing.camera_motion;
  if (motions.length === 0) return 'static';

  const counts: Record<string, number> = {};
  for (const m of motions) {
    counts[m.motion] = (counts[m.motion] ?? 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0]?.[0];

  if (!top || top === 'unknown') return 'static';
  if (top === 'static') return 'static';
  if (top === 'zoom_in' || top === 'zoom_out') return 'zoom_in';
  if (top === 'pan_left' || top === 'pan_right') return 'pan';

  // Multiple motion types
  if (sorted.length >= 3) return 'mixed';
  return 'static';
}

/* ------------------------------------------------------------------ */
/*  Confidence scoring                                                 */
/* ------------------------------------------------------------------ */

function computeArchetypeConfidence(spec: VideoSpecV1, archetype: ArchetypeId): number {
  let score = 0.5; // baseline

  const transcript = getFullTranscript(spec);

  // Strong signals boost confidence
  if (archetype === 'listicle' && hasListPattern(transcript)) score += 0.3;
  if (archetype === 'versus' && hasVersusPattern(transcript)) score += 0.3;
  if (archetype === 'howto' && hasHowtoPattern(transcript)) score += 0.3;
  if (archetype === 'reaction' && (spec.inserted_content_blocks ?? []).length >= 2) score += 0.3;
  if (archetype === ('montage' as string) && isCompilation(spec)) score += 0.25;

  // Transcript presence boosts confidence for speech-based archetypes
  if (spec.audio.transcript.length > 0) score += 0.1;

  // Narrative format match boosts confidence
  if (spec.narrative.format && spec.narrative.format === archetype) score += 0.15;

  return Math.min(1, score);
}

/* ------------------------------------------------------------------ */
/*  LLM classification                                                 */
/* ------------------------------------------------------------------ */

async function classifyWithLLM(
  spec: VideoSpecV1,
  llmProvider: LLMProvider,
  sourcePath: string
): Promise<VideoThemeV1> {
  const condensed = buildCondensedSpec(spec);

  const response = await llmProvider.chat(
    [
      {
        role: 'system',
        content: `You are a video content classifier. Given a condensed VideoSpec analysis, classify the video into a structured theme. Output ONLY valid JSON matching this shape:
{
  "archetype": "listicle|howto|story|hot-take|versus|myth|reaction|montage|bts|case-study|before-after|product-demo|meme-pov",
  "archetype_confidence": 0.0-1.0,
  "purpose": "educate|persuade|entertain|convert|build_trust|provoke_curiosity",
  "format": "talking_head|listicle|versus|story|hot_take|tutorial|montage|reaction|compilation",
  "theme_labels": ["string"]
}`,
      },
      {
        role: 'user',
        content: `Classify this video:\n${condensed}`,
      },
    ],
    { temperature: 0.2, maxTokens: 500, jsonMode: true }
  );

  const parsed = JSON.parse(response.content);
  const style = inferStyle(spec);
  const editSignature = inferEditSignature(spec);

  return VideoThemeV1Schema.parse({
    version: VIDEOTHEME_V1_VERSION,
    source_videospec: sourcePath,
    archetype: parsed.archetype,
    archetype_confidence: parsed.archetype_confidence ?? 0.7,
    purpose: parsed.purpose,
    format: parsed.format,
    style,
    edit_signature: editSignature,
    theme_labels: parsed.theme_labels ?? [],
    confidence: parsed.archetype_confidence ?? 0.7,
    provenance: {
      method: 'llm',
      model: response.model,
      classified_at: new Date().toISOString(),
    },
  });
}

function buildCondensedSpec(spec: VideoSpecV1): string {
  const parts: string[] = [];
  parts.push(`Duration: ${spec.meta.duration}s`);
  parts.push(
    `Shots: ${spec.timeline.pacing.shot_count} (avg ${spec.timeline.pacing.avg_shot_duration}s)`
  );
  parts.push(`Pacing: ${spec.timeline.pacing.classification ?? 'unknown'}`);

  if (spec.audio.transcript.length > 0) {
    const fullText = spec.audio.transcript.map((s) => s.text).join(' ');
    const truncated = fullText.length > 500 ? fullText.slice(0, 500) + '...' : fullText;
    parts.push(`Transcript: ${truncated}`);
  } else {
    parts.push('Transcript: none');
  }

  if (spec.audio.music_segments.length > 0) {
    parts.push(`Music: ${spec.audio.music_segments.length} segment(s)`);
  }
  if ((spec.inserted_content_blocks ?? []).length > 0) {
    const types = [...new Set((spec.inserted_content_blocks ?? []).map((b) => b.type))];
    parts.push(`Inserted content: ${types.join(', ')}`);
  }
  if (spec.narrative.format) parts.push(`Narrative format: ${spec.narrative.format}`);
  if (spec.narrative.cta) parts.push(`CTA: ${spec.narrative.cta}`);
  if (spec.narrative.themes?.length) parts.push(`Themes: ${spec.narrative.themes.join(', ')}`);

  return parts.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
