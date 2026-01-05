# RQ-03: Schema Versioning for Inter-Stage Contracts

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P1  
**Question:** How do we version inter-stage JSON schemas?

---

## 1. Problem Statement

Schema changes between stages could break saved projects. If `script.json` schema evolves, old projects become incompatible. The system needs:

- Version field in all JSON outputs
- Migration strategy for existing projects
- Backwards compatibility guarantees
- Deprecation policy for old schemas

---

## 2. Vendor Evidence

### 2.1 Protocol Version Constants (MCP SDK)

**Source:** [vendor/mcp/python-sdk/src/mcp/shared/version.py](../../../vendor/mcp/python-sdk/src/mcp/shared/version.py)

MCP uses date-based version constants:

```python
LATEST_PROTOCOL_VERSION = "2025-11-25"
DEFAULT_NEGOTIATED_VERSION = "2025-03-26"

SUPPORTED_PROTOCOL_VERSIONS = [
    "2025-11-25",
    "2025-10-28",
    "2025-06-18",
    "2025-03-26",
    "2024-11-05",
]
```

### 2.2 Zod Schema Extension Pattern

**Source:** [templates/vidosy/src/shared/zod-schema.ts](../../../templates/vidosy/src/shared/zod-schema.ts)

Zod's `.extend()` enables backwards-compatible schema evolution:

```typescript
// Base schema (v1)
const SceneSchemaV1 = z.object({
  text: z.string(),
  duration: z.number().positive(),
});

// Extended schema (v2) - backwards compatible
const SceneSchemaV2 = SceneSchemaV1.extend({
  voiceId: z.string().optional(), // NEW: optional for backwards compat
  animation: z.enum(['fade', 'slide']).optional(),
});

// Merge multiple schemas
const FullSceneSchema = SceneSchemaV1.merge(AudioConfigSchema);

// Pick/Omit for partial schemas
const MinimalScene = SceneSchemaV2.pick({ text: true, duration: true });
```

### 2.3 Forward Compatibility with passthrough()

**Source:** [vendor/mcp/python-sdk/src/mcp/types.py](../../../vendor/mcp/python-sdk/src/mcp/types.py)

```python
from pydantic import BaseModel, ConfigDict

class Result(BaseModel):
    """Base result that allows unknown fields for forward compatibility."""
    model_config = ConfigDict(extra="allow")  # Accept unknown fields

class CallToolResult(Result):
    content: list[TextContent | ImageContent]
    isError: bool | None = None
```

**Zod equivalent:**

```typescript
const ForwardCompatSchema = z
  .object({
    requiredField: z.string(),
  })
  .passthrough(); // Preserves unknown keys
```

### 2.4 Field Deprecation Pattern

**Source:** MCP SDK types

```python
from typing_extensions import deprecated

class SamplingMessage(BaseModel):
    role: Role
    content: TextContent | ImageContent

    @deprecated("Use 'modelPreferences' instead")
    model_hints: list[str] | None = None
```

**TypeScript with JSDoc:**

```typescript
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  /** @deprecated Use `voicePreferences` instead */
  voice: z.string().optional(),
  voicePreferences: VoicePreferencesSchema.optional(),
});
```

---

## 3. Recommended Patterns for content-machine

### 3.1 Schema Version Field

Every JSON output includes a version field:

```typescript
// src/common/schemas/version.ts
export const SCHEMA_VERSION = '2026-01-04' as const;

export function withVersion<T extends z.ZodObject<any>>(schema: T) {
  return schema.extend({
    _schemaVersion: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
  });
}

// Usage
const ScriptSchema = withVersion(
  z.object({
    scenes: z.array(SceneSchema).min(1),
    reasoning: z.string(),
  })
);
```

### 3.2 Version Registry

```typescript
// src/common/schemas/registry.ts
export const SCHEMA_VERSIONS = {
  current: '2026-01-04',
  supported: ['2026-01-04'],
  deprecated: [] as string[],
} as const;

export function isVersionSupported(version: string): boolean {
  return (
    SCHEMA_VERSIONS.supported.includes(version) || SCHEMA_VERSIONS.deprecated.includes(version)
  );
}
```

### 3.3 Two-Tier Validation

```typescript
// FLEXIBLE schema for LLM output (tolerant parsing)
const LLMScriptOutputFlexible = z
  .object({
    scenes: z
      .array(
        z.object({
          text: z.string(),
          duration: z.number().optional().default(5),
        })
      )
      .transform((scenes) => scenes.filter((s) => s.text.length > 0)),
  })
  .passthrough(); // Allow unknown fields

// STRICT schema for internal pipeline
const ScriptOutputStrict = z.object({
  _schemaVersion: z.literal(SCHEMA_VERSION),
  scenes: z.array(
    z.object({
      text: z.string().min(1),
      duration: z.number().positive(),
      voiceId: z.string(),
    })
  ),
});

// Migration function
function migrateToStrict(flexible: z.infer<typeof LLMScriptOutputFlexible>) {
  return ScriptOutputStrict.parse({
    _schemaVersion: SCHEMA_VERSION,
    scenes: flexible.scenes.map((s) => ({
      ...s,
      voiceId: s.voiceId ?? 'default-voice',
      duration: s.duration ?? 5,
    })),
  });
}
```

