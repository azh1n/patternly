# Story: Chart Starting Point & Row Direction Selection

**Status:** Done
**Priority:** High
**Depends on:** Chart Grid Detection Improvements (Phase 6 — Done)
**Blocks:** Stitch Classification & Pattern Assembly

---

## Problem

Crochet charts can be read from any of the 4 corners, and rows can alternate direction (flat work) or go the same direction (in the round). The system needs to know these before it can map grid cells to pattern rows in the correct order. This is a user selection step — auto-detection is unreliable because conventions vary by designer and region.

---

## What Was Built

### Part 1: UI — ChartDirectionSelector Component

New component (`components/ChartDirectionSelector.vue`) shown after the user confirms grid lines but before stitch classification runs.

**4×4 Mini Schematic Grid:**
- A 4×4 abstract grid representing the chart (not the real chart image)
- 4 clickable corner indicators showing "1" — user clicks a corner to set where Row 1, Stitch 1 begins
- On selection, cells animate in row-by-row (staggered 150ms per row) showing row numbers and directional arrows (← or →) indicating read direction
- No corner is pre-selected — the user must make a deliberate choice
- Selected corner highlighted with the app's green accent color

**Row direction toggle:**
- Two-button toggle: "Flat (alternating)" and "In the round"
- Default: alternating
- Changing the toggle re-triggers the animation so the user sees the updated traversal pattern

**Gating:**
- Continue button is hidden until a corner is selected (not disabled — completely absent)
- Continue button animates in with a fade-up when it appears
- Row direction defaults to alternating, so only the corner blocks progress

**Flow integration:**
1. User uploads chart → grid detection → grid line editor (existing)
2. User confirms grid lines → cell extraction runs
3. Fullscreen exits, direction selector replaces the chart preview (conditional render, not overlay — avoids breaking fullscreen CSS positioning)
4. User selects corner, optionally changes row direction, sees animated preview
5. User clicks Continue → `processing-complete` emitted with `startCorner` and `rowDirection` alongside cell data

**Key design decision:** The direction selector conditionally replaces the chart view (`v-if`/`v-else-if`) rather than overlaying on top of it. An overlay approach required `position: relative` on `.chart-container` which broke the fullscreen absolute positioning chain. The conditional render is simpler and avoids CSS conflicts.

### Part 2: Row Assembly Utility

Pure function `assemblePatternRows()` added to `utils/gridAnalysis.js`. Reorders extracted grid cells into pattern rows based on the user's selection — no image reprocessing, just index remapping.

**Function:** `assemblePatternRows(cells, gridDimensions, startCorner, rowDirection)`

**Logic:**
- Groups cells by physical row (image coordinates: row 0 = top, col 0 = left)
- If starting from bottom: reverses row order so last physical row becomes Row 1
- For each pattern row, determines read direction based on start corner + row index + direction mode
- Reverses column order within rows that read right-to-left
- Returns array of pattern rows, each an ordered array of cells with all original properties preserved

| Start Corner | Row 1 (physical) | Row 1 reads | Row 2 reads (alternating) | Row 2 reads (same) |
|-------------|-------------------|-------------|--------------------------|---------------------|
| bottom-right | last row | right → left | left → right | right → left |
| bottom-left | last row | left → right | right → left | left → right |
| top-right | first row | right → left | left → right | right → left |
| top-left | first row | left → right | right → left | left → right |

### Data Model

Passed forward via `processing-complete` event alongside existing cell data. Not persisted independently — becomes part of the pattern when saved.

```js
{
  startCorner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
  rowDirection: 'alternating' | 'same'
}
```

---

## Files Changed

| File | Action |
|------|--------|
| `components/ChartDirectionSelector.vue` | NEW — 4×4 schematic grid with clickable corners, animated row traversal preview, row direction toggle, gated Continue button |
| `components/FileUploader.vue` | MODIFY — import ChartDirectionSelector; add `showDirectionSelector` and `pendingCellResult` state; `onGridConfirm` now shows direction selector instead of emitting immediately; new `onDirectionConfirm` handler emits `processing-complete` with direction data; exit fullscreen on direction selector show; conditional render (not overlay) to avoid CSS conflicts |
| `utils/gridAnalysis.js` | MODIFY — add `assemblePatternRows()` pure function |
| `utils/__tests__/gridAnalysis.spec.js` | MODIFY — add 11 unit tests for `assemblePatternRows()` covering all 8 corner/direction combinations plus edge cases |

---

## Acceptance Criteria

### UI
- [x] 4×4 schematic grid with 4 clickable corner indicators
- [x] No corner pre-selected — user must choose
- [x] On corner selection, animated row traversal shows numbered rows with directional arrows
- [x] Row direction toggle (alternating vs same) — default alternating
- [x] Changing toggle re-animates the traversal preview
- [x] Continue button hidden until corner is selected
- [x] Integrated into FileUploader flow after grid line confirmation

### Row Assembly
- [x] `assemblePatternRows()` reorders cells by start corner and row direction
- [x] Bottom start → physical rows reversed; top start → physical rows as-is
- [x] Right start → Row 1 columns reversed; left start → Row 1 columns as-is
- [x] Alternating mode flips column order on even rows; same mode keeps it constant
- [x] Cell pixel data preserved (only ordering changes)
- [x] Unit tests covering all 8 combinations (4 corners × 2 directions)

### Tests
- [x] 205 total tests passing (11 new for assemblePatternRows)
- [x] Build succeeds with no errors
