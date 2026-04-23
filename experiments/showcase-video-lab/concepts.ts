import { resolve } from 'node:path';

export type DemoClipId = 'news' | 'retro' | 'cache' | 'holes';
export type OverlayPosition = 'top' | 'center' | 'bottom';

export interface ShowcaseBeat {
  clip: DemoClipId;
  start: number;
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
  accentColor: string;
  label: string;
  beats: ShowcaseBeat[];
}

const demoRoot = resolve(process.cwd(), 'docs', 'demo');

export const DEMO_CLIPS: Record<DemoClipId, string> = {
  news: resolve(demoRoot, 'demo-4-latest-news.mp4'),
  retro: resolve(demoRoot, 'demo-5-gemini-2026-feels-like-2016.mp4'),
  cache: resolve(demoRoot, 'demo-6-gemini-browser-cache-same-energy.mp4'),
  holes: resolve(demoRoot, 'demo-7-gemini-black-holes-absurdist.mp4'),
};

const BEAT = 2.9;

export const SHOWCASE_CONCEPTS: ShowcaseConcept[] = [
  {
    slug: 'latency-is-a-feeling',
    title: 'Latency Is a Feeling',
    hook: 'Users feel speed before they understand features.',
    thesis: 'A good short can sell product quality by dramatizing response time as emotion.',
    accentColor: '0x2FE6D1',
    label: 'SHOWCASE / SPEED',
    beats: [
      {
        clip: 'news',
        start: 0.2,
        duration: BEAT,
        headline: 'NOBODY ASKS',
        subhead: 'for your p95 at the feed level',
        toneHz: 220,
        position: 'top',
      },
      {
        clip: 'retro',
        start: 6.0,
        duration: BEAT,
        headline: 'THEY JUST FEEL',
        subhead: 'whether the app hesitated',
        toneHz: 196,
        position: 'center',
      },
      {
        clip: 'cache',
        start: 8.5,
        duration: BEAT,
        headline: 'SPINNER',
        subhead: 'means doubt entered the room',
        toneHz: 174,
        position: 'bottom',
      },
      {
        clip: 'holes',
        start: 5.5,
        duration: BEAT,
        headline: 'COLD START',
        subhead: 'looks like broken intent',
        toneHz: 165,
        position: 'center',
      },
      {
        clip: 'cache',
        start: 15.0,
        duration: BEAT,
        headline: 'CACHE HIT',
        subhead: 'feels like trust snapping back',
        toneHz: 247,
        position: 'top',
      },
      {
        clip: 'retro',
        start: 18.2,
        duration: BEAT,
        headline: 'FAST UI',
        subhead: 'lets the story outrun the chrome',
        toneHz: 262,
        position: 'bottom',
      },
      {
        clip: 'news',
        start: 4.8,
        duration: BEAT,
        headline: 'CUT THE WAIT',
        subhead: 'before you add another button',
        toneHz: 220,
        position: 'center',
      },
      {
        clip: 'holes',
        start: 22.0,
        duration: BEAT,
        headline: 'PRELOAD INTENT',
        subhead: 'not just assets',
        toneHz: 196,
        position: 'top',
      },
      {
        clip: 'cache',
        start: 27.5,
        duration: BEAT,
        headline: 'RESPONSE TIME',
        subhead: 'is product design in disguise',
        toneHz: 294,
        position: 'center',
      },
      {
        clip: 'retro',
        start: 31.0,
        duration: BEAT,
        headline: 'MAKE IT JUMP',
        subhead: 'before the user can doubt it',
        toneHz: 247,
        position: 'bottom',
      },
      {
        clip: 'holes',
        start: 37.5,
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
    accentColor: '0xFF8A00',
    label: 'SHOWCASE / LOOP',
    beats: [
      {
        clip: 'retro',
        start: 2.0,
        duration: BEAT,
        headline: 'PROMPT',
        subhead: 'is not the product by itself',
        toneHz: 185,
        position: 'top',
      },
      {
        clip: 'cache',
        start: 5.0,
        duration: BEAT,
        headline: 'SCRIPT',
        subhead: 'needs a voice immediately after',
        toneHz: 207,
        position: 'center',
      },
      {
        clip: 'holes',
        start: 9.0,
        duration: BEAT,
        headline: 'VOICE',
        subhead: 'needs visuals before the energy fades',
        toneHz: 233,
        position: 'bottom',
      },
      {
        clip: 'news',
        start: 7.0,
        duration: BEAT,
        headline: 'VISUALS',
        subhead: 'need render in the same breath',
        toneHz: 246,
        position: 'center',
      },
      {
        clip: 'cache',
        start: 12.0,
        duration: BEAT,
        headline: 'RENDER',
        subhead: 'needs a brutal review gate',
        toneHz: 277,
        position: 'top',
      },
      {
        clip: 'retro',
        start: 14.8,
        duration: BEAT,
        headline: 'REVIEW',
        subhead: 'needs a rerun path not a shrug',
        toneHz: 233,
        position: 'bottom',
      },
      {
        clip: 'holes',
        start: 18.0,
        duration: BEAT,
        headline: 'TOO MANY TOOLS',
        subhead: 'turn momentum into context loss',
        toneHz: 196,
        position: 'center',
      },
      {
        clip: 'cache',
        start: 22.0,
        duration: BEAT,
        headline: 'SMALL LOOPS',
        subhead: 'make quality cheap enough to chase',
        toneHz: 311,
        position: 'top',
      },
      {
        clip: 'retro',
        start: 28.5,
        duration: BEAT,
        headline: 'MAKE FILES',
        subhead: 'judge them fast',
        toneHz: 349,
        position: 'center',
      },
      {
        clip: 'holes',
        start: 32.0,
        duration: BEAT,
        headline: 'KILL THE DRAG',
        subhead: 'between idea and playback',
        toneHz: 311,
        position: 'bottom',
      },
      {
        clip: 'cache',
        start: 39.0,
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
    accentColor: '0xFF315C',
    label: 'SHOWCASE / FOCUS',
    beats: [
      {
        clip: 'holes',
        start: 1.0,
        duration: BEAT,
        headline: 'EVERY ROADMAP',
        subhead: 'wants to become gravity',
        toneHz: 147,
        position: 'top',
      },
      {
        clip: 'retro',
        start: 9.5,
        duration: BEAT,
        headline: 'EVERY FEATURE',
        subhead: 'wants one more sentence',
        toneHz: 165,
        position: 'center',
      },
      {
        clip: 'cache',
        start: 11.0,
        duration: BEAT,
        headline: 'EVERY SENTENCE',
        subhead: 'wants one more caveat',
        toneHz: 185,
        position: 'bottom',
      },
      {
        clip: 'news',
        start: 1.0,
        duration: BEAT,
        headline: 'THEN THE HOOK',
        subhead: 'dies under polite explanation',
        toneHz: 196,
        position: 'center',
      },
      {
        clip: 'holes',
        start: 14.5,
        duration: BEAT,
        headline: 'CLARITY',
        subhead: 'is escape velocity for the feed',
        toneHz: 220,
        position: 'top',
      },
      {
        clip: 'retro',
        start: 20.0,
        duration: BEAT,
        headline: 'ONE CLAIM',
        subhead: 'so the audience can hold it',
        toneHz: 247,
        position: 'bottom',
      },
      {
        clip: 'cache',
        start: 24.0,
        duration: BEAT,
        headline: 'ONE VISUAL MOVE',
        subhead: 'so the memory has a shape',
        toneHz: 262,
        position: 'center',
      },
      {
        clip: 'holes',
        start: 28.5,
        duration: BEAT,
        headline: 'ONE PAYOFF',
        subhead: 'so the loop feels earned',
        toneHz: 277,
        position: 'top',
      },
      {
        clip: 'retro',
        start: 34.0,
        duration: BEAT,
        headline: 'CUT THE ORBITS',
        subhead: 'keep the force line obvious',
        toneHz: 294,
        position: 'center',
      },
      {
        clip: 'cache',
        start: 41.0,
        duration: BEAT,
        headline: 'REPEAT THE VECTOR',
        subhead: 'until the idea bends time',
        toneHz: 330,
        position: 'bottom',
      },
      {
        clip: 'holes',
        start: 48.0,
        duration: BEAT,
        headline: 'MAKE IT ESCAPE',
        subhead: 'or make it shorter',
        toneHz: 370,
        position: 'center',
      },
    ],
  },
];
