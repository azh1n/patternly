# Story: Chart Grid Detection Improvements

**Status:** Planning
**Priority:** High
**Depends on:** none
**Estimated Scope:** ~3 files modified, 1 new utility file, 1 new test file

---

## Problem

The chart processing pipeline detects grid structure in uploaded crochet chart images so that individual stitch cells can be extracted and classified. It works about 75% of the time. The remaining 25% of failures come from several compounding issues:

1. **No deskewing.** Scanned or photographed charts are almost never perfectly axis-aligned. Even 1-2 degrees of rotation causes HoughLinesP to fragment lines or miss them entirely. This is likely the single largest category of failure.

2. **No regularity enforcement.** Lines are detected independently. The code never exploits the fact that crochet chart grids have evenly spaced lines. If 8 of 10 vertical lines are found, the 2 missing ones could be inferred from the spacing — but they're simply lost.

3. **Hardcoded Canny thresholds.** `cv.Canny(gridROI, edges, 30, 90, 3, false)` at line 642 of `gridProcessingService.js` uses fixed thresholds that don't adapt to image brightness or contrast. Light gray line detection (Step 2) loses its edge support on low-contrast or over-exposed charts.

4. **Brittle gray pixel ranges.** Fixed ranges like `[140, 200]` and `[60, 180]` don't account for scanner variations, colored paper, photocopies, or faded prints. Charts with blue or beige grid lines drift outside these ranges.

5. **No fallback strategy.** When line detection fails, there is no alternative approach. Connected component analysis could find cells directly (inverting the problem), but this path doesn't exist.

6. **Cell extraction is stubbed.** `extractGridCells()` (line 1293) only returns the entire grid as one cell. Individual per-cell extraction — needed for stitch classification — was never completed.

7. **Horizontal lines broken for non-standard resolution.** Line 533 references `params.houghMinLengthRatio` which doesn't exist in the params object, causing horizontal line detection to silently fail for medium and high resolution images (only standard resolution works because it uses hardcoded values).

8. **Memory cleanup bug.** Line 998 calls `lines.delete()` but `lines` is never defined in that scope. This throws on every successful detection and falls into the catch block at line 1005, which silently swallows the error and continues — but it means the cleanup of `horizontalLinesMat`, `horizontalLineKernel`, and `horizontalLines` (the Hough result Mat) never runs, leaking OpenCV memory.

### Current Pipeline Summary

```
detectGridSync()
  │
  ├─ Step 1: Adaptive threshold → morphological open → contour scoring → grid border
  │
  ├─ Step 2 (inside ROI): Adaptive threshold → morph open → HoughLinesP → black/dark lines
  │     └─ Filters: dx < 10px (vertical), dy < 10px (horizontal), deduplication by tolerance
  │
  ├─ Step 3: Per-column pixel scan → light gray lines [140-200]
  │     └─ Canny edges (30, 90) + morph open → HoughLinesP → cross-reference with pixel scan
  │     └─ Confidence = grayRatio + 0.5 bonus if both edge + pixel support
  │
  ├─ Step 4: Per-column pixel scan → medium gray lines [60-180]
  │     └─ Adjacent column grouping (tolerance: 2px) → center calculation
  │
  └─ extractGridCells() → returns whole grid as single cell (stubbed)
```

**What's missing from this pipeline:** deskewing, regularity inference, adaptive thresholds, connected component fallback, and actual per-cell extraction.

---

## Research: What Works for Grid Detection

No mature open-source tool exists for crochet chart image parsing. The closest domain is document table structure recognition. The following approaches were evaluated based on impact, browser feasibility (OpenCV.js / WebAssembly), and implementation complexity.

### Approach A: Projection Profile Analysis + Regularity Enforcement

**The single highest-impact improvement available.**

Instead of detecting individual lines with HoughLinesP, sum pixel intensities along rows and columns of the binarized image using `cv.reduce()`. Grid lines appear as peaks in these 1D histograms. Then find the regular spacing between peaks to infer missing lines.

