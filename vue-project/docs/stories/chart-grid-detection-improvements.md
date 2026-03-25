# Story: Chart Grid Detection Improvements

**Status:** In Progress
**Priority:** High
**Depends on:** none
**Estimated Scope:** ~5 files modified, 1 new utility file, 1 new test file

---

## Problem

The chart processing pipeline detects grid structure in uploaded crochet chart images so that individual stitch cells can be extracted and classified. It originally worked about 75% of the time. The remaining failures came from: no deskewing, no regularity enforcement, hardcoded Canny thresholds, brittle gray pixel ranges, no fallback strategy, stubbed cell extraction, missing horizontal line detection, and memory cleanup bugs.

---

## What Was Done

### Phase 1: Bug Fixes & Deskewing — Done

**1a. Fixed `houghMinLengthRatio` bug.** The horizontal line filter for non-standard resolution referenced `params.houghMinLengthRatio` which didn't exist, silently breaking horizontal line detection for medium/high-res images. Changed to `params.houghMinLength`.

**1b. Fixed memory cleanup bugs.** Two separate issues:
- Inner cleanup: `lines.delete()` referenced an undefined variable, causing all subsequent Mat cleanup to be skipped (leaked `edges`, `verticalKernel`, `verticalEdges`, `edgeLines`, `mediumGrayROI`). Replaced with the 4 missing Mats (`horizontalLineKernel`, `horizontalLinesMat`, `verticalLines`, `horizontalLines`).
- Outer cleanup: `horizontalLinesMat.delete()` and `verticalLines.delete()` referenced variables that were only defined in the inner scope. Removed them. Made all outer cleanup null-safe for tile mode (where border detection Mats are never created).

**1c. Added deskewing.** `computeDeskewAngle()` uses `cv.minAreaRect()` on the grid contour. `deskewImage()` applies `cv.warpAffine()` with `BORDER_REPLICATE`. Skips if rotation < 0.5°, clamps at ±15°. Added a **rectangularity check** (`contourArea / boundingRectArea > 0.7`) after testing revealed non-rectangular contours produced misleading angles (e.g., 15° on an axis-aligned chart).

**1d. Adaptive Canny thresholds.** Replaced hardcoded `(30, 90)` with values derived from image mean brightness: `lower = 0.67 * mean`, `upper = 1.33 * mean`.

### Phase 2: Projection Profiles + Regularity — Done

Added Step 4 after existing line detection. Computes projection profiles using `cv.reduce()` on the **morphologically-filtered** Mats (`verticalLinesMat`/`horizontalLinesMat`), not the raw binary — initial testing showed the raw binary produced noise from stitch content (216 peaks at 3px spacing instead of ~50 peaks at ~17px).

- Peak detection via `findPeaks()` on the profiles
- Median spacing computed primarily from **detected line positions** (ground truth from Steps 1-3), falling back to projection peaks only when < 3 lines were found
- Missing lines interpolated where gaps are multiples of the median spacing
- Confidence scores assigned: 0.95 (hough+projection+pixel), 0.7 (two sources), 0.5 (projection only), 0.4 (interpolated), 0.3 (hough only)

### Phase 3: Connected Component Fallback — Done

Step 5 triggers when detected lines are < 70% of expected count (based on median spacing). Inverts the binary image, uses `cv.connectedComponentsWithStats()`, filters to cell-sized components via `filterComponentsByArea()`, derives line positions from cell boundaries, merges with existing detections.

### Phase 4: Cell Extraction — Done

Rewrote `extractGridCells()` to return individual cells with row/col indices, bounding boxes, and confidence scores. Uses `deduplicateLines()` + `buildCellGrid()` from the pure utility functions. Returns structured `{ cells, gridDimensions }`.

### Phase 5: Unit Tests — Done

Created `utils/gridAnalysis.js` with 8 pure functions (no OpenCV dependency): `findPeaks`, `computeMedianSpacing`, `interpolateMissingLines`, `scoreLineConfidence`, `computeDeskewAngle`, `filterComponentsByArea`, `buildCellGrid`, `deduplicateLines`.

46 tests in `utils/__tests__/gridAnalysis.spec.js`, all passing. Total test count: 158.

### Additional Work (Not in Original Plan)

**Horizontal medium gray line detection (Step 3b).** The original code only scanned columns for vertical lines — there was no equivalent row scanning for horizontal lines. Added Step 3b that mirrors the vertical medium gray pixel analysis but scans rows. This was the reason 0 horizontal lines were detected on chart-1.pdf.

