/**
 * Grid Analysis Utilities
 * Pure functions for analyzing grid structure from projection profiles.
 * No OpenCV dependency — operates on plain arrays and numbers.
 */

/**
 * Finds local maxima (peaks) in a 1D intensity profile.
 * A peak must be a local maximum that exceeds the threshold.
 *
 * @param {number[]} profile - 1D array of intensity sums
 * @param {number} thresholdRatio - Minimum ratio of the max value to qualify as a peak (0-1)
 * @returns {{ index: number, value: number }[]} Array of peak positions and values
 */
export function findPeaks(profile, thresholdRatio = 0.3) {
  if (!profile || profile.length < 3) return [];

  const maxValue = Math.max(...profile);
  if (maxValue === 0) return [];

  const threshold = maxValue * thresholdRatio;
  const peaks = [];

  for (let i = 1; i < profile.length - 1; i++) {
    if (
      profile[i] >= threshold &&
      profile[i] >= profile[i - 1] &&
      profile[i] >= profile[i + 1]
    ) {
      // Skip if this is a plateau continuation (same value as previous peak)
      if (peaks.length > 0 && i - peaks[peaks.length - 1].index <= 2 && profile[i] === profile[i - 1]) {
        continue;
      }
      peaks.push({ index: i, value: profile[i] });
    }
  }

  return peaks;
}

/**
 * Computes the median spacing between consecutive sorted positions.
 *
 * @param {number[]} positions - Sorted array of line positions
 * @returns {number} Median gap between consecutive positions, or 0 if < 2 positions
 */
export function computeMedianSpacing(positions) {
  if (!positions || positions.length < 2) return 0;

  const gaps = [];
  for (let i = 1; i < positions.length; i++) {
    gaps.push(positions[i] - positions[i - 1]);
  }

  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 0
    ? (gaps[mid - 1] + gaps[mid]) / 2
    : gaps[mid];
}

/**
 * Interpolates missing lines where gaps are approximate multiples of the expected spacing.
 *
 * @param {number[]} positions - Sorted array of detected line positions
 * @param {number} medianSpacing - Expected spacing between consecutive lines
 * @param {number} tolerance - How close a gap must be to a multiple of medianSpacing (0-1 ratio, default 0.25)
 * @returns {number[]} New sorted array with interpolated positions inserted
 */
export function interpolateMissingLines(positions, medianSpacing, tolerance = 0.25) {
  if (!positions || positions.length < 2 || medianSpacing <= 0) {
    return positions ? [...positions] : [];
  }

  const result = [positions[0]];

  for (let i = 1; i < positions.length; i++) {
    const gap = positions[i] - positions[i - 1];
    const ratio = gap / medianSpacing;
    const nearestMultiple = Math.round(ratio);

    // Only interpolate if the gap is close to a multiple >= 2
    if (nearestMultiple >= 2 && Math.abs(ratio - nearestMultiple) <= tolerance) {
      // Insert evenly spaced lines in the gap
      const step = gap / nearestMultiple;
      for (let j = 1; j < nearestMultiple; j++) {
        result.push(Math.round(positions[i - 1] + step * j));
      }
    }

    result.push(positions[i]);
  }

  return result;
}

/**
 * Computes a confidence score for a detected line based on which methods found it.
 *
 * @param {{ hough?: boolean, projection?: boolean, pixelScan?: boolean, interpolated?: boolean }} sources
 * @returns {number} Confidence score between 0 and 1
 */
export function scoreLineConfidence(sources) {
  if (!sources) return 0;

  if (sources.interpolated) return 0.4;
  if (sources.hough && sources.projection && sources.pixelScan) return 0.95;
  if (sources.hough && sources.projection) return 0.7;
  if (sources.projection && sources.pixelScan) return 0.7;
  if (sources.hough && sources.pixelScan) return 0.6;
  if (sources.projection) return 0.5;
  if (sources.hough) return 0.3;
  if (sources.pixelScan) return 0.3;

  return 0;
}

