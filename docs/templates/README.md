# Documentation Templates

**All documentation MUST include `YYYYMMDD` date suffix in filename.**

---

## Available Templates

| Template | Use For | Location |
|----------|---------|----------|
| `FEATURE.template.md` | Feature specifications | `docs/templates/` |
| `BUG.template.md` | Bug reports | `docs/templates/` |
| `ADR.template.md` | Architecture decisions | `docs/templates/` |
| `GUIDE.template.md` | How-to guides | `docs/templates/` |
| `INVESTIGATION.template.md` | Research/investigations | `docs/templates/` |
| `POSTMORTEM.template.md` | Incident postmortems | `docs/templates/` |
| `TUTORIAL.template.md` | Step-by-step tutorials | `docs/templates/` |

---

## Naming Conventions

### Feature Specs
**Format:** `feature-[name]-YYYYMMDD.md`

**Examples:**
- `feature-mcp-reddit-connector-20260102.md`
- `feature-caption-rendering-20260115.md`

**Location:** `docs/features/`

### Bug Reports
**Format:** `bug-NNN-[description]-YYYYMMDD.md`

**Examples:**
- `bug-001-whisper-timestamp-drift-20260110.md`
- `bug-002-ffmpeg-memory-leak-20260115.md`

**Location:** `docs/bugs/`

### Architecture Decision Records (ADRs)
**Format:** `adr-NNN-[decision]-YYYYMMDD.md`

**Examples:**
- `adr-001-use-remotion-for-rendering-20260102.md`
- `adr-002-mcp-server-architecture-20260105.md`

**Location:** `docs/architecture/`

### Guides
**Format:** `guide-[topic]-YYYYMMDD.md`

**Examples:**
- `guide-setup-playwright-20260102.md`
- `guide-add-mcp-connector-20260110.md`

**Location:** `docs/guides/`

### Investigations
**Format:** `investigation-[topic]-YYYYMMDD.md`

**Examples:**
- `investigation-tts-latency-20260108.md`
- `investigation-remotion-performance-20260112.md`

**Location:** `docs/investigations/`

### Postmortems
**Format:** `incident-[name]-YYYYMMDD.md`

**Examples:**
- `incident-render-pipeline-failure-20260120.md`
- `incident-mcp-server-crash-20260125.md`

**Location:** `docs/postmortems/`

### Tutorials
**Format:** `tutorial-[topic]-YYYYMMDD.md`

**Examples:**
- `tutorial-your-first-video-20260102.md`
- `tutorial-custom-captions-20260110.md`

**Location:** `docs/tutorials/`

---

## Diátaxis Framework

All docs follow the [Diátaxis](https://diataxis.fr/) framework:

| Type | Purpose | Audience | When to Use |
|------|---------|----------|-------------|
| **Tutorial** | Learning-oriented | Beginner | "Teach me to make my first X" |
| **How-To Guide** | Task-oriented | Practitioner | "How do I accomplish Y?" |
| **Reference** | Information-oriented | Lookups | "What are the API parameters?" |
| **Explanation** | Understanding-oriented | Context | "Why does Z work this way?" |

---

## Documentation Workflow

### 1. Choose Template

Pick the appropriate template from `docs/templates/`

### 2. Copy Template

```powershell
# Example: Creating a feature spec
cp docs/templates/FEATURE.template.md docs/features/feature-my-new-feature-20260102.md
```

### 3. Fill Template

Replace all placeholders:
- `[Feature Name]` → Actual feature name
- `YYYY-MM-DD` → Actual date
- `[Description]` → Your content

### 4. Link Related Docs

Cross-reference:
- Related ADRs
- Related tasks
- Related research
- Related bugs (if fix)

### 5. Update Index

If adding new category, update `docs/README.md`

---

## Writing Style

### Be Concise
❌ "It is important to note that you should always make sure to validate..."
✅ "Always validate..."

### Be Specific
❌ "May cause performance issues"
✅ "Adds 200ms latency to render pipeline"

### Use Active Voice
❌ "The video is rendered by the Remotion engine"
✅ "Remotion renders the video"

### Use Examples
Always include code examples, command examples, or screenshots.

### Use Headings
Break content into scannable sections with clear headings.

---

## Cross-Referencing

**Always link related docs:**

```markdown
## Related

**ADRs:**
- [ADR-001: Use Remotion for Rendering](../architecture/adr-001-use-remotion-20260102.md)

**Tasks:**
- [TASK-005: Implement caption system](../../tasks/in_progress/TASK-005-feature-captions-20260110.md)

**Research:**
- [vidosy JSON config pattern](../research/12-vidosy.md)
```

---

## Review Checklist

Before committing documentation:

- [ ] Filename includes YYYYMMDD date
- [ ] Used appropriate template
- [ ] All sections filled (no [placeholders])
- [ ] Terminology matches docs/guides/guide-ubiquitous-language-20260110.md
- [ ] Code examples tested and work
- [ ] Cross-references added
- [ ] Spelling/grammar checked
- [ ] Markdown renders correctly
- [ ] Added to appropriate directory

---

**Last Updated:** 2026-01-02
