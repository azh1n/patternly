# Story: Chart Cell Color Detection

**Status:** Planning
**Priority:** High
**Depends on:** Chart Grid Detection (grid detection + stitch classification pipeline must be working)
**Estimated Scope:** ~4 files modified, 1 new utility file

---

## Problem

When a user uploads a crochet chart image, the pipeline detects the grid, extracts cells, and classifies stitch types — but ignores color entirely. Crochet charts use color to encode which yarn to use:

- **Mosaic / row-color patterns**: Each row is a single color. Typically 2 colors alternating (Row A = white, Row B = black).
- **Tapestry / colorwork patterns**: Each cell can be a different color. The chart is a pixel-art-style grid where color carries the pattern information.

Currently there's no way to capture this. The stitch confirmation dialog only handles stitch types, and `buildPatternRows` outputs `color: null` for every row.

---

## Goal

1. Add a **color mode toggle** to the stitch confirmation dialog: "Colors by row" vs "Colors by stitch".
2. **Extract the dominant color** from each cell image using pixel math (no ML needed).
3. **Build a color palette** from the extracted colors and let the user name each color (default to hex value).
4. In **"Colors by row"** mode: determine the dominant color per row, group rows by color, and show one editable color input per group (e.g., "Row A: #ffffff [___]", "Row B: #333333 [___]").
5. In **"Colors by stitch"** mode: show the full extracted palette with editable names. Each cell in the confirmation view shows its detected color as a background tint.
6. Store colors using the existing `stitch:color` suffix format so downstream rendering works without changes.

---

## Design

### Color Mode Toggle

At the top of `StitchConfirmation.vue`, above the legend list:

```
Color Mode:  [● Colors by stitch]  [○ Colors by row]
```

Default: "Colors by stitch".

### Color Extraction

For each cell image (already available as RGBA `Uint8ClampedArray`):

1. Iterate over pixels, skip dark pixels (R+G+B < 80) — these are grid lines / stitch symbols.
2. Compute the average color of remaining pixels.
3. Quantize to reduce noise: round each channel to the nearest 16 (gives 16³ = 4096 possible colors).
4. Result: one hex color per cell.

### Palette Extraction

Cluster cell colors into groups:

1. Collect all cell colors.
2. Sort by frequency.
3. Merge colors within a perceptual distance threshold (e.g., Euclidean RGB distance < 50) into the same palette entry.
4. Result: 2-8 palette entries, each with a hex value and a count.

### Colors by Stitch UI

Below the color mode toggle, show the palette:

```
Color Palette:
  [■ #ffffff] [white________]  (420 cells)
  [■ #4a3728] [brown________]  (312 cells)
  [■ #d4a574] [tan__________]  (186 cells)
```

Each entry: a color swatch (small square with the hex fill), the hex value as default text in an editable input, and the cell count. The user can type "white", "MC", "Color A", etc. to replace the hex.

### Colors by Row UI

Below the color mode toggle, show per-row-group colors:

1. For each row, determine its dominant color (most common cell color in that row).
2. Group rows by dominant color.
3. Show one input per group:

```
Row Colors:
  [■ #ffffff] [white________]  (Rows 1, 3, 5, 7, ...)
  [■ #333333] [black________]  (Rows 2, 4, 6, 8, ...)
```

### Data Flow

When the user confirms:

- **Colors by stitch**: Each stitch in the collapsed output gets the color suffix. `"3sc"` becomes `"3sc:white"` if those 3 sc cells were all white. If consecutive stitches share the same type but different colors, they don't collapse (e.g., `sc:white, sc:brown` stays separate, not `2sc`).
- **Colors by row**: Each row object gets a `.color` property set to the user's color name. Individual stitches don't get color suffixes since the whole row is one color.

### What Gets Stored

The pattern rows emitted from `StitchConfirmation` already have `color` and `stitches` fields. Colors by row sets `row.color`. Colors by stitch embeds color in the stitch strings via the existing `:color` suffix convention. No schema changes needed.

---

## Implementation Plan

### Phase 1: Color extraction utility — `utils/colorExtraction.js`

