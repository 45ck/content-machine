/**
 * Debug script to trace the hook duplication issue
 */
import { buildAlignmentUnits } from '../src/audio/pipeline';
import type { ScriptOutput } from '../src/script/schema';

// Load the actual script from the demo
const script: ScriptOutput = {
  schemaVersion: "1.0.0",
  scenes: [
    {
      id: "scene-001",
      text: "Wanna know the secret sauce to crushing your day? It's all in your morning routine!",
      visualDirection: "Quick cuts of someone waking up, stretching, and looking energized",
      mood: "Excited and motivational"
    },
    {
      id: "scene-002",
      text: "1. Start with a win - like making your bed! It sets the tone for a productive day.",
      visualDirection: "Show someone making their bed with a satisfied smile",
      mood: "Cheerful and encouraging"
    },
    {
      id: "scene-003",
      text: "2. Hydrate! Drinking water first thing jumpstarts your brain and body.",
      visualDirection: "Close-up of a glass of water being poured and someone drinking it",
      mood: "Refreshing and lively"
    },
    {
      id: "scene-004",
      text: "3. Move your body. Even just 5 minutes of stretching gets your blood flowing.",
      visualDirection: "Quick shots of someone doing simple stretches or yoga",
      mood: "Energizing and positive"
    },
    {
      id: "scene-005",
      text: "4. Plan your day. A quick to-do list focuses your mind and boosts efficiency.",
      visualDirection: "Over-the-shoulder shot of someone writing a to-do list",
      mood: "Focused and calm"
    },
    {
      id: "scene-006",
      text: "Try these tips tomorrow and feel the difference! Hit follow for more productivity hacks!",
      visualDirection: "Person giving a thumbs up and smiling at the camera",
      mood: "Uplifting and inviting"
    }
  ],
  reasoning: "Test",
  title: "Boost Your Productivity with These Morning Routine Hacks!",
  hook: "Wanna know the secret sauce to crushing your day?",
  cta: "Try these tips tomorrow and feel the difference! Hit follow for more productivity hacks!",
  hashtags: ["#MorningRoutine", "#ProductivityHacks", "#StartYourDayRight"]
};

console.log('=== DEBUG: Hook Deduplication Analysis ===\n');

const hookText = script.hook?.replace(/\s+/g, ' ').trim() || '';
const firstSceneText = script.scenes[0]?.text.replace(/\s+/g, ' ').trim() || '';
const lastSceneText = script.scenes[script.scenes.length - 1]?.text.replace(/\s+/g, ' ').trim() || '';
const ctaText = script.cta?.replace(/\s+/g, ' ').trim() || '';

console.log('Hook:', JSON.stringify(hookText));
console.log('Scene 1:', JSON.stringify(firstSceneText));
console.log('Last Scene:', JSON.stringify(lastSceneText));
console.log('CTA:', JSON.stringify(ctaText));
console.log('');

console.log('--- Hook Deduplication Check ---');
console.log('hookText === firstSceneText:', hookText === firstSceneText);
console.log('firstSceneText.startsWith(hookText):', firstSceneText.startsWith(hookText));
console.log('firstSceneText.includes(hookText):', firstSceneText.includes(hookText));
const hookAlreadyInScene1 = hookText && (
  hookText === firstSceneText ||
  firstSceneText.startsWith(hookText) ||
  firstSceneText.includes(hookText)
);
console.log('hookAlreadyInScene1:', hookAlreadyInScene1);
console.log('');

console.log('--- CTA Deduplication Check ---');
console.log('ctaText === lastSceneText:', ctaText === lastSceneText);
const ctaAlreadyInLastScene = ctaText && (ctaText === lastSceneText);
console.log('ctaAlreadyInLastScene:', ctaAlreadyInLastScene);
console.log('');

console.log('=== Calling buildAlignmentUnits ===\n');
const units = buildAlignmentUnits(script);

console.log(`Generated ${units.length} units:\n`);
units.forEach((unit, i) => {
  console.log(`${i + 1}. [${unit.id}]`);
  console.log(`   "${unit.text}"`);
  console.log('');
});

console.log('=== Full text that will be sent to TTS ===');
const fullText = units.map((unit) => unit.text).join(' ');
console.log(fullText);
console.log('');
console.log('Word count:', fullText.split(/\s+/).filter(Boolean).length);