**Tile-based processing for large images.** Images exceeding `MAX_PIXELS` (8M) or `MAX_DIMENSION` (3000px) are now split into tiles instead of being resized (which destroyed grid structure at small cell sizes). Each tile is processed independently through the full pipeline, then results are merged with position offsets and deduplication in overlap zones. Added `{ assumeFullGrid: true }` option to `detectGrid()` so tiles skip border detection and treat the entire tile as the grid ROI.

**Removed unused code.** Deleted `detectGridBorder()` and `highlightGridBorder()` (~150 lines, never called outside gridProcessingService.js). Removed unused `import { ref } from 'vue'`. Removed bare debug `console.log("Step 1")` etc.

**Removed "coming soon" stubs.** `AddPatternModal.handleFileUpload` no longer shows fake error messages for image/PDF uploads. The actual processing via `FileUploader` → `chartProcessingService` proceeds unblocked.

**Fixed chart preview controls.** Two-finger trackpad scroll now pans the image (was zooming). Ctrl/Cmd+scroll zooms. Pinch-to-zoom on touch devices works via distance tracking between 2 touches. Two-finger touch pans at any zoom level.

---

### Phase 6: Interactive Grid Line Editor — Done

Replaced the burned-in grid line visualization with an interactive SVG overlay that lets users review, correct, add, and remove lines before cell extraction runs.

**Pipeline changes:**

- `chartProcessingService.processChart()` no longer calls `drawGridLines()` or `extractGridCells()`. Returns clean image blob + `gridResult` (line coordinate arrays, gridArea, median cell dimensions).
- New `chartProcessingService.confirmGridLines(imageElement, editedGridResult)` function: re-loads image into OpenCV, draws lines on a copy for visual output, extracts cells from the clean source, returns `{ blob, gridCells, cellImages, gridDimensions }`.
- Fixed pre-existing bug: `extractGridCells` was called with `gridResult.cells` instead of the full `gridResult` object.

**Editor implementation:**

- `useGridLineEditor` composable (`composables/useGridLineEditor.js`): pure state management — init from grid result, reset, select/deselect, delete, move (axis-constrained), add horizontal/vertical lines, set grid area, build grid result. Fully unit-tested (28 tests).
- `GridLineEditor` component (`components/GridLineEditor.vue`): SVG overlay with `viewBox` matching image natural dimensions. Lines rendered as `<line>` elements (red horizontal, blue vertical, green borders, yellow selected). Nearest-line selection via perpendicular distance calculation (no overlapping hit-area elements). Delete button via `<foreignObject>` on selected line midpoint. Preview line/rect while using add tools. Keyboard shortcuts (Escape to deselect, Delete/Backspace to remove). Exposes composable methods via `defineExpose` for parent toolbar integration.
- SVG positioned inside an `image-overlay-wrapper` (`display: inline-block; position: relative`) that shrinks to fit the `<img>`, ensuring the overlay aligns exactly with the image regardless of container size.

**Toolbar:**

- Editor tools (confirm, select, +horizontal, +vertical, border, delete, reset) integrated into `FileUploader`'s existing zoom-controls panel at bottom-right. Confirm button at top of toolbar. Tools and zoom buttons separated by dividers. Active tool highlighted. All icons registered in `main.js`.

**User flow:**

1. User uploads chart image/PDF → auto-detection runs
2. Fullscreen mode activates automatically
3. Clean image shown with SVG line overlay
4. User edits lines with toolbar tools (select/move/add/delete/border)
5. Ctrl+scroll zooms, scroll pans — works alongside editing
6. Reset restores auto-detected lines
7. Confirm triggers `confirmGridLines()` → cell extraction → emits `processing-complete`

**Both image and PDF upload paths updated** to use the new two-stage flow.

---

## What Still Needs Work

### Detection Quality (Independent of Phase 6)

#### 1. Large image tiling quality

Tiling works (splits correctly, processes each tile, merges results), but detection quality across tiles is inconsistent — some tiles miss lines, others over-detect. Root causes:

- **No cross-tile regularity enforcement.** Each tile computes its own median spacing independently. A global spacing estimate (from the best-detected tile) should be applied across all tiles to interpolate gaps consistently.
- **Tile boundary artifacts.** Grid lines near tile edges get clipped by the morphological kernels. The 80px overlap helps but may not be enough for the 10% kernel sizes. Consider reducing kernel sizes for tile mode, or increasing overlap.
- **CC fallback over-triggers on tiles.** Because each tile has fewer expected lines than a full image, the 70% threshold triggers more easily, adding noisy CC-derived lines.

