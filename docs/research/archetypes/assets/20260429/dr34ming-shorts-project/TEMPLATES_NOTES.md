# Template Evolution & A/B Testing Strategy

## 📝 Note

We want to:
1. **Keep generated templates** - Save all AI-generated scenes
2. **A/B test** - Test different versions against each other
3. **Evolve over time** - Iterate on what works best

## 🗂️ Template Organization

### Current Generated Templates:
- `innovation_scene.py` - Vertical 9:16, leader/follower diverging paths theme
- `innovation_horizontal.py` - Horizontal 16:9, wide cinematic composition

### Template Characteristics to Track:

**Visual Style:**
- Color palette (gold/blue/gray vs other combinations)
- Animation types (particles, light rays, path animations)
- Camera work (static vs dynamic)
- Spatial composition approach

**Performance Metrics to A/B Test:**
- Watch time
- Engagement rate
- Completion rate
- Shares/saves

## 🧪 A/B Testing Framework

### What to Test:
1. **Composition styles** for same content
   - Vertical flow vs radial
   - Static camera vs dynamic panning
   - Minimal vs rich particle effects

2. **Color schemes**
   - Warm (gold/orange) vs cool (blue/purple)
   - High contrast vs subtle gradients
   - Monochrome vs multi-color

3. **Pacing**
   - Quick cuts vs smooth transitions
   - Build-up duration
   - Impact moments

4. **Camera movement**
   - Static composition
   - Pan and scan
   - Zoom in/out
   - Tracking shots

## 📊 Template Evolution Process

### Phase 1: Generate Variants
```bash
# Generate multiple versions of same content
for i in {1..5}; do
  python ai_scene_generator.py transcript.json "variant_${i}.py"
done
```

### Phase 2: Render All
```bash
# Batch render all variants
for file in variant_*.py; do
  manim -qh "$file" AIGeneratedScene
done
```

### Phase 3: Upload & Test
- Upload all variants
- Track performance metrics
- Identify winners

### Phase 4: Evolve
- Keep winning patterns
- Modify prompt to emphasize successful elements
- Generate next iteration

## 💾 Template Versioning

### Naming Convention:
```
{theme}_{format}_{variant}_v{version}.py

Examples:
- innovation_vertical_diverging_v1.py
- innovation_horizontal_cinematic_v1.py
- motivation_vertical_rising_v2.py
```

### Version Control:
```bash
# Save successful templates
mkdir -p templates/successful
cp innovation_horizontal.py templates/successful/innovation_horizontal_v1.py

# Archive all generated
mkdir -p templates/archive
cp *.py templates/archive/
```

## 🎯 Template Categories to Build

### 1. Contrast/Comparison Templates
- Leader vs Follower (current)
- Before vs After
- Problem vs Solution
- Old Way vs New Way

### 2. Growth/Progress Templates
- Rising graphs
- Ascending paths
- Building blocks
- Expanding circles

### 3. Flow/Sequence Templates
- Step-by-step arrows
- Timeline progressions
- Cascade effects
- Domino sequences

### 4. Cyclical Templates
- Continuous loops
- Circular flows
- Recurring patterns
- Spiral movements

### 5. Inspirational Templates
- Light reveals
- Particle bursts
- Dramatic zooms
- Glow effects

## 🔄 Iteration Loop

```
Generate → Render → Test → Analyze → Refine → Generate
```

### Metrics to Track:
- Which visual metaphors resonate most
- Optimal animation duration
- Best color combinations
- Most engaging camera movements
- Ideal pacing rhythm

## 🚀 Next Steps

1. Create `templates/` directory structure
2. Implement batch generation script
3. Add metadata tracking to generated files
4. Build performance analytics dashboard
5. Create "best of" compilation of winning patterns
6. Feed insights back into AI prompt engineering

## 📈 Success Patterns to Watch For

- Do horizontal or vertical perform better?
- Do dynamic camera movements increase engagement?
- What's optimal particle density?
- How much text vs visual works best?
- Fast vs slow pacing preference?
- Minimal vs elaborate styles?

## 💡 Template Remixing

Once we have successful templates:
- Mix and match successful elements
- Combine winning color schemes with winning compositions
- Apply successful camera work to different themes
- Port vertical winners to horizontal format and vice versa
