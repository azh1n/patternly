# Story: Stitch Classification & Pattern Assembly

**Status:** Not Started
**Priority:** High
**Depends on:** Chart Grid Detection Improvements (Phase 6 — Done), Chart Starting Point & Row Direction Selection
**Leads to:** Pattern saved and viewable in all existing visualization modes

---

## Problem

After grid line confirmation and starting point selection, we have extracted individual cells from the chart image (`cv.Mat` per cell, with row/col position) and know the reading direction. But cells are just pixel data — no stitch type, no color. The user needs to go from "confirmed grid with direction" to "verified pattern with rows and stitches."

---

## Phase 1: Local Stitch Classification

Load a Roboflow-trained model in the browser via roboflow.js for client-side inference. No API calls, no rate limits — model downloaded once and cached.

- Load model on first use (lazy, cached after download)
- Convert each cell's `cv.Mat` to canvas → image data for inference
- Run inference locally per cell
- Return `{ stitchType, confidence }` per cell
- Progress feedback during batch classification (e.g., "Classifying cell 50/2500...")
- Cells below confidence threshold marked as `"unknown"`

**Cell image considerations:**
- Extracted cells are small (~17x19 pixels for typical charts)
- May need upsampling before inference (Roboflow models typically expect larger input)
- Grayscale vs color handling depends on model training

---

## Phase 2: Stitch Confirmation UI (Legend-Based Correction)

After classification, show two panels:

### Panel A: Stitch Legend

- List of unique stitch types detected (including `"unknown"`)
- Each entry shows: thumbnail (sample cell image), predicted stitch type, count of cells with this type
- User can change the stitch type for any legend entry → **all cells of that type update at once**
- `"unknown"` entries highlighted for attention
- Groups formed by **visual similarity** (perceptual hash on cell images), so even if the model produces different wrong labels for the same symbol, they cluster together
- One correction per unique symbol, not per cell — fixing 1 legend entry can fix hundreds of cells

### Panel B: Chart Grid Preview

- The chart image with stitch type labels overlaid on each cell
- Colored by stitch type for visual verification
- Clicking a cell selects its legend entry (and vice versa)
- Low-confidence cells have a visual indicator (border highlight or icon)

### Grouping Strategy

Perceptual hashing for similarity grouping:
- Compute a perceptual hash (average hash or pHash) for each cell image
- Group cells whose hashes are within a hamming distance threshold
- Within each group, use the model's most common prediction as the default label
- If the model labeled 200 cells as "sc" and 5 similar-looking cells as "dc", the group shows "sc" with a note about the 5 outliers

---

## Phase 3: Color Detection

- For each cell, analyze dominant non-white/non-black color
- Cluster similar colors into a palette (e.g., k-means on cell center pixels)
- Auto-detect if chart is grayscale (skip color extraction)
- User can name/adjust palette colors in the legend
- Colors attached to stitches in the final pattern (e.g., `"sc:green"`)

---

## Phase 4: Pattern Assembly

Convert confirmed cells into pattern rows using the starting point and row direction from the previous story:

1. **Row ordering** — starting corner determines which grid row is Row 1
2. **Read direction** — starting corner + alternating/same determines left-to-right vs right-to-left per row
3. **Stitch collapsing** — consecutive identical stitches in a row collapsed (`sc, sc, sc, sc, sc` → `"5sc"`)
4. **Color appending** — where color detected, append to stitch code (`"5sc:green"`)
5. **Output format** — same as `patternParser.js`: array of row objects with `{ number, stitches, color, side }`
6. **Integration** — feed assembled rows into `AddPatternModal`'s pattern creation flow with `sourceFormat: 'chart'`
7. **Chart image reference** — store the original chart image URL with the pattern for future reference

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Classification model | roboflow.js (browser-local) | Free, no API costs, no rate limits, model cached after first download |
| Correction approach | Legend-based bulk correction | One fix per unique symbol vs. per-cell — drastically reduces manual work |
| Similarity grouping | Perceptual hash (pHash) | Simple, no ML needed, handles slight rendering variations between cells of the same symbol |
| Color detection | Dominant color + clustering | Handles charts with yarn color indicators; gracefully skips B&W charts |
| Pattern format | Same as patternParser.js output | Reuses all existing visualization components without changes |

---

## Files (Estimated)

| File | Action |
|------|--------|
| `services/stitchClassificationService.js` | NEW — load Roboflow model, batch classify cells, return predictions |
| `components/StitchConfirmation.vue` | NEW — legend panel + grid preview with stitch labels |
| `composables/useStitchLegend.js` | NEW — legend state, grouping by similarity, bulk correction |
| `utils/imageHash.js` | NEW — perceptual hash computation for cell similarity |
| `utils/colorDetection.js` | NEW — dominant color extraction from cell images, palette clustering |
| `components/FileUploader.vue` | MODIFY — wire classification after grid confirm + direction selection |
| `components/AddPatternModal.vue` | MODIFY — accept chart-derived pattern rows, save with sourceFormat: 'chart' |

---

## Acceptance Criteria

### Classification
- [ ] Roboflow model loads in browser via roboflow.js and runs locally
- [ ] All cells classified with stitchType + confidence
- [ ] Progress feedback during classification
- [ ] Cells below confidence threshold marked as "unknown"

### Stitch Confirmation
- [ ] Unknown/low-confidence cells grouped by visual similarity (perceptual hash)
- [ ] Legend UI shows unique stitch types with sample thumbnail and count
- [ ] Changing a legend entry updates all cells of that type
- [ ] Chart grid preview shows stitch labels overlaid on cells
- [ ] Clicking cell highlights its legend entry (and vice versa)

### Color
- [ ] Dominant color extracted from cell images
- [ ] Similar colors clustered into palette
- [ ] Grayscale charts auto-detected (color step skipped)
- [ ] User can name/adjust palette colors

### Pattern Assembly
- [ ] Cells assembled into rows using starting corner + row direction
- [ ] Consecutive identical stitches collapsed (e.g., `"5sc"`)
- [ ] Color appended where present (e.g., `"5sc:green"`)
- [ ] Output matches patternParser.js format
- [ ] Pattern saved to Firestore with sourceFormat: 'chart'
- [ ] Pattern viewable in all existing visualization modes (text, symbol, color block)