#### 2. Charts that don't fill the page — Multi-Scale Border Detection

The initial morphological kernel sizes (10% of full image dimensions) assume the grid spans most of the image. Charts that occupy only part of the page (e.g., CupofCoffeeWallHangingChart.pdf where the grid is ~40% of the page) have their grid lines erased by the morphological open, causing contour detection to fail entirely.

**Approach: Multi-scale retry with full-image fallback.**

Refactor the border detection block (adaptive threshold → morph open → contour scoring → deskew) into a standalone function that accepts a kernel scale parameter. Call it in sequence with progressively smaller scales:

1. **10% kernels** (existing behavior) — works for charts that fill the page
2. **5% kernels** — catches charts that occupy ~40-60% of the page
3. **3% kernels** — catches smaller charts or charts with thin grid lines
4. **Full-image fallback** — if all scales fail, treat the entire image as the grid ROI (same as `assumeFullGrid`) and let Steps 1-5 find internal lines. The interactive editor is the safety net.

Stop at the first scale that finds a grid contour passing the existing scoring threshold (area > 5% of image, best rectangularity/aspect score). This is purely additive — charts that already work hit the 10% path on the first try with no change in behavior. The extra morph passes only run on failure cases.

#### 3. Gray pixel range adaptivity

The gray pixel ranges `[60-180]` and `[140-200]` are still hardcoded. Charts with colored grid lines (blue, beige) or unusual paper tones may fall outside these ranges. Could be improved by computing the image histogram and finding the gray line distribution dynamically.

#### 4. Detection accuracy target

Current accuracy is better than the original 75% but has not been rigorously measured against the 95% target. Needs a structured test set of diverse chart images to benchmark and identify remaining failure modes. With the interactive editor (Phase 6), the target shifts: auto-detection should get close enough that manual correction is minimal.

---

## Current Pipeline Summary

```
processChart() [chartProcessingService.js]
  │
  ├─ If image > 8M pixels or > 3000px dimension:
  │   ├─ Split into tiles (with 80px overlap)
  │   ├─ Process each tile via detectGrid({ assumeFullGrid: true })
  │   ├─ Offset line positions by tile origin
  │   └─ Deduplicate lines in overlap zones
  │
  └─ Else: single-pass via detectGrid()

detectGridSync() [gridProcessingService.js]
  │
  ├─ If assumeFullGrid (tile mode):
  │   └─ Set gridArea = full image, skip border detection + deskewing
  │
  ├─ Else (normal mode):
  │   ├─ Step 1: Adaptive threshold → morph open → contour scoring → grid border
  │   └─ Deskew if contour is rectangular (rectangularity > 0.7) and rotated > 0.5°
  │
  ├─ Step 1 (ROI): Adaptive threshold → morph open → HoughLinesP → black/dark lines
  ├─ Step 2: Per-column pixel scan → light gray lines + adaptive Canny edge verification
  ├─ Step 3: Per-column pixel scan → medium gray vertical lines (grouped)
  ├─ Step 3b: Per-row pixel scan → medium gray horizontal lines (grouped)
  ├─ Step 4: Projection profiles on morph-filtered image → regularity enforcement → interpolation
  ├─ Step 5: Connected component fallback (if < 70% of expected lines found)
  │
  └─ Returns: { horizontalLines, verticalLines, gridArea, originalImage }
      (cell extraction deferred until user confirms grid lines)

User reviews/edits lines in interactive overlay
  │
  ├─ Confirm → extractGridCells() with corrected lines
  └─ Reset → restore auto-detected lines
```

---

## Files Changed Summary

