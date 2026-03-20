# Story: Yarn Color Stitch Boxes & Colorwork Parsing Fixes

**Status:** Done
**Priority:** Medium
**Depends on:** [Per-Stitch Yarn Color Support](./archive/per-stitch-color-support.md), [Color-Only Stitch Parsing](./archive/color-only-stitch-parsing.md), [RS/WS Side Indicator](./archive/rs-ws-side-indicator.md)
**Estimated Scope:** ~5 files modified

---

## Problem

After the color-only stitch parsing story landed, colorwork patterns with repeat syntax like `(Green) x 104` and color-only tokens like `White112` still failed to parse correctly. Multiple issues compounded:

1. The repeat regex required digits immediately after `x` — `(Green) x 104` (with space) failed silently.
2. The per-line row loop only matched `Round`, not `Row`, forcing a lossy single-line fallback that bled trailing characters between rows.
3. The prefix-stripping regex in `extractStitches` was `^`-anchored and failed when lines started with direction arrows (`←`/`→`) or other non-alphanumeric characters.
4. `normalizeStitchCode` only stripped `[.,;:!?]` from token ends — unicode arrows and other delimiters passed through.
5. Multi-repeat colorwork rows (e.g., `White2, (Green) x 2, White, (Green) x 102, White`) created a flat array of raw repeat strings that the rendering couldn't properly display.
6. Stitch boxes on both the pattern preview modal and the pattern page showed only "sc" with no color indication.
7. Per-stitch colors (`White`, `Green`) weren't detected by the color mapping section, which only looked for row-level patterns like `MC`, `CC`, `Color A`.
8. Stitch navigation arrows remained clickable past the end of available stitch blocks.

## What Was Done

### Colorwork Parsing Fixes (`AddPatternModal.vue`, `patternParser.js`)

- **Repeat regex space fix:** Changed `x(\d+)` to `x\s*(\d+)` in all repeat regexes (3 locations in AddPatternModal, 2 in PatternPreviewSection) so `(Green) x 104` parses correctly.
- **Per-line Row matching:** Extended the primary `lines.forEach` loop to match `(?:Round|Row)\s+(\d+)` instead of only `Round (\d+)`. Each row is now bounded by its line — no more cross-row character bleed from the single-line normalization fallback.
- **Prefix strip tolerates leading junk:** Changed the prefix regex from `^(?:Round|Row)...` to `^.*?(?:Round|Row)...` so leading arrows, bullets, or other characters before the row keyword are consumed.
- **Hardened token cleaning:** `normalizeStitchCode` now strips all non-alphanumeric/non-`#` characters from both ends of a token: `code.replace(/^[^a-zA-Z0-9#]+/, '').replace(/[^a-zA-Z0-9]+$/, '')`. Handles arrows, semicolons, pipes, etc.
- **Single-token repeat expansion:** When a repeat contains a single color-only token (e.g., `(Green) x 104`), it's expanded inline to `104sc:Green` instead of preserved as a raw repeat string. Multi-stitch repeats like `(1sc, 1inc) x 6` still use the structured repeat format. This makes colorwork rows render as clean flat stitch arrays.

### Color Labels in Stitch Boxes (`PatternPreviewSection.vue`, `TextStitches.vue`)

- **Pattern preview modal:** Stitch boxes with a color show the color label as primary text and the stitch type in small text below. Stitches without color render unchanged. Uses `text-overflow: ellipsis` for long color names. Box size stays 40x40px.
- **Pattern page (TextStitches):** Same treatment in both the focused current-stitches view and the full row preview. When collapsed, shows `count + color` (e.g., "104 White") with tiny stitch type below. When expanded, shows just the color label since count is always 1.

### Per-Stitch Color Detection (`AddPatternModal.vue`)

- `detectColors()` now also scans parsed stitch arrays for color labels (via `getStitchColor`) and merges them into `detectedColors` alongside the existing row-level color detection. Colors like `White` and `Green` now appear in the color mapping UI automatically.

### Stitch Navigation Bounds (`StitchVisualization.vue`, `TextStitches.vue`)

- Added `totalBlocks` prop to `StitchVisualization` — the number of navigable code entries (blocks), distinct from `totalStitches` (the expanded individual stitch count).
- The next arrow's `:disabled` check and `nextStitches()` method now use `totalBlocks` instead of `totalStitches`. Row 1 with `White112` (1 block, 112 stitches) correctly disables the next arrow immediately.
- The progress indicator still shows the accurate expanded count ("1-112 of 112 stitches").
- `totalBlocks` respects the expand/collapse toggle.

### Yarn Color Backgrounds (`useColorMode.js`, all stitch components)

Previously descoped, now implemented. Stitch boxes with a yarn color annotation automatically use the yarn color as the box background instead of the stitch-type color.

- **New composable: `composables/useColorMode.js`** — provides `getStitchBoxStyle(stitch)` and `getStitchBoxClass(stitch)`. When a stitch has a yarn color, the style sets `backgroundColor` to the yarn hex, `color` to a contrast-safe value (dark or light via WCAG luminance), and `borderColor` to a slightly darkened version of the yarn color. When no yarn color is present, the stitch-type CSS class handles coloring as before.
- **`getContrastText(hex)`** — returns `#333` or `#fff` based on relative luminance for readable text on any background.
- **All stitch visualization components** (`TextStitches.vue`, `ColorBlockStitches.vue`, `SymbolStitches.vue`) and `PatternPreviewSection.vue` now use `getStitchBoxStyle` / `getStitchBoxClass` instead of hardcoded border-left logic.
- Stitch boxes still show the color label text and stitch type — the background color and the label reinforce each other.
- Stitches without a yarn color fall back to stitch-type coloring unchanged.

### Color chip spacing (`AddPatternModal.vue`)

- Added `margin-left: 4px` to `.color-chip` in the pattern analysis section so color swatches have proper spacing from the "Colors:" label and after comma separators.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `utils/patternParser.js` | Hardened `normalizeStitchCode` token cleaning |
| `composables/useColorMode.js` | New — yarn color background styles, contrast text, stitch box style/class helpers |
| `components/AddPatternModal.vue` | Repeat regex fix, per-line Row matching, prefix strip fix, single-token repeat expansion, per-stitch color detection, color chip spacing |
| `components/pattern/PatternPreviewSection.vue` | Yarn color backgrounds, color labels in stitch boxes, repeat regex fix |
| `components/pattern/stitches/TextStitches.vue` | Yarn color backgrounds, color labels in stitch boxes, `totalBlocks` computed |
| `components/pattern/stitches/ColorBlockStitches.vue` | Yarn color backgrounds |
| `components/pattern/stitches/SymbolStitches.vue` | Yarn color backgrounds |
| `components/pattern/stitches/StitchVisualization.vue` | `totalBlocks` prop, navigation bounds fix |
| `components/pattern/SwappableStitchVisualization.vue` | Cleaned up (toggle removed) |