### 3.4 Migration System

```typescript
interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (data: unknown) => unknown;
}

const migrations: SchemaMigration[] = [
  {
    fromVersion: '2026-01-04',
    toVersion: '2026-02-01',
    migrate: (data: any) => ({
      ...data,
      _schemaVersion: '2026-02-01',
      // Add new field with default
      audioSettings: data.audioSettings ?? { volume: 1.0 },
    }),
  },
];

function migrateSchema(data: unknown, targetVersion: string): unknown {
  let current = data as any;
  let currentVersion = current._schemaVersion;

  while (currentVersion !== targetVersion) {
    const migration = migrations.find((m) => m.fromVersion === currentVersion);
    if (!migration) {
      throw new Error(`No migration path from ${currentVersion} to ${targetVersion}`);
    }
    current = migration.migrate(current);
    currentVersion = migration.toVersion;
  }

  return current;
}
```

### 3.5 Loading with Migration

```typescript
async function loadScript(filePath: string): Promise<Script> {
  const raw = JSON.parse(await fs.readFile(filePath, 'utf-8'));

  // Check version
  const version = raw._schemaVersion ?? 'legacy';

  if (version === 'legacy') {
    console.warn(`Warning: ${filePath} has no schema version, assuming legacy format`);
    return migrateFromLegacy(raw);
  }

  if (!isVersionSupported(version)) {
    throw new Error(
      `Unsupported schema version: ${version}. Supported: ${SCHEMA_VERSIONS.supported.join(', ')}`
    );
  }

  if (version !== SCHEMA_VERSIONS.current) {
    console.log(`Migrating ${filePath} from ${version} to ${SCHEMA_VERSIONS.current}`);
    return migrateSchema(raw, SCHEMA_VERSIONS.current);
  }

  return ScriptSchema.parse(raw);
}
```

---

## 4. Example Schema Evolution

### Initial (v2026-01-04)

```typescript
const ScriptSchemaV1 = z.object({
  _schemaVersion: z.literal('2026-01-04'),
  scenes: z.array(
    z.object({
      text: z.string(),
      visualDirection: z.string(),
    })
  ),
});
```

### Adding Optional Field (v2026-02-01)

```typescript
const ScriptSchemaV2 = ScriptSchemaV1.extend({
  _schemaVersion: z.literal('2026-02-01'),
  scenes: z.array(
    z.object({
      text: z.string(),
      visualDirection: z.string(),
      animation: z.enum(['fade', 'slide', 'none']).optional(), // NEW
    })
  ),
});

// Migration: old files work without animation field
```

### Deprecating Field (v2026-03-01)

```typescript
const ScriptSchemaV3 = z.object({
  _schemaVersion: z.literal('2026-03-01'),
  scenes: z.array(
    z.object({
      text: z.string(),
      visualDirection: z.string(),
      animation: z.enum(['fade', 'slide', 'none']).optional(),
      /** @deprecated Use visualDirection instead */
      imagePrompt: z.string().optional(), // DEPRECATED
    })
  ),
});

// Migration: copy imagePrompt to visualDirection if visualDirection empty
```

---

## 5. Implementation Recommendations

| Pattern                             | Priority | Rationale                     |
| ----------------------------------- | -------- | ----------------------------- |
| Version field in all outputs        | P0       | Foundation for migrations     |
| Date-based versioning               | P0       | Clear, sortable, unambiguous  |
| Two-tier validation                 | P1       | LLM flexibility + type safety |
| Migration system                    | P1       | Backwards compatibility       |
| `.passthrough()` for forward compat | P2       | Future-proofing               |
| Deprecation warnings                | P2       | Smooth transitions            |

---

## 6. CLI Integration

```bash
# Migrate old project to current schema
cm migrate project/

# Check schema versions in project
cm status project/
# Output:
# script.json: v2026-01-04 (current)
# visuals.json: v2025-12-01 (needs migration)

# Force migration with backup
cm migrate project/ --backup
```

---

## 7. References

- [vendor/mcp/python-sdk/src/mcp/shared/version.py](../../../vendor/mcp/python-sdk/src/mcp/shared/version.py) — Protocol versioning
- [templates/vidosy/src/shared/zod-schema.ts](../../../templates/vidosy/src/shared/zod-schema.ts) — Zod patterns
- [vendor/mcp/python-sdk/src/mcp/types.py](../../../vendor/mcp/python-sdk/src/mcp/types.py) — Forward compatibility
- [SECTION-SCHEMAS-VALIDATION-20260104.md](../sections/SECTION-SCHEMAS-VALIDATION-20260104.md) — Validation patterns
