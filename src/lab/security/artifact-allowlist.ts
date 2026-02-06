import { CMError } from '../../core/errors';

const EXACT_ALLOWED = new Set([
  'script.json',
  'timestamps.json',
  'visuals.json',
  'score.json',
  'sync-report.json',
  'caption-report.json',
  'caption-quality.json',
  'caption-settings.json',
]);

const PATTERN_ALLOWED: RegExp[] = [
  /^sync-report-attempt\d+\.json$/,
  /^caption-report-attempt\d+\.json$/,
  /^caption-settings-attempt\d+\.json$/,
];

export function assertAllowedArtifactName(name: string): void {
  if (EXACT_ALLOWED.has(name)) return;
  for (const pattern of PATTERN_ALLOWED) {
    if (pattern.test(name)) return;
  }
  throw new CMError('FORBIDDEN', `Artifact name not allowed: ${name}`, {
    name,
    fix: 'Only known JSON artifacts may be fetched from the Lab server.',
  });
}
