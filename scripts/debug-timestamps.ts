/**
 * Debug script to analyze the timestamps file
 */
import * as fs from 'fs';

const ts = JSON.parse(fs.readFileSync('output/mode-page-12words/timestamps.json', 'utf-8'));
console.log('TTS Engine:', ts.ttsEngine);
console.log('ASR Engine:', ts.asrEngine);
console.log('Total Duration:', ts.totalDuration);
console.log('Word Count:', ts.allWords.length);
console.log('');
console.log('=== First 30 words ===');
ts.allWords.slice(0, 30).forEach((w: any, i: number) => {
  const marker = w.word.startsWith('[_TT_') ? ' [TTS MARKER]' : '';
  const lowConf = w.confidence < 0.5 ? ' [LOW CONF]' : '';
  console.log(`${i.toString().padStart(2)}: ${w.start.toFixed(2)}s-${w.end.toFixed(2)}s  "${w.word}"${marker}${lowConf}`);
});

console.log('\n=== Words between 0-5 seconds (should be hook only) ===');
ts.allWords
  .filter((w: any) => w.start < 5)
  .forEach((w: any) => {
    console.log(`${w.start.toFixed(2)}s-${w.end.toFixed(2)}s  "${w.word}"`);
  });

// Find duplicates
console.log('\n=== Repeated word sequences ===');
const wordTexts = ts.allWords.map((w: any) => w.word);
const hookWords = ['Wanna', 'know', 'the', 'secret', 'sauce', 'to', 'crushing', 'your', 'day'];
let hookCount = 0;
for (let i = 0; i < wordTexts.length - hookWords.length; i++) {
  let match = true;
  for (let j = 0; j < hookWords.length; j++) {
    if (wordTexts[i + j].toLowerCase().replace(/[^a-z]/g, '') !== hookWords[j].toLowerCase()) {
      match = false;
      break;
    }
  }
  if (match) {
    hookCount++;
    console.log(`Found hook at word index ${i}: ${ts.allWords[i].start.toFixed(2)}s`);
  }
}
console.log(`Total hook occurrences: ${hookCount}`);