/**
 * Computes the deskew angle from OpenCV's minAreaRect output.
 * Normalizes the angle and clamps to ±15 degrees.
 *
 * @param {number} rectAngle - Angle from minAreaRect (in [-90, 0) range)
 * @param {number} rectWidth - Width of the rotated rect
 * @param {number} rectHeight - Height of the rotated rect
 * @returns {number} Correction angle in degrees, or 0 if below threshold
 */
export function computeDeskewAngle(rectAngle, rectWidth, rectHeight) {
  let angle = rectAngle;

  // OpenCV minAreaRect returns angles in [-90, 0).
  // If angle < -45, the rect is "more vertical" and we adjust.
  if (angle < -45) {
    angle = 90 + angle;
  }

  // Clamp to ±15 degrees
  angle = Math.max(-15, Math.min(15, angle));

  // Below 0.5 degrees, skip deskewing
  if (Math.abs(angle) < 0.5) return 0;

  return angle;
}

/**
 * Filters connected component stats to keep only valid cell-sized components.
 *
 * @param {{ area: number, x: number, y: number, width: number, height: number }[]} stats
 * @param {number} expectedArea - Expected cell area in pixels
 * @param {number} tolerance - Acceptable deviation ratio (default 0.5 = 50-150% of expected)
 * @returns {{ area: number, x: number, y: number, width: number, height: number }[]}
 */
export function filterComponentsByArea(stats, expectedArea, tolerance = 0.5) {
  if (!stats || !stats.length || expectedArea <= 0) return [];

  const minArea = expectedArea * (1 - tolerance);
  const maxArea = expectedArea * (1 + tolerance);

  return stats.filter(s => s.area >= minArea && s.area <= maxArea);
}

/**
 * Builds a cell grid from sorted horizontal and vertical line positions.
 * Skips cells that deviate significantly from expected dimensions.
 *
 * @param {{ position: number, confidence?: number }[]} hLines - Sorted horizontal lines
 * @param {{ position: number, confidence?: number }[]} vLines - Sorted vertical lines
 * @param {number} medianW - Expected cell width
 * @param {number} medianH - Expected cell height
 * @returns {{ row: number, col: number, x: number, y: number, width: number, height: number, confidence: number }[]}
 */
export function buildCellGrid(hLines, vLines, medianW, medianH) {
  if (!hLines || hLines.length < 2 || !vLines || vLines.length < 2) return [];

  const cells = [];

  for (let row = 0; row < hLines.length - 1; row++) {
    for (let col = 0; col < vLines.length - 1; col++) {
      const x = vLines[col].position;
      const y = hLines[row].position;
      const w = vLines[col + 1].position - x;
      const h = hLines[row + 1].position - y;

      // Skip cells that deviate > 50% from expected
      if (w < medianW * 0.5 || w > medianW * 1.5) continue;
      if (h < medianH * 0.5 || h > medianH * 1.5) continue;

      const confidence = Math.min(
        vLines[col].confidence ?? 1,
        vLines[col + 1].confidence ?? 1,
        hLines[row].confidence ?? 1,
        hLines[row + 1].confidence ?? 1
      );

      cells.push({ row, col, x, y, width: w, height: h, confidence });
    }
  }

  return cells;
}

/**
 * Removes duplicate lines that are within minDistance of each other.
 * Keeps the higher-confidence line when two collide.
 *
 * @param {{ position: number, confidence: number }[]} lines - Array of lines with positions and confidence
 * @param {number} minDistance - Minimum pixel distance between lines
 * @returns {{ position: number, confidence: number }[]} Deduplicated array
 */
export function deduplicateLines(lines, minDistance) {
  if (!lines || lines.length === 0) return [];

  // Sort by position
  const sorted = [...lines].sort((a, b) => a.position - b.position);
  const result = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1];
    if (sorted[i].position - last.position < minDistance) {
      // Keep the one with higher confidence
      if (sorted[i].confidence > last.confidence) {
        result[result.length - 1] = sorted[i];
      }
    } else {
      result.push(sorted[i]);
    }
  }

  return result;
}
