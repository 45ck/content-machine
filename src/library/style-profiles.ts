import {
  STYLE_PROFILE_LIBRARY_SCHEMA_VERSION,
  StyleProfileLibrarySchema,
  StyleProfileSchema,
  type StyleProfile,
  type StyleProfileLibrary,
} from '../domain';

export function upsertStyleProfile(
  profileInput: StyleProfile,
  existing?: StyleProfileLibrary | null
): StyleProfileLibrary {
  const profile = StyleProfileSchema.parse(profileInput);
  const profiles = new Map<string, StyleProfile>();
  for (const item of existing?.profiles ?? []) profiles.set(item.id, item);
  profiles.set(profile.id, profile);

  return StyleProfileLibrarySchema.parse({
    schemaVersion: STYLE_PROFILE_LIBRARY_SCHEMA_VERSION,
    profiles: [...profiles.values()].sort((left, right) => left.id.localeCompare(right.id)),
    warnings: [],
  });
}