Why it works better than Hough:
- Aggregates across entire rows/columns, so faint, dashed, or varying-thickness lines still produce detectable peaks
- Directly reveals the periodicity of the grid
- Allows interpolation of missing lines: if the median spacing is 40px and there's a 80px gap, a line was missed at the midpoint
- Computationally cheap — just pixel summation
- Available in OpenCV.js via `cv.reduce()`

**This is what gets detection from 75% to ~90%.** Crochet charts have regular grids. Once you know the cell size, you can recover lines that are too faint to detect independently.

### Approach B: Deskewing / Rotation Correction

Use `cv.minAreaRect()` on the grid contour (already detected in Step 1) to find the rotation angle, then `cv.warpAffine()` to straighten the image before any line detection runs.

Even 1-2 degrees eliminates a class of failures where HoughLinesP fragments rotated lines into multiple short segments. Low effort, high impact.

### Approach C: Adaptive Canny Thresholds

Replace the hardcoded `(30, 90)` Canny thresholds with Otsu-derived values:

```
median = cv.mean(image)
lower = max(0, 0.67 * median)
upper = min(255, 1.33 * median)
cv.Canny(image, edges, lower, upper, 3)
```

This adapts to the actual brightness distribution of each image rather than assuming a fixed contrast level.

### Approach D: Connected Component Cell Detection (Fallback)

When line detection produces fewer lines than expected (e.g., regularity analysis estimates 12 columns but only 7 were found), try the inverse approach:

1. Morphological close to connect broken grid lines
2. Invert the binary image (cells become white blobs on black background)
3. `cv.connectedComponentsWithStats()` to find all white regions
4. Filter by size: cells should all have approximately the same area
5. Use bounding boxes as cell locations

This completely bypasses line detection and works when lines are inconsistent but cells are clearly separated.

### Approach E: FFT Grid Spacing Estimation (Optional, Validation)

Use `cv.dft()` to find the dominant spatial frequency, which corresponds to cell size. Extremely robust to noise and missing lines. Could be used to bootstrap the grid spacing estimate before projection profile analysis. The angle of FFT peaks also reveals rotation, providing a second deskew signal.

### Approach F: ML Table Structure Recognition (Future)

Microsoft's Table Transformer (DETR-based) exported to ONNX and run via `onnxruntime-web` in the browser. Would need fine-tuning on crochet charts. High ceiling but high effort — only pursue if classical methods plateau below 95%.

---

## Implementation Plan

### Phase 1: Bug Fixes & Deskewing (Quick Wins)

Fix the existing bugs and add rotation correction. These are low-effort changes that eliminate known failure modes.

#### 1a. Fix `houghMinLengthRatio` bug

In `detectGridSync()`, the horizontal line filter for non-standard resolution (line 533) references `params.houghMinLengthRatio` which doesn't exist. This means horizontal internal lines are never detected for medium/high-res images. Fix by using the correct expression:

```js
// Before (broken):
if (dy < params.verticalLineTolerance && dx > width * params.houghMinLengthRatio) {

// After (fixed):
if (dy < params.verticalLineTolerance && dx > params.houghMinLength) {
```

#### 1b. Fix memory cleanup bug

Line 998 references undefined `lines`. Replace with the correct variable names for cleanup:

```js
// Before (crashes silently):
lines.delete();

// After:
verticalLines.delete();
horizontalLinesMat.delete();
horizontalLineKernel.delete();
horizontalLines.delete();
```

#### 1c. Add deskewing to the pre-processing pipeline

After the grid contour is found (Step 1, line 152), before internal line detection begins:

1. Use `cv.minAreaRect()` on the grid contour to get the rotation angle
2. If the angle exceeds a threshold (e.g., > 0.5 degrees), apply `cv.warpAffine()` to the grayscale image with the inverse rotation matrix centered on the grid
3. Re-detect the grid contour on the straightened image to update `gridArea` coordinates
4. Proceed with internal line detection on the deskewed ROI

