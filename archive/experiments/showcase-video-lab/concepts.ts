export type OverlayPosition = 'top' | 'center' | 'bottom';
export type ProceduralVisualMode = 'signal' | 'grid' | 'scan' | 'pulse';

export type ShowcaseBeatSource =
  | {
      type: 'procedural';
      mode: ProceduralVisualMode;
    }
  | {
      type: 'clip';
      path: string;
      start: number;
    };

export interface ShowcaseBeat {
  source: ShowcaseBeatSource;
  duration: number;
  headline: string;
  subhead: string;
  toneHz: number;
  position?: OverlayPosition;
}

export interface ShowcaseConcept {
  slug: string;
  title: string;
  hook: string;
  thesis: string;
  baseColor: string;
  accentColor: string;
  label: string;
  beats: ShowcaseBeat[];
}

const BEAT = 2.9;

export const SHOWCASE_CONCEPTS: ShowcaseConcept[] = [
  {
    slug: 'latency-is-a-feeling',
    title: 'Latency Is a Feeling',
    hook: 'Users feel speed before they understand features.',
    thesis: 'A good short can sell product quality by dramatizing response time as emotion.',
    baseColor: '0x07131D',
    accentColor: '0x2FE6D1',
    label: 'SHOWCASE / SPEED',
    beats: [
      {
        source: { type: 'procedural', mode: 'signal' },
        duration: BEAT,
        headline: 'NOBODY ASKS',
        subhead: 'for your p95 at the feed level',
        toneHz: 220,
        position: 'top',
      },
      {
        source: { type: 'procedural', mode: 'grid' },
        duration: BEAT,
        headline: 'THEY JUST FEEL',
        subhead: 'whether the app hesitated',
        toneHz: 196,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'scan' },
        duration: BEAT,
        headline: 'SPINNER',
        subhead: 'means doubt entered the room',
        toneHz: 174,
        position: 'bottom',
      },
      {
        source: { type: 'procedural', mode: 'pulse' },
        duration: BEAT,
        headline: 'COLD START',
        subhead: 'looks like broken intent',
        toneHz: 165,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'signal' },
        duration: BEAT,
        headline: 'CACHE HIT',
        subhead: 'feels like trust snapping back',
        toneHz: 247,
        position: 'top',
      },
      {
        source: { type: 'procedural', mode: 'grid' },
        duration: BEAT,
        headline: 'FAST UI',
        subhead: 'lets the story outrun the chrome',
        toneHz: 262,
        position: 'bottom',
      },
      {
        source: { type: 'procedural', mode: 'scan' },
        duration: BEAT,
        headline: 'CUT THE WAIT',
        subhead: 'before you add another button',
        toneHz: 220,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'pulse' },
        duration: BEAT,
        headline: 'PRELOAD INTENT',
        subhead: 'not just assets',
        toneHz: 196,
        position: 'top',
      },
      {
        source: { type: 'procedural', mode: 'signal' },
        duration: BEAT,
        headline: 'RESPONSE TIME',
        subhead: 'is product design in disguise',
        toneHz: 294,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'grid' },
        duration: BEAT,
        headline: 'MAKE IT JUMP',
        subhead: 'before the user can doubt it',
        toneHz: 247,
        position: 'bottom',
      },
      {
        source: { type: 'procedural', mode: 'pulse' },
        duration: BEAT,
        headline: 'SHIP THE FEELING',
        subhead: 'and the feature reads louder',
        toneHz: 330,
        position: 'center',
      },
    ],
  },
  {
    slug: 'small-loops-win',
    title: 'Small Loops Win',
    hook: 'The best content tools feel like one tight loop, not five departments.',
    thesis: 'This is a manifesto-style product short about reducing content creation drag.',
    baseColor: '0x1A0F06',
    accentColor: '0xFF8A00',
    label: 'SHOWCASE / LOOP',
    beats: [
      {
        source: { type: 'procedural', mode: 'grid' },
        duration: BEAT,
        headline: 'PROMPT',
        subhead: 'is not the product by itself',
        toneHz: 185,
        position: 'top',
      },
      {
        source: { type: 'procedural', mode: 'signal' },
        duration: BEAT,
        headline: 'SCRIPT',
        subhead: 'needs a voice immediately after',
        toneHz: 207,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'scan' },
        duration: BEAT,
        headline: 'VOICE',
        subhead: 'needs visuals before the energy fades',
        toneHz: 233,
        position: 'bottom',
      },
      {
        source: { type: 'procedural', mode: 'pulse' },
        duration: BEAT,
        headline: 'VISUALS',
        subhead: 'need render in the same breath',
        toneHz: 246,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'signal' },
        duration: BEAT,
        headline: 'RENDER',
        subhead: 'needs a brutal review gate',
        toneHz: 277,
        position: 'top',
      },
      {
        source: { type: 'procedural', mode: 'grid' },
        duration: BEAT,
        headline: 'REVIEW',
        subhead: 'needs a rerun path not a shrug',
        toneHz: 233,
        position: 'bottom',
      },
      {
        source: { type: 'procedural', mode: 'scan' },
        duration: BEAT,
        headline: 'TOO MANY TOOLS',
        subhead: 'turn momentum into context loss',
        toneHz: 196,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'pulse' },
        duration: BEAT,
        headline: 'SMALL LOOPS',
        subhead: 'make quality cheap enough to chase',
        toneHz: 311,
        position: 'top',
      },
      {
        source: { type: 'procedural', mode: 'signal' },
        duration: BEAT,
        headline: 'MAKE FILES',
        subhead: 'judge them fast',
        toneHz: 349,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'grid' },
        duration: BEAT,
        headline: 'KILL THE DRAG',
        subhead: 'between idea and playback',
        toneHz: 311,
        position: 'bottom',
      },
      {
        source: { type: 'procedural', mode: 'pulse' },
        duration: BEAT,
        headline: 'ONE TIGHT LOOP',
        subhead: 'beats a giant control plane',
        toneHz: 392,
        position: 'center',
      },
    ],
  },
  {
    slug: 'escape-velocity-storytelling',
    title: 'Escape Velocity Storytelling',
    hook: 'Most shorts collapse under too many ideas. The winners escape with one clear force.',
    thesis: 'An absurdist creative direction piece about focus, repetition, and feed gravity.',
    baseColor: '0x16070D',
    accentColor: '0xFF315C',
    label: 'SHOWCASE / FOCUS',
    beats: [
      {
        source: { type: 'procedural', mode: 'pulse' },
        duration: BEAT,
        headline: 'EVERY ROADMAP',
        subhead: 'wants to become gravity',
        toneHz: 147,
        position: 'top',
      },
      {
        source: { type: 'procedural', mode: 'grid' },
        duration: BEAT,
        headline: 'EVERY FEATURE',
        subhead: 'wants one more sentence',
        toneHz: 165,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'signal' },
        duration: BEAT,
        headline: 'EVERY SENTENCE',
        subhead: 'wants one more caveat',
        toneHz: 185,
        position: 'bottom',
      },
      {
        source: { type: 'procedural', mode: 'scan' },
        duration: BEAT,
        headline: 'THEN THE HOOK',
        subhead: 'dies under polite explanation',
        toneHz: 196,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'pulse' },
        duration: BEAT,
        headline: 'CLARITY',
        subhead: 'is escape velocity for the feed',
        toneHz: 220,
        position: 'top',
      },
      {
        source: { type: 'procedural', mode: 'grid' },
        duration: BEAT,
        headline: 'ONE CLAIM',
        subhead: 'so the audience can hold it',
        toneHz: 247,
        position: 'bottom',
      },
      {
        source: { type: 'procedural', mode: 'signal' },
        duration: BEAT,
        headline: 'ONE VISUAL MOVE',
        subhead: 'so the memory has a shape',
        toneHz: 262,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'scan' },
        duration: BEAT,
        headline: 'ONE PAYOFF',
        subhead: 'so the loop feels earned',
        toneHz: 277,
        position: 'top',
      },
      {
        source: { type: 'procedural', mode: 'pulse' },
        duration: BEAT,
        headline: 'CUT THE ORBITS',
        subhead: 'keep the force line obvious',
        toneHz: 294,
        position: 'center',
      },
      {
        source: { type: 'procedural', mode: 'grid' },
        duration: BEAT,
        headline: 'REPEAT THE VECTOR',
        subhead: 'until the idea bends time',
        toneHz: 330,
        position: 'bottom',
      },
      {
        source: { type: 'procedural', mode: 'signal' },
        duration: BEAT,
        headline: 'MAKE IT ESCAPE',
        subhead: 'or make it shorter',
        toneHz: 370,
        position: 'center',
      },
    ],
  },
];
