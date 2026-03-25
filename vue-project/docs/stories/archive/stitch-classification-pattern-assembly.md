# Story: Stitch Confirmation & Pattern Assembly

**Status:** Done
**Priority:** High
**Depends on:** Chart Grid Detection (Done), Starting Point Selection (Done), Model Training & Integration (Done)
**Leads to:** Pattern saved and viewable in all existing visualization modes

---

## Problem

After classification, we have ~4,400 cells each with a predicted stitch type and confidence score. But the model isn't perfect (96.8% accuracy means ~140 wrong predictions on a 4,400-cell chart). The user needs to verify and correct the results before they become a pattern.

Key insight: a 4,400-cell chart typically has only 5-8 unique stitch symbols. Instead of verifying 4,400 cells, the user verifies 5-8 legend entries.

---

## What Was Built

### Phase 1: Stitch Confirmation UI (Legend-Based Correction)

**`components/StitchConfirmation.vue`** — shown after classification completes, replaces chart preview (conditional render).

**Stitch Legend Panel:**
- Cells grouped by visual similarity using perceptual hash (average hash with binarization)
  - Cell images binarized to black/white before hashing (removes brightness/shade noise, captures only symbol shape)
  - Hamming distance threshold: 15 (~23% of 64 bits can differ)
  - Cells with the same symbol but different model predictions cluster together
  - Within each group, the model's most common prediction is the default label
- Each legend entry shows:
  - **Thumbnail**: representative cell image rendered to a 48×48 canvas
  - **Free text input with suggestions**: `<datalist>` provides 14 known stitch types as autocomplete, but user can type any custom stitch name (e.g., "bob", "puff", "shell")
  - **Cell count**: how many cells are in this group
  - **Confidence badge**: average confidence for the group (green/amber/red)
- Changing the stitch type on a legend entry updates all cells in that group at once
- Unknown / low-confidence groups highlighted with amber border
- Confirm button disabled until all groups have a non-empty stitch type assigned

**`composables/useStitchLegend.js`** — legend state management:
- `buildLegend(predictions, cellImages)`: computes hashes, groups by similarity, builds legend entries sorted by unknowns-first then cell count descending
- `updateGroupType(groupId, newType)`: bulk correction for a group
- `allGroupsAssigned`: computed check for no remaining unknowns
- `buildPatternRows(gridCells, gridDimensions, startCorner, rowDirection)`: applies confirmed types, orders via `assemblePatternRows()`, collapses consecutive identical stitches
- `collapseStitches()`: `["sc", "sc", "sc", "dc", "dc"]` → `["3sc", "2dc"]`

**`utils/imageHash.js`** — pure functions:
- `averageHash(image)`: downsample to 8×8, binarize at threshold 128, compute mean, generate 64-bit BigInt hash
- `hammingDistance(a, b)`: XOR + popcount on BigInts
- `groupBySimilarity(items, maxDistance)`: greedy grouping by hash distance

### Phase 2: Pattern Assembly

After user confirms legend, cells are assembled into the app's pattern format:
1. Confirmed stitch types applied to all cells via cell-to-group mapping
2. `assemblePatternRows()` orders cells by start corner + row direction
3. Consecutive identical stitches collapsed (e.g., `"5sc"`)
4. Row objects built matching existing format: `{ number, text, stitches, color: null, side: null }`
5. Emitted via `processing-complete` with `patternRows`

### Data Flow

```
Classification completes (predictions[])
  → Binarize cell images + compute perceptual hash
  → Group by hash similarity (hamming distance ≤ 15)
  → Show legend panel: one entry per group
  → User reviews/corrects stitch types (free text + suggestions)
  → User clicks Confirm
  → Apply confirmed types to all cells
  → assemblePatternRows() orders cells
  → Collapse consecutive stitches
  → Build row objects
  → Emit to AddPatternModal as patternRows
```

---

## Files Changed

| File | Action |
|------|--------|
| `components/StitchConfirmation.vue` | NEW — legend panel with grouped entries, free text input with datalist suggestions, thumbnail canvases, confidence badges, gated confirm button |
| `composables/useStitchLegend.js` | NEW — grouping by perceptual hash (threshold 15), legend state, bulk correction, pattern assembly with stitch collapsing |
| `utils/imageHash.js` | NEW — averageHash (with binarization), hammingDistance, groupBySimilarity |
| `components/FileUploader.vue` | MODIFY — show StitchConfirmation after classification, `onStitchConfirm` handler emits patternRows |

---

## Acceptance Criteria

### Stitch Confirmation
- [x] Cells grouped by visual similarity (perceptual hash with binarization, hamming distance ≤ 15)
- [x] Legend shows one entry per visual group: thumbnail, stitch type input, cell count, confidence
- [x] Free text input with datalist suggestions for all 14 known types + custom entry
- [x] Default selection is model's most common prediction for the group
- [x] Changing input updates all cells in that group
- [x] Unknown/low-confidence groups highlighted amber
- [x] Confirm button disabled until all groups assigned

### Pattern Assembly
- [x] Cells ordered by `assemblePatternRows()` using confirmed start corner + direction
- [x] Consecutive identical stitches collapsed (e.g., `"5sc"`)
- [x] Row objects match existing format: `{ number, text, stitches, color, side }`
- [x] Rows emitted via processing-complete with patternRows

### Integration
- [x] StitchConfirmation shown after classification in FileUploader flow
- [x] Full flow works: upload → grid editor → direction → classification → confirmation → pattern