| File | Action |
|------|--------|
| `services/gridProcessingService.js` | FIX 2 bugs; ADD deskewing (with rectangularity guard); ADD adaptive Canny; ADD horizontal pixel scanning (Step 3b); ADD projection profiles + regularity (Step 4); ADD CC fallback (Step 5); ADD `assumeFullGrid` tile mode; REWRITE `extractGridCells()`; REMOVE unused `detectGridBorder`, `highlightGridBorder`, `ref` import, debug logs |
| `services/chartProcessingService.js` | ADD tile-based processing for large images; UPDATE single-pass path; PASS `assumeFullGrid` option for tiles; MODIFY `processChart()` to return clean blob + gridResult (no burn-in, no cell extraction); ADD `confirmGridLines()` for deferred cell extraction; FIX `extractGridCells` called with wrong argument |
| `components/FileUploader.vue` | FIX 2-finger trackpad to pan (was zoom); ADD pinch-to-zoom for touch; ADD `touch-action: none` on `.image-preview`; ADD GridLineEditor integration (both image and PDF paths); ADD auto-fullscreen on grid detection; ADD combined toolbar (editor tools + zoom controls); ADD `image-overlay-wrapper` for correct SVG alignment |
| `components/GridLineEditor.vue` | NEW — SVG overlay with nearest-line selection, axis-constrained drag, add/delete tools, keyboard shortcuts, `defineExpose` for parent toolbar |
| `composables/useGridLineEditor.js` | NEW — pure state composable: init, reset, select, delete, move, add horizontal/vertical, set grid area, build grid result |
| `components/FileUploadContainer.vue` | REMOVE PDF-only guard on `onProcessingComplete` |
| `components/AddPatternModal.vue` | REMOVE "coming soon" error stubs from `handleFileUpload` |
| `main.js` | ADD 7 FontAwesome icons for editor toolbar |
| `utils/gridAnalysis.js` | NEW — 8 pure functions: `findPeaks`, `computeMedianSpacing`, `interpolateMissingLines`, `scoreLineConfidence`, `computeDeskewAngle`, `filterComponentsByArea`, `buildCellGrid`, `deduplicateLines` |
| `utils/__tests__/gridAnalysis.spec.js` | NEW — 46 unit tests covering all gridAnalysis functions |
| `composables/__tests__/useGridLineEditor.spec.js` | NEW — 28 unit tests for grid line editor composable |
| `components/__tests__/GridLineEditor.spec.js` | NEW — 8 component tests for GridLineEditor |

---

## Acceptance Criteria

### Completed
- [x] `houghMinLengthRatio` bug fixed — horizontal lines detected for medium/high-res images
- [x] Memory cleanup bugs fixed — no console errors from undefined variables
- [x] Deskewing added with rectangularity guard to avoid false rotations
- [x] Canny thresholds adapt to image brightness
- [x] Horizontal medium gray line detection added (Step 3b)
- [x] Projection profiles computed on morphological output (not raw binary)
- [x] Median spacing computed from detected line positions
- [x] Missing lines interpolated where gaps are multiples of median spacing
- [x] Confidence scores assigned based on detection method combination
- [x] CC fallback triggers when < 70% of expected lines found
- [x] CC results merged with line-based detections
- [x] `extractGridCells()` returns individual cells with row/col/confidence
- [x] Grid dimensions returned as structured data
- [x] Pure functions extracted into `utils/gridAnalysis.js`
- [x] 46 unit tests passing in `utils/__tests__/gridAnalysis.spec.js`
- [x] Large images processed via tiling instead of destructive resize
- [x] Tile mode skips border detection (`assumeFullGrid`)
- [x] Unused code removed
- [x] "Coming soon" stubs removed from AddPatternModal
- [x] Chart preview: 2-finger trackpad pans, Ctrl+scroll zooms

### Phase 6: Interactive Grid Line Editor
- [x] `chartProcessingService` returns original image blob + line coordinates (no burn-in)
- [x] Cell extraction deferred until user confirms grid lines via `confirmGridLines()`
- [x] SVG line overlay rendered above original image with correct alignment
- [x] Select tool: nearest-line detection, drag to reposition (axis-constrained)
- [x] Delete: X button on selected line + Delete/Backspace keyboard shortcut
- [x] Add horizontal line tool: click to place, constrained horizontal
- [x] Add vertical line tool: click to place, constrained vertical
- [x] Add border tool: click-drag to draw grid boundary rectangle
- [x] Pan/zoom continues to work alongside editing tools (Ctrl+scroll, scroll pan)
- [x] Reset button restores auto-detected lines
- [x] Confirm button runs `extractGridCells()` with corrected lines
- [x] Auto-enters fullscreen mode after grid detection
- [x] Editor tools combined with zoom controls in single bottom-right toolbar
- [x] Both image and PDF upload paths supported
- [x] Pre-existing `extractGridCells` argument bug fixed
- [x] 28 composable unit tests + 8 component tests (194 total)

### Detection Quality (Independent)
- [ ] Cross-tile regularity enforcement (global spacing from best tile)
- [x] Charts that don't fill the page (multi-scale morph + contour clustering fallback)
- [ ] Adaptive gray pixel ranges based on image histogram
- [ ] Detection accuracy benchmarked against diverse test set
- [ ] Tile boundary artifacts reduced (kernel size adjustment or larger overlap)
