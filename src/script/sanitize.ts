/**
 * Script sanitization helpers
 *
 * Removes emojis and markdown artifacts from spoken text fields.
 */
export function sanitizeSpokenText(text?: string): string | undefined {
  if (text === undefined) return undefined;

  let cleaned = text;
  cleaned = cleaned.replace(/\p{Extended_Pictographic}/gu, '');
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
  cleaned = cleaned.replace(/`+/g, '');
  cleaned = cleaned.replace(/^\s*[-*•]\s+/gm, '');
  cleaned = cleaned.replace(/\[(.+?)\]\((.+?)\)/g, '$1');
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/__(.*?)__/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  cleaned = cleaned.replace(/_(.*?)_/g, '$1');
  cleaned = cleaned.replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, '$1');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}
