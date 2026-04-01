/**
 * Extended V&V fixtures for videointel accuracy testing.
 *
 * Each fixture pairs a VideoSpec.v1 with ground-truth expectations
 * that the classify + blueprint pipeline should produce.
 */
import { createMinimalVideoSpec } from '../../src/videointel/test-fixtures';
import type { VideoSpecV1 } from '../../src/domain';

export interface GroundTruth {
  /** Expected archetype from classify */
  archetype: string;
  /** Expected purpose from classify */
  purpose: string;
  /** Expected format from classify */
  format: string;
  /** Expected energy level */
  energy: 'low' | 'medium' | 'high';
  /** Expected editing density */
  editingDensity: 'minimal' | 'moderate' | 'dense' | 'hyper';
  /** Minimum confidence threshold */
  minConfidence: number;
  /** Expected blueprint scene count */
  expectedSceneCount: number;
  /** Expected blueprint has_voiceover */
  hasVoiceover: boolean;
  /** Expected blueprint has_music */
  hasMusic: boolean;
  /** Expected has_cta */
  hasCta: boolean;
  /** Expected has_inserted_content */
  hasInsertedContent: boolean;
}

export interface VVFixture {
  name: string;
  description: string;
  spec: VideoSpecV1;
  expected: GroundTruth;
}

/* ------------------------------------------------------------------ */
/*  Fixture 1: Listicle — "3 things you need to know"                  */
/* ------------------------------------------------------------------ */

const listicleSpec = createMinimalVideoSpec({
  meta: { duration: 40, source: 'listicle.mp4' },
  timeline: {
    shots: [
      { id: 1, start: 0, end: 5 },
      { id: 2, start: 5, end: 15, transition_in: 'cut' },
      { id: 3, start: 15, end: 25, transition_in: 'cut' },
      { id: 4, start: 25, end: 35, transition_in: 'cut' },
      { id: 5, start: 35, end: 40, transition_in: 'cut' },
    ],
    pacing: {
      shot_count: 5,
      avg_shot_duration: 8,
      median_shot_duration: 10,
      fastest_shot_duration: 5,
      slowest_shot_duration: 10,
      classification: 'moderate',
    },
  },
  editing: {
    captions: [
      { text: 'Three things you need to know', start: 0, end: 3 },
      { text: 'First, always start early', start: 5, end: 10 },
      { text: 'Second, consistency is key', start: 15, end: 20 },
      { text: 'Third, never give up', start: 25, end: 30 },
    ],
  },
  audio: {
    transcript: [
      { start: 0, end: 5, text: 'Three things you absolutely need to know.' },
      { start: 5, end: 15, text: 'First, always start early. The early bird gets the worm.' },
      { start: 15, end: 25, text: 'Second, consistency is key. Show up every day.' },
      { start: 25, end: 35, text: 'Third, never give up. Success takes time.' },
      { start: 35, end: 40, text: 'Which one resonates most? Comment below!' },
    ],
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 5, description: 'List intro' },
      escalation: { start: 5, end: 35, description: 'Three items' },
      payoff: { start: 35, end: 40, description: 'Engagement CTA' },
    },
    cta: 'Which one resonates most? Comment below!',
    themes: ['productivity', 'motivation'],
  },
});

/* ------------------------------------------------------------------ */
/*  Fixture 2: How-to / Tutorial                                       */
/* ------------------------------------------------------------------ */

