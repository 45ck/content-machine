# RQ-12: Remotion Licensing Requirements

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P0  
**Question:** What are Remotion's licensing terms for commercial use?

---

## 1. Problem Statement

Remotion is the core rendering engine. Understanding licensing is critical for:
- content-machine project licensing (MIT)
- Users deploying content-machine commercially
- Documentation requirements

---

## 2. Vendor Evidence

### 2.1 Remotion License Overview

**Source:** [vendor/remotion/LICENSE.md](../../../vendor/remotion/LICENSE.md) and [remotion.dev/license](https://remotion.dev/license)

Remotion uses a **dual license** model:

| Use Case | License | Cost |
|----------|---------|------|
| Individuals | Free | $0 |
| Companies ≤3 employees | Free | $0 |
| Non-profits | Free | $0 |
| Educational | Free | $0 |
| Evaluation | Free (unlimited time) | $0 |
| Companies >3 employees | Company License | $100+/month |

### 2.2 Free License Terms

**Explicitly Free:**
- Individual developers (personal projects)
- Companies with **3 or fewer employees** (total, not developers)
- Registered non-profit organizations
- Educational institutions
- Evaluation for any company (no time limit)

**Important:** The employee count is **total company size**, not project team size.

### 2.3 Company License Triggers

**You need a Company License if:**
- Your company has **more than 3 employees** AND
- You use Remotion in production

**NOT triggered by:**
- Revenue amount
- Number of renders
- Cloud vs local deployment
- Open-source vs closed-source

### 2.4 Company License Pricing

**Source:** [remotion.dev/pricing](https://remotion.dev/pricing)

| Tier | Employees | Price |
|------|-----------|-------|
| Starter | 4-10 | $100/month |
| Growth | 11-50 | $200/month |
| Scale | 51-100 | $300/month |
| Enterprise | 100+ | Custom |

**Note:** Pricing is per company, not per project or per seat.

### 2.5 Open-Source Project Implications

**For content-machine (MIT license):**

```markdown
# content-machine License Considerations

content-machine is MIT licensed. However, content-machine uses Remotion
for video rendering, which has its own licensing terms.

## Remotion License Requirements

If you use content-machine commercially:

1. **Individuals**: Free to use
2. **Companies ≤3 employees**: Free to use
3. **Companies >3 employees**: Requires Remotion Company License

See https://remotion.dev/license for full terms.

content-machine does NOT include a Remotion license. Users are responsible
for obtaining appropriate Remotion licensing based on their situation.
```

---

## 3. License Verification

### 3.1 What Remotion Checks

**Remotion does NOT have:**
- License key verification in code
- Phone-home licensing checks
- Render count limitations
- Time-bombed evaluation

**Remotion relies on:**
- Honor system
- License agreement acceptance
- Legal compliance

### 3.2 Source Code Availability

Remotion source code is fully available on GitHub. This is intentional:

> "We believe in transparency. The code is open for inspection, 
> but commercial use requires proper licensing."

---

## 4. Alternatives Analysis

If Remotion licensing is a concern, alternatives exist:

| Alternative | License | Quality | Effort |
|-------------|---------|---------|--------|
| FFmpeg direct | LGPL/GPL | Lower | High |
| MoviePy | MIT | Medium | Medium |
| Editly | MIT | Medium | Medium |
| Puppeteer + FFmpeg | Apache/LGPL | Lower | High |

**Recommendation:** Remotion's quality and ecosystem justify the licensing cost for companies >3 employees.

---

## 5. Documentation Requirements

### 5.1 README Notice

```markdown
## ⚠️ License Notice

content-machine uses [Remotion](https://remotion.dev) for video rendering.

**Remotion Licensing:**
- Free for individuals and companies ≤3 employees
- Companies with >3 employees require a [Remotion Company License](https://remotion.dev/license)

content-machine (MIT) does not include Remotion licensing. Ensure you have 
appropriate Remotion licensing for your use case.
```

### 5.2 Installation Warning

```typescript
// src/render/index.ts
const REMOTION_LICENSE_NOTICE = `
╔════════════════════════════════════════════════════════════════════╗
║  REMOTION LICENSE NOTICE                                           ║
║                                                                    ║
║  content-machine uses Remotion for video rendering.               ║
║                                                                    ║
║  • Individuals: Free                                               ║
║  • Companies ≤3 employees: Free                                    ║
║  • Companies >3 employees: Requires Remotion Company License       ║
║                                                                    ║
║  See: https://remotion.dev/license                                 ║
╚════════════════════════════════════════════════════════════════════╝
`;

export function showLicenseNotice(): void {
  if (process.env.REMOTION_LICENSE_ACKNOWLEDGED !== "true") {
    console.log(REMOTION_LICENSE_NOTICE);
  }
}
```

### 5.3 CI Check (Optional)

```yaml
# .github/workflows/license-check.yml
name: License Check

on: [push, pull_request]

jobs:
  check-licenses:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check dependencies
        run: npx license-checker --summary
        
      - name: Verify Remotion awareness
        run: |
          if ! grep -q "Remotion" README.md; then
            echo "ERROR: README must include Remotion license notice"
            exit 1
          fi
```

---

## 6. FAQ

### Q: Can I use content-machine for a SaaS product?

**A:** Yes, but if your company has >3 employees, you need a Remotion Company License.

### Q: Does render count affect licensing?

**A:** No. You can render unlimited videos. Licensing is based only on company size.

### Q: Can I modify Remotion's source code?

**A:** Yes, but modifications don't change licensing requirements.

### Q: Is evaluation time-limited?

**A:** No. You can evaluate Remotion for as long as you want before purchasing.

### Q: What if I'm a contractor for a large company?

**A:** The company employing you for the project needs the license.

---

## 7. Implementation Recommendations

| Action | Priority | Location |
|--------|----------|----------|
| Add README notice | P0 | README.md |
| Add license check to CLI | P1 | src/cli/index.ts |
| Document in installation guide | P1 | docs/guides/installation.md |
| Add to CONTRIBUTING.md | P2 | CONTRIBUTING.md |

---

## 8. References

- [vendor/remotion/LICENSE.md](../../../vendor/remotion/LICENSE.md) — License file
- [Remotion License Page](https://remotion.dev/license) — Official terms
- [Remotion Pricing](https://remotion.dev/pricing) — Company license pricing
- [Remotion FAQ](https://remotion.dev/docs/miscellaneous/license) — License FAQ