Skip deskewing if the angle is below threshold to avoid unnecessary interpolation artifacts.

#### 1d. Replace hardcoded Canny with adaptive thresholds

Replace line 642:

```js
// Before:
cv.Canny(gridROI, edges, 30, 90, 3, false);

// After:
const mean = cv.mean(gridROI);
const median = mean[0]; // grayscale mean as proxy for median
const cannyLower = Math.max(0, Math.floor(0.67 * median));
const cannyUpper = Math.min(255, Math.floor(1.33 * median));
cv.Canny(gridROI, edges, cannyLower, cannyUpper, 3, false);
```

---

### Phase 2: Projection Profiles + Regularity Enforcement (Core Improvement)

This phase replaces the fragile multi-step Hough + pixel scanning approach with a more robust detection strategy. The existing Steps 1-3 remain as-is for now (they're the primary detection), and projection profiles are added as a verification + gap-filling layer that runs after them.

#### 2a. Add projection profile computation

After the existing line detection steps (Steps 1-3), compute row and column projection profiles of the binarized ROI:

```js
// Sum along columns → horizontal profile (one value per column)
const horizontalProfile = new cv.Mat();
cv.reduce(binaryROI, horizontalProfile, 0, cv.REDUCE_SUM, cv.CV_32S);

// Sum along rows → vertical profile (one value per row)
const verticalProfile = new cv.Mat();
cv.reduce(binaryROI, verticalProfile, 1, cv.REDUCE_SUM, cv.CV_32S);
```

#### 2b. Peak detection

Find peaks in each profile that exceed a threshold (e.g., 30% of the maximum value). These peaks correspond to grid line positions.

#### 2c. Spacing analysis

Compute the differences between consecutive peak positions. The median difference is the estimated cell size. Use this to:

1. **Validate existing detections:** Lines from Steps 1-3 that don't align with the expected grid spacing (within a tolerance of ~20% of cell size) may be false positives — flag them with lower confidence.
2. **Interpolate missing lines:** Where the gap between two consecutive lines is approximately 2x the cell size (within tolerance), insert a line at the midpoint. For 3x gaps, insert 2 lines at 1/3 and 2/3, etc.
3. **Extend to edges:** If the first detected line is roughly one cell width from the grid border, there's likely a missing line at the border.

#### 2d. Confidence scoring

Each line gets a confidence score:
- Detected by Hough + pixel scan + projection peak: `high` (0.9+)
- Detected by Hough + projection peak (no pixel scan): `medium` (0.7)
- Interpolated from spacing only: `low` (0.4)
- Detected by Hough but no projection peak: `suspect` (0.3)

This scoring replaces the current ad-hoc confidence values and provides a consistent basis for downstream decisions (e.g., cell extraction might skip cells bounded by `suspect` lines).

---

### Phase 3: Connected Component Fallback

When projection profile analysis estimates N columns but detection found fewer than 70% of them, trigger the connected component path as a fallback.

#### 3a. Fallback trigger

After Phase 2's regularity analysis, check:

```js
const expectedColumns = Math.round(gridWidth / medianCellWidth);
const detectedColumns = verticalLines.filter(l => !l.isGridBorder).length;
const detectionRatio = detectedColumns / expectedColumns;

if (detectionRatio < 0.7) {
  // Line detection is unreliable — try connected components
  result = detectCellsViaConnectedComponents(cv, binaryROI, result);
}
```

#### 3b. Connected component cell detection

1. Apply `cv.morphologyEx(MORPH_CLOSE)` with a small kernel (3x3) to connect broken lines
2. `cv.bitwise_not()` to invert (cells become foreground)
3. `cv.connectedComponentsWithStats()` to label connected regions
4. Filter components by area: keep those within 50-200% of the expected cell area (derived from median spacing)
5. Sort components into a grid layout by their centroid positions
6. Derive line positions from the boundaries between adjacent cells

#### 3c. Merge with existing detections

Connected component results don't replace the line-based results — they supplement them. Where CC finds cells that align with existing lines, those lines get a confidence boost. Where CC finds cells in gaps between lines, new lines are inferred at the cell boundaries.

---

### Phase 4: Complete Cell Extraction

Replace the stubbed `extractGridCells()` with actual per-cell extraction using the validated grid lines from Phases 1-3.

#### 4a. Sort and validate grid lines

1. Sort vertical lines by x-position, horizontal lines by y-position
2. Verify that consecutive lines are roughly one cell-width apart (using the median spacing from Phase 2)
3. Remove duplicate lines that are within a few pixels of each other (keep the higher-confidence one)

#### 4b. Extract individual cells

For each pair of consecutive horizontal lines and each pair of consecutive vertical lines, extract the rectangular region between them as a cell:

```js
for (let row = 0; row < horizontalLines.length - 1; row++) {
  for (let col = 0; col < verticalLines.length - 1; col++) {
    const x = verticalLines[col].x1;
    const y = horizontalLines[row].y1;
    const w = verticalLines[col + 1].x1 - x;
    const h = horizontalLines[row + 1].y1 - y;

    // Skip cells that are too small or too large relative to expected size
    if (w < medianCellWidth * 0.5 || w > medianCellWidth * 1.5) continue;
    if (h < medianCellHeight * 0.5 || h > medianCellHeight * 1.5) continue;

    const rect = new cv.Rect(x, y, w, h);
    const cellMat = src.roi(rect);

    cells.push({
      image: cellMat,
      row: row,
      col: col,
      x, y, width: w, height: h,
      confidence: Math.min(
        verticalLines[col].confidence || 1,
        verticalLines[col + 1].confidence || 1,
        horizontalLines[row].confidence || 1,
        horizontalLines[row + 1].confidence || 1
      )
    });
  }
}
```

#### 4c. Return structured grid data

The result should include:
- `cells`: Array of cell objects with row/col indices, bounding boxes, confidence scores, and image data (or canvas blobs)
- `gridDimensions`: `{ rows, cols, cellWidth, cellHeight }`
- `gridLines`: The finalized, validated line positions with confidence scores

This structured output is what downstream stitch classification (future Roboflow integration) will consume.

---

### Phase 5: Unit Tests

OpenCV can't run in JSDOM, so testing the full pipeline or elaborately mocking `cv.Mat` would be wasteful. Instead, the algorithmic logic introduced in Phases 1-4 should be extracted into pure functions in a new `utils/gridAnalysis.js` file. These functions take plain arrays/numbers and return plain arrays/numbers — no OpenCV dependency, fully testable.

#### 5a. Extract pure functions into `utils/gridAnalysis.js`

The following logic should live as standalone, exported functions:

| Function | Inputs | Outputs | Phase it supports |
|----------|--------|---------|-------------------|
| `findPeaks(profile, threshold)` | 1D number array, threshold ratio | Array of `{ index, value }` | Phase 2 (projection profiles) |
| `computeMedianSpacing(positions)` | Sorted array of line positions | Median gap between consecutive positions | Phase 2 (regularity) |
| `interpolateMissingLines(positions, medianSpacing, tolerance)` | Sorted positions, expected spacing, tolerance ratio | New array with gaps filled | Phase 2 (regularity) |
| `scoreLineConfidence(sources)` | Object of `{ hough, projection, pixelScan, interpolated }` booleans | Confidence number 0-1 | Phase 2 (confidence) |
| `computeDeskewAngle(rectAngle, rectWidth, rectHeight)` | Angle from `minAreaRect`, rect dimensions | Corrected angle in degrees (clamped to ±15°) | Phase 1 (deskewing) |
| `filterComponentsByArea(stats, expectedArea, tolerance)` | Array of `{ area, x, y, w, h }`, expected cell area, tolerance ratio | Filtered array of valid cell-sized components | Phase 3 (CC fallback) |
| `buildCellGrid(hLines, vLines, medianW, medianH)` | Sorted line arrays, expected cell dimensions | Array of `{ row, col, x, y, w, h, confidence }` | Phase 4 (cell extraction) |
| `deduplicateLines(lines, minDistance)` | Array of `{ position, confidence }`, minimum pixel distance | Deduplicated array (higher confidence wins) | Phase 4 (validation) |

#### 5b. Tests — `utils/__tests__/gridAnalysis.spec.js`

Each function gets tests that cover the core logic and the edge cases that actually matter:

**`findPeaks`** — the foundation of projection profile analysis:
- Finds peaks above threshold in a simple profile
- Returns empty array for flat/below-threshold input
- Doesn't report adjacent pixels as separate peaks (local maxima only)
- Handles single-element and two-element arrays

**`computeMedianSpacing`** — determines cell size:
- Returns correct median for evenly spaced positions (e.g., `[10, 50, 90, 130]` → `40`)
- Returns correct median for odd-count gaps
- Handles positions with one missing line (gap of 2x shows up but median is still correct)
- Returns 0 for fewer than 2 positions

**`interpolateMissingLines`** — the regularity enforcement core:
- Inserts one line in a 2x gap (`[0, 40, 120, 160]` with spacing 40 → inserts 80)
- Inserts two lines in a 3x gap
- Doesn't insert lines in normal-width gaps
- Respects tolerance — a gap of 1.8x the spacing doesn't trigger interpolation but 1.95x does
- Handles empty input and single-line input without crashing

**`scoreLineConfidence`** — prevents bad lines from polluting results:
- Hough + projection + pixelScan → high confidence (0.9+)
- Hough + projection → medium (0.7)
- Interpolated only → low (0.4)
- Hough only (no projection peak) → suspect (0.3)

**`computeDeskewAngle`** — rotation correction:
- Returns near-zero for already-aligned rect (angle ≈ 0 or ≈ -90)
- Returns correct small angle for slightly rotated rect
- Clamps to ±15° for extreme angles
- Handles the OpenCV `minAreaRect` angle convention (returns values in [-90, 0])

**`filterComponentsByArea`** — CC fallback quality gate:
- Keeps components within tolerance of expected area
- Rejects components that are too small (noise) or too large (merged cells)
- Returns empty array when no components match

**`buildCellGrid`** — the cell extraction math:
- Produces correct row/col indices for a 3x4 grid
- Skips cells where width or height deviates > 50% from expected
- Cell confidence is the minimum of its four bounding line confidences
- Returns empty array when fewer than 2 lines in either direction

**`deduplicateLines`** — prevents double-counted lines:
- Keeps only one line when two are within `minDistance`
- Keeps the higher-confidence line
- Doesn't merge lines that are far apart
- Handles ties in confidence (keeps the first one)

---

## Edge Cases

- **Circular/hexagonal charts:** The grid contour scoring (line 142) favors square-ish rectangles. Circular charts will score low and may not be detected. Phase 2's projection profiles won't produce clean peaks for non-rectangular grids either. These chart types are out of scope for this story — they need a separate approach.

- **Charts with text outside the grid:** Row numbers, stitch keys, or titles adjacent to the grid can merge with the grid contour. The current 5% minimum area filter (line 128) helps, but dense annotations may inflate the detected `gridArea`. Deskewing (Phase 1c) using `minAreaRect` on the largest contour should be robust to this since it operates on the contour geometry, not the bounding box.

- **Very faint or dashed grid lines:** Projection profiles handle these much better than Hough since they aggregate across the full row/column. A dashed line with 50% fill will still produce a peak at half the height of a solid line. The peak threshold should be set low enough to catch these (e.g., 20-30% of max).

- **Mixed line styles (some thick, some thin):** The projection profile peaks will have different heights. Peak detection should use an adaptive threshold (e.g., percentage of the local maximum within a sliding window) rather than a single global threshold.

- **Images with grid lines of similar color to cell content:** The morphological open step already helps here (long thin kernels suppress content and preserve lines). Projection profiles add further robustness since stitch symbols don't produce consistent vertical/horizontal signal across the full grid height/width.

- **Extreme rotation (> 10 degrees):** `warpAffine` handles arbitrary rotation, but the contour detection that estimates the angle may fail if rotation is severe enough to distort the grid's apparent shape. Limit deskewing to +-15 degrees and warn the user for larger rotations.

---

## Files Changed Summary

| File | Phase | Action |
|------|-------|--------|
| `services/gridProcessingService.js` | 1-4 | FIX `houghMinLengthRatio` bug; FIX memory cleanup; ADD deskewing; ADD adaptive Canny; ADD projection profiles + regularity enforcement; ADD connected component fallback; REWRITE `extractGridCells()` |
| `services/chartProcessingService.js` | 1, 4 | UPDATE to pass structured cell data downstream; UPDATE progress messages for new pipeline stages |
| `services/imageProcessingService.js` | 1 | ADD deskewing utility (rotation detection + warpAffine) if extracted as reusable function |
| `utils/gridAnalysis.js` | 5 | NEW — pure functions extracted from gridProcessingService (peak detection, spacing, interpolation, confidence, deskew angle, CC filtering, cell grid building, deduplication) |
| `utils/__tests__/gridAnalysis.spec.js` | 5 | NEW — unit tests for all gridAnalysis functions |

---

## Acceptance Criteria

### Phase 1: Bug Fixes & Deskewing
- [ ] Horizontal internal lines are detected for medium and high resolution images (houghMinLengthRatio bug fixed)
- [ ] OpenCV Mat objects are properly cleaned up — no console errors from undefined `lines` variable
- [ ] A chart image rotated 2-3 degrees is automatically straightened before line detection
- [ ] Canny thresholds adapt to image brightness — verified by processing a dark chart and a washed-out chart that both previously failed

### Phase 2: Projection Profiles + Regularity
- [ ] Projection profiles are computed and peaks are detected after existing line detection
- [ ] Median cell spacing is calculated from detected peaks
- [ ] Missing lines are interpolated where gaps are ~2x the median spacing
- [ ] Each line has a confidence score based on which detection methods found it
- [ ] Detection rate improves from ~75% to ~90% on a test set of 20+ chart images

### Phase 3: Connected Component Fallback
- [ ] Fallback triggers automatically when < 70% of expected lines are found
- [ ] Connected component results are merged with (not replacing) line-based results
- [ ] Charts with very faint grid lines that failed line detection are now parsed via CC fallback

### Phase 4: Cell Extraction
- [ ] `extractGridCells()` returns individual cells with row/col indices, not just the entire grid
- [ ] Each cell includes a confidence score derived from its bounding lines
- [ ] Cells bounded by low-confidence lines are included but flagged
- [ ] Grid dimensions (rows, cols, cell size) are returned as structured data
- [ ] Overall detection rate reaches ~95% on the test set

### Phase 5: Unit Tests
- [ ] Pure algorithmic functions are extracted into `utils/gridAnalysis.js` with no OpenCV dependency
- [ ] `gridProcessingService.js` imports and calls these functions instead of inlining the logic
- [ ] All tests in `utils/__tests__/gridAnalysis.spec.js` pass
- [ ] Tests cover: peak detection, spacing analysis, line interpolation, confidence scoring, deskew angle, CC filtering, cell grid building, line deduplication
- [ ] No OpenCV mocking — tests run on plain arrays and numbers only