const howtoSpec = createMinimalVideoSpec({
  meta: { duration: 55, source: 'howto.mp4' },
  timeline: {
    shots: [
      { id: 1, start: 0, end: 5 },
      { id: 2, start: 5, end: 20, transition_in: 'cut' },
      { id: 3, start: 20, end: 35, transition_in: 'cut' },
      { id: 4, start: 35, end: 50, transition_in: 'cut' },
      { id: 5, start: 50, end: 55, transition_in: 'cut' },
    ],
    pacing: {
      shot_count: 5,
      avg_shot_duration: 11,
      median_shot_duration: 15,
      fastest_shot_duration: 5,
      slowest_shot_duration: 15,
      classification: 'moderate',
    },
  },
  editing: {
    captions: [
      { text: 'How to set up your dev environment', start: 0, end: 4 },
      { text: 'Step 1: Install Node.js', start: 5, end: 12 },
      { text: 'Step 2: Clone the repo', start: 20, end: 27 },
      { text: 'Step 3: Run npm install', start: 35, end: 42 },
    ],
  },
  audio: {
    transcript: [
      {
        start: 0,
        end: 5,
        text: "Here's how to set up your dev environment in 3 easy steps.",
        speaker: 'host',
      },
      {
        start: 5,
        end: 20,
        text: 'Step 1, install Node.js. Go to nodejs.org and download the LTS version.',
        speaker: 'host',
      },
      {
        start: 20,
        end: 35,
        text: 'Step 2, clone the repo. Open your terminal and run git clone.',
        speaker: 'host',
      },
      {
        start: 35,
        end: 50,
        text: 'Step 3, run npm install. This will install all dependencies.',
        speaker: 'host',
      },
      {
        start: 50,
        end: 55,
        text: 'Follow for more tutorials!',
        speaker: 'host',
      },
    ],
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 5, description: 'Tutorial intro' },
      escalation: { start: 5, end: 50, description: 'Three steps' },
      payoff: { start: 50, end: 55, description: 'Follow CTA' },
    },
    cta: 'Follow for more tutorials!',
  },
});

/* ------------------------------------------------------------------ */
/*  Fixture 3: Versus / Comparison                                     */
/* ------------------------------------------------------------------ */

const versusSpec = createMinimalVideoSpec({
  meta: { duration: 45, source: 'versus.mp4' },
  timeline: {
    shots: [
      { id: 1, start: 0, end: 5 },
      { id: 2, start: 5, end: 20, transition_in: 'cut' },
      { id: 3, start: 20, end: 35, transition_in: 'cut' },
      { id: 4, start: 35, end: 45, transition_in: 'cut' },
    ],
    pacing: {
      shot_count: 4,
      avg_shot_duration: 11.25,
      median_shot_duration: 12.5,
      fastest_shot_duration: 5,
      slowest_shot_duration: 15,
      classification: 'moderate',
    },
  },
  editing: {
    captions: [
      { text: 'React vs Vue', start: 0, end: 3 },
      { text: 'React is better for large apps', start: 5, end: 12 },
      { text: 'Vue is easier to learn', start: 20, end: 27 },
    ],
  },
  audio: {
    transcript: [
      {
        start: 0,
        end: 5,
        text: 'React vs Vue. Which is better for your next project?',
        speaker: 'host',
      },
      {
        start: 5,
        end: 20,
        text: 'React has a massive ecosystem and is great for large-scale applications.',
        speaker: 'host',
      },
      {
        start: 20,
        end: 35,
        text: 'Vue is easier to learn and compared to React, the learning curve is much gentler.',
        speaker: 'host',
      },
      {
        start: 35,
        end: 45,
        text: 'My recommendation? It depends on your team. Should you go React or Vue? Comment below.',
        speaker: 'host',
      },
    ],
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 5, description: 'Comparison intro' },
      escalation: { start: 5, end: 35, description: 'Pros of each' },
      payoff: { start: 35, end: 45, description: 'Recommendation' },
    },
    cta: 'Comment below.',
    themes: ['programming', 'web development'],
  },
});

/* ------------------------------------------------------------------ */
/*  Fixture 4: Reaction (reddit / inserted content)                    */
/* ------------------------------------------------------------------ */