```js
/**
 * Extract the dominant color from a cell image.
 * Skips dark pixels (grid lines / symbols) and returns the average of the rest.
 *
 * @param {{ width: number, height: number, data: Uint8ClampedArray }} cellImage
 * @returns {string} Hex color (e.g., '#ffffff')
 */
export function extractCellColor(cellImage) { ... }

/**
 * Build a color palette from an array of hex colors.
 * Merges similar colors (RGB distance < threshold) and returns
 * sorted by frequency.
 *
 * @param {string[]} colors - Hex color per cell
 * @param {number} [mergeThreshold=50] - Max RGB Euclidean distance to merge
 * @returns {{ hex: string, count: number, cellIndices: number[] }[]}
 */
export function buildColorPalette(colors, mergeThreshold = 50) { ... }

/**
 * Determine the dominant color for each row.
 *
 * @param {string[]} cellColors - Hex color per cell (flat, row-major order)
 * @param {{ rows: number, cols: number }} gridDimensions
 * @returns {{ hex: string, rows: number[] }[]} - One entry per unique row color
 */
export function extractRowColors(cellColors, gridDimensions) { ... }
```

### Phase 2: Integrate color extraction into `useStitchLegend.js`

- After `buildLegend()` runs, also extract colors from all cell images.
- Store `cellColors` (hex array, one per cell) as reactive state.
- Add `colorPalette` and `rowColors` computed properties.
- Add `colorMode` ref ('stitch' | 'row'), `paletteNames` ref (map of hex → user name).
- Modify `buildPatternRows()`:
  - If colorMode is 'stitch': append `:colorName` suffix to each stitch before collapsing. Modify `collapseStitches` to treat `sc:white` and `sc:brown` as different types.
  - If colorMode is 'row': set `row.color` to the user's name for that row's dominant color.

### Phase 3: UI in `StitchConfirmation.vue`

- Add color mode toggle (radio buttons) at top.
- Add palette section (visible in both modes):
  - "Colors by stitch": show full palette with editable names.
  - "Colors by row": show row color groups with editable names.
- Each palette entry: swatch, hex default, editable text input, cell/row count.

### Phase 4: Tests — `utils/__tests__/colorExtraction.spec.js`

- `extractCellColor` returns correct hex for solid-color cells.
- `extractCellColor` skips dark pixels.
- `buildColorPalette` merges similar colors.
- `buildColorPalette` sorts by frequency.
- `extractRowColors` groups rows by dominant color.

---

## Edge Cases

- **All-white or all-black chart**: Palette has 1 entry. Color mode still works, just trivial.
- **Chart with stitch symbols drawn in color**: The symbol pixels may be a different color than the fill. The dark-pixel skip threshold (R+G+B < 80) handles black symbols. Colored symbols on white background would be picked up — may need a more sophisticated foreground/background separation for unusual charts.
- **Gradients or anti-aliased edges**: Quantization (round to nearest 16) and palette merging (distance < 50) should absorb these.
- **User doesn't want colors**: They can just confirm without changing anything — the default hex values still work as color identifiers, and the existing rendering system handles hex values.
- **Colors by stitch prevents collapsing**: `sc:white, sc:white, sc:brown` → `2sc:white, sc:brown` (not `3sc`). The collapse function needs to consider the color suffix as part of the identity.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `utils/colorExtraction.js` | NEW — `extractCellColor`, `buildColorPalette`, `extractRowColors` |
| `utils/__tests__/colorExtraction.spec.js` | NEW — unit tests |
| `composables/useStitchLegend.js` | UPDATE — add color extraction, `colorMode`, `paletteNames`, modify `buildPatternRows` for color suffixes |
| `components/StitchConfirmation.vue` | UPDATE — add color mode toggle, palette UI, per-row color UI |

---

## Acceptance Criteria

- [ ] Color mode toggle visible at top of stitch confirmation dialog
- [ ] Default mode is "Colors by stitch"
- [ ] Each cell's dominant color is extracted from its image data (dark pixels skipped)
- [ ] Similar colors merged into palette entries (RGB distance < 50)
- [ ] "Colors by stitch" mode shows palette with editable name inputs (defaulting to hex)
- [ ] "Colors by row" mode shows row color groups with editable name inputs (defaulting to hex)
- [ ] User can rename palette colors (e.g., hex → "white", "MC", "Color A")
- [ ] In "Colors by stitch" mode, confirmed stitches include color suffix (e.g., `2sc:white`)
- [ ] In "Colors by stitch" mode, consecutive same-type stitches with different colors don't collapse
- [ ] In "Colors by row" mode, each row gets a `.color` property matching the user's name
- [ ] Existing charts without color detection are unaffected (no regression)
- [ ] Color extraction unit tests pass
- [ ] All existing tests pass