const reactionSpec = createMinimalVideoSpec({
  meta: { duration: 35, source: 'reaction.mp4' },
  timeline: {
    shots: [
      { id: 1, start: 0, end: 5 },
      { id: 2, start: 5, end: 15, transition_in: 'cut' },
      { id: 3, start: 15, end: 25, transition_in: 'cut' },
      { id: 4, start: 25, end: 35, transition_in: 'cut' },
    ],
    pacing: {
      shot_count: 4,
      avg_shot_duration: 8.75,
      median_shot_duration: 10,
      fastest_shot_duration: 5,
      slowest_shot_duration: 10,
      classification: 'moderate',
    },
  },
  audio: {
    transcript: [
      { start: 0, end: 5, text: 'Look at this Reddit post!', speaker: 'host' },
      {
        start: 5,
        end: 15,
        text: 'This person says they made a million dollars in a week.',
        speaker: 'host',
      },
      { start: 15, end: 25, text: 'No way this is real. Let me break it down.', speaker: 'host' },
      { start: 25, end: 35, text: 'What do you think? Is this legit?', speaker: 'host' },
    ],
  },
  inserted_content_blocks: [
    { id: 'ic-1', type: 'reddit_screenshot', start: 5, end: 15, presentation: 'full_screen' },
    { id: 'ic-2', type: 'reddit_screenshot', start: 15, end: 25, presentation: 'full_screen' },
  ],
  narrative: {
    arc: {
      hook: { start: 0, end: 5, description: 'Reaction intro' },
      escalation: { start: 5, end: 25, description: 'Reddit content reaction' },
      payoff: { start: 25, end: 35, description: 'Commentary' },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Fixture 5: Compilation / Montage (music-driven, no voice)          */
/* ------------------------------------------------------------------ */

const compilationSpec = createMinimalVideoSpec({
  meta: { duration: 30, source: 'compilation.mp4' },
  timeline: {
    shots: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      start: i * 1.5,
      end: (i + 1) * 1.5,
      transition_in: i > 0 ? ('cut' as const) : undefined,
    })),
    pacing: {
      shot_count: 20,
      avg_shot_duration: 1.5,
      median_shot_duration: 1.5,
      fastest_shot_duration: 1.5,
      slowest_shot_duration: 1.5,
      classification: 'very_fast',
    },
  },
  audio: {
    transcript: [],
    music_segments: [{ start: 0, end: 30, track: 'Epic Montage', background: false }],
    sound_effects: [],
    beat_grid: { bpm: 128, beats: Array.from({ length: 64 }, (_, i) => i * (30 / 64)) },
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 3, description: 'Opening montage' },
      escalation: { start: 3, end: 27, description: 'Rapid clips' },
      payoff: { start: 27, end: 30, description: 'Finale' },
    },
    themes: ['action', 'excitement'],
  },
});

/* ------------------------------------------------------------------ */
/*  Fixture 6: Story / Narrative                                       */
/* ------------------------------------------------------------------ */

const storySpec = createMinimalVideoSpec({
  meta: { duration: 60, source: 'story.mp4' },
  timeline: {
    shots: [
      { id: 1, start: 0, end: 8 },
      { id: 2, start: 8, end: 25, transition_in: 'cut' },
      { id: 3, start: 25, end: 45, transition_in: 'cut' },
      { id: 4, start: 45, end: 60, transition_in: 'cut' },
    ],
    pacing: {
      shot_count: 4,
      avg_shot_duration: 15,
      median_shot_duration: 16.5,
      fastest_shot_duration: 8,
      slowest_shot_duration: 20,
      classification: 'moderate',
    },
  },
  audio: {
    transcript: [
      {
        start: 0,
        end: 8,
        text: 'One day I decided to quit my job. This is the story of what happened next.',
        speaker: 'host',
      },
      {
        start: 8,
        end: 25,
        text: 'The journey started rough. I had no savings and no plan. But I kept going.',
        speaker: 'host',
      },
      {
        start: 25,
        end: 45,
        text: 'After six months of struggle, everything changed. I remember when the first client signed.',
        speaker: 'host',
      },
      {
        start: 45,
        end: 60,
        text: 'Now I run a profitable business. The experience taught me everything.',
        speaker: 'host',
      },
    ],
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 8, description: 'Decision to quit' },
      escalation: { start: 8, end: 45, description: 'Struggle and growth' },
      payoff: { start: 45, end: 60, description: 'Successful outcome' },
    },
    format: 'story',
    tone: 'inspirational',
  },
});

/* ------------------------------------------------------------------ */
/*  Fixture 7: Hot Take (short, opinionated)                           */
/* ------------------------------------------------------------------ */

const hotTakeSpec = createMinimalVideoSpec({
  meta: { duration: 15, source: 'hot-take.mp4' },
  timeline: {
    shots: [{ id: 1, start: 0, end: 15 }],
    pacing: {
      shot_count: 1,
      avg_shot_duration: 15,
      median_shot_duration: 15,
      fastest_shot_duration: 15,
      slowest_shot_duration: 15,
      classification: 'slow',
    },
  },
  audio: {
    transcript: [
      {
        start: 0,
        end: 15,
        text: 'Unpopular opinion: TypeScript is overrated. Most projects would be better off with plain JavaScript and good tests.',
        speaker: 'host',
      },
    ],
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 3, description: 'Hot take statement' },
      escalation: { start: 3, end: 12, description: 'Justification' },
      payoff: { start: 12, end: 15, description: 'Conclusion' },
    },
    tone: 'provocative',
  },
});

/* ------------------------------------------------------------------ */
/*  Fixture 8: Myth / Debunking                                        */
/* ------------------------------------------------------------------ */

const mythSpec = createMinimalVideoSpec({
  meta: { duration: 40, source: 'myth.mp4' },
  timeline: {
    shots: [
      { id: 1, start: 0, end: 5 },
      { id: 2, start: 5, end: 20, transition_in: 'cut' },
      { id: 3, start: 20, end: 35, transition_in: 'cut' },
      { id: 4, start: 35, end: 40, transition_in: 'cut' },
    ],
    pacing: {
      shot_count: 4,
      avg_shot_duration: 10,
      median_shot_duration: 12.5,
      fastest_shot_duration: 5,
      slowest_shot_duration: 15,
      classification: 'moderate',
    },
  },
  editing: {
    captions: [
      { text: 'Common misconception', start: 0, end: 3 },
      { text: 'People think coding is hard', start: 5, end: 10 },
    ],
  },
  audio: {
    transcript: [
      {
        start: 0,
        end: 5,
        text: 'Time to debunk a common misconception about programming.',
        speaker: 'host',
      },
      {
        start: 5,
        end: 20,
        text: 'People think you need a CS degree to code. This is a myth.',
        speaker: 'host',
      },
      {
        start: 20,
        end: 35,
        text: 'Actually, most successful developers are self-taught. The data proves it.',
        speaker: 'host',
      },
      {
        start: 35,
        end: 40,
        text: 'Stop believing myths and start building.',
        speaker: 'host',
      },
    ],
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 5, description: 'Myth intro' },
      escalation: { start: 5, end: 35, description: 'Debunking' },
      payoff: { start: 35, end: 40, description: 'Call to action' },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Fixture 9: Talking Head (single shot, conversational)              */
/* ------------------------------------------------------------------ */

const talkingHeadSpec = createMinimalVideoSpec({
  meta: { duration: 45, source: 'talking-head.mp4' },
  timeline: {
    shots: [{ id: 1, start: 0, end: 45 }],
    pacing: {
      shot_count: 1,
      avg_shot_duration: 45,
      median_shot_duration: 45,
      fastest_shot_duration: 45,
      slowest_shot_duration: 45,
      classification: 'slow',
    },
  },
  editing: {
    captions: [
      { text: 'Hello everyone', start: 0, end: 2 },
      { text: 'Today I want to talk about something', start: 2, end: 5 },
    ],
    camera_motion: [{ shot_id: 1, motion: 'static', start: 0, end: 45 }],
  },
  audio: {
    transcript: [
      {
        start: 0,
        end: 10,
        text: 'Hello everyone, today I want to talk about something important.',
        speaker: 'host',
      },
      {
        start: 10,
        end: 25,
        text: 'This is a key insight that you need to know about.',
        speaker: 'host',
      },
      {
        start: 25,
        end: 40,
        text: 'Let me explain why this matters for you.',
        speaker: 'host',
      },
      { start: 40, end: 45, text: 'Follow for more tips!', speaker: 'host' },
    ],
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 5, description: 'Personal greeting' },
      escalation: { start: 5, end: 40, description: 'Main topic discussion' },
      payoff: { start: 40, end: 45, description: 'Call to action' },
    },
    cta: 'Follow for more tips!',
    tone: 'conversational',
  },
});

/* ------------------------------------------------------------------ */
/*  All fixtures with ground truth                                     */
/* ------------------------------------------------------------------ */

export const VV_FIXTURES: VVFixture[] = [
  {
    name: 'listicle',
    description: 'Numbered list with "First, Second, Third" patterns',
    spec: listicleSpec,
    expected: {
      archetype: 'listicle',
      purpose: 'educate',
      format: 'listicle',
      energy: 'medium',
      editingDensity: 'moderate',
      minConfidence: 0.6,
      expectedSceneCount: 5,
      hasVoiceover: true,
      hasMusic: false,
      hasCta: true,
      hasInsertedContent: false,
    },
  },
  {
    name: 'howto',
    description: 'Step-by-step tutorial with "Step 1, Step 2, Step 3"',
    spec: howtoSpec,
    expected: {
      archetype: 'howto',
      purpose: 'educate',
      format: 'tutorial',
      energy: 'medium',
      editingDensity: 'moderate',
      minConfidence: 0.5,
      expectedSceneCount: 5,
      hasVoiceover: true,
      hasMusic: false,
      hasCta: true,
      hasInsertedContent: false,
    },
  },
  {
    name: 'versus',
    description: 'Comparison video with "vs" and "better than" language',
    spec: versusSpec,
    expected: {
      archetype: 'versus',
      purpose: 'persuade',
      format: 'versus',
      energy: 'medium',
      editingDensity: 'moderate',
      minConfidence: 0.5,
      expectedSceneCount: 4,
      hasVoiceover: true,
      hasMusic: false,
      hasCta: true,
      hasInsertedContent: false,
    },
  },
  {
    name: 'reaction',
    description: 'Reddit reaction video with inserted content blocks',
    spec: reactionSpec,
    expected: {
      archetype: 'reaction',
      purpose: 'educate',
      format: 'reaction',
      energy: 'medium',
      editingDensity: 'moderate',
      minConfidence: 0.6,
      expectedSceneCount: 4,
      hasVoiceover: true,
      hasMusic: false,
      hasCta: false,
      hasInsertedContent: true,
    },
  },
  {
    name: 'compilation',
    description: 'Fast-cut music montage with no narration',
    spec: compilationSpec,
    expected: {
      archetype: 'montage',
      purpose: 'entertain',
      format: 'compilation',
      energy: 'high',
      editingDensity: 'hyper',
      minConfidence: 0.5,
      expectedSceneCount: 20,
      hasVoiceover: false,
      hasMusic: true,
      hasCta: false,
      hasInsertedContent: false,
    },
  },
  {
    name: 'story',
    description: 'Personal narrative with "One day", "journey", "experience"',
    spec: storySpec,
    expected: {
      archetype: 'story',
      purpose: 'educate',
      format: 'story',
      energy: 'medium',
      editingDensity: 'moderate',
      minConfidence: 0.5,
      expectedSceneCount: 4,
      hasVoiceover: true,
      hasMusic: false,
      hasCta: false,
      hasInsertedContent: false,
    },
  },
  {
    name: 'hot-take',
    description: 'Short opinionated clip with "unpopular opinion"',
    spec: hotTakeSpec,
    expected: {
      archetype: 'hot-take',
      purpose: 'educate',
      format: 'talking_head',
      energy: 'low',
      editingDensity: 'minimal',
      minConfidence: 0.5,
      expectedSceneCount: 1,
      hasVoiceover: true,
      hasMusic: false,
      hasCta: false,
      hasInsertedContent: false,
    },
  },
  {
    name: 'myth',
    description: 'Debunking video with "misconception", "myth", "actually"',
    spec: mythSpec,
    expected: {
      archetype: 'myth',
      purpose: 'educate',
      format: 'talking_head',
      energy: 'medium',
      editingDensity: 'moderate',
      minConfidence: 0.5,
      expectedSceneCount: 4,
      hasVoiceover: true,
      hasMusic: false,
      hasCta: false,
      hasInsertedContent: false,
    },
  },
  {
    name: 'talking-head',
    description: 'Single-shot conversational video with CTA',
    spec: talkingHeadSpec,
    expected: {
      // No list/versus/howto/reaction/story signals => falls to default
      archetype: 'listicle',
      purpose: 'educate',
      format: 'talking_head',
      energy: 'low',
      editingDensity: 'minimal',
      minConfidence: 0.4,
      expectedSceneCount: 1,
      hasVoiceover: true,
      hasMusic: false,
      hasCta: true,
      hasInsertedContent: false,
    },
  },
];
