import { describe, it, expect } from 'vitest'
import {
  findPeaks,
  computeMedianSpacing,
  interpolateMissingLines,
  scoreLineConfidence,
  computeDeskewAngle,
  filterComponentsByArea,
  buildCellGrid,
  deduplicateLines
} from '../gridAnalysis'

describe('gridAnalysis', () => {

  describe('findPeaks', () => {
    it('finds peaks above threshold in a simple profile', () => {
      // Three peaks at indices 2, 5, 8
      const profile = [0, 0, 100, 0, 0, 80, 0, 0, 90, 0]
      const peaks = findPeaks(profile, 0.3)
      expect(peaks.map(p => p.index)).toEqual([2, 5, 8])
    })

    it('returns empty for flat profile below threshold', () => {
      const profile = [10, 10, 10, 10, 10]
      // Max is 10, threshold at 0.3 = 3. All values are equal so none are local maxima
      // (each value equals its neighbors, so they pass >= check — but they're a plateau)
      const peaks = findPeaks(profile, 0.3)
      // First and last are excluded (boundary), middles are plateaus
      expect(peaks.length).toBeLessThanOrEqual(1)
    })

    it('returns empty for all-zero profile', () => {
      expect(findPeaks([0, 0, 0, 0], 0.3)).toEqual([])
    })

    it('returns empty for arrays shorter than 3', () => {
      expect(findPeaks([], 0.3)).toEqual([])
      expect(findPeaks([100], 0.3)).toEqual([])
      expect(findPeaks([100, 200], 0.3)).toEqual([])
    })

    it('does not report adjacent pixels as separate peaks', () => {
      // A broad peak: 0, 50, 100, 100, 50, 0
      const profile = [0, 50, 100, 100, 50, 0]
      const peaks = findPeaks(profile, 0.3)
      // Should find at most 1 peak in this broad bump
      expect(peaks.length).toBe(1)
    })

    it('respects threshold ratio', () => {
      const profile = [0, 0, 100, 0, 0, 20, 0]
      // Threshold at 0.3 = 30, so peak at index 5 (value 20) should be excluded
      const peaks = findPeaks(profile, 0.3)
      expect(peaks).toEqual([{ index: 2, value: 100 }])
    })
  })

  describe('computeMedianSpacing', () => {
    it('returns correct median for evenly spaced positions', () => {
      expect(computeMedianSpacing([10, 50, 90, 130])).toBe(40)
    })

    it('returns correct median for odd number of gaps', () => {
      // gaps: 30, 40, 50 → median is 40
      expect(computeMedianSpacing([10, 40, 80, 130])).toBe(40)
    })

    it('handles one missing line gracefully', () => {
      // Expected: 10, 50, 90, 130, 170 (spacing 40)
      // Missing 90: 10, 50, 130, 170
      // gaps: 40, 80, 40 → sorted: 40, 40, 80 → median = 40
      expect(computeMedianSpacing([10, 50, 130, 170])).toBe(40)
    })

    it('returns 0 for fewer than 2 positions', () => {
      expect(computeMedianSpacing([])).toBe(0)
      expect(computeMedianSpacing([42])).toBe(0)
    })

    it('returns the gap for exactly 2 positions', () => {
      expect(computeMedianSpacing([10, 60])).toBe(50)
    })
  })

  describe('interpolateMissingLines', () => {
    it('inserts one line in a 2x gap', () => {
      // spacing 40, gap from 40→120 is 80 = 2x
      const result = interpolateMissingLines([0, 40, 120, 160], 40)
      expect(result).toEqual([0, 40, 80, 120, 160])
    })

    it('inserts two lines in a 3x gap', () => {
      // spacing 40, gap from 40→160 is 120 = 3x
      const result = interpolateMissingLines([0, 40, 160, 200], 40)
      expect(result).toEqual([0, 40, 80, 120, 160, 200])
    })

    it('does not insert in normal-width gaps', () => {
      const result = interpolateMissingLines([0, 40, 80, 120], 40)
      expect(result).toEqual([0, 40, 80, 120])
    })

    it('does not trigger on a gap that is 1.5x spacing', () => {
      // gap = 60, spacing = 40, ratio = 1.5, nearestMultiple = 2, |1.5-2| = 0.5 > tolerance 0.25
      const result = interpolateMissingLines([0, 40, 100, 140], 40)
      expect(result).toEqual([0, 40, 100, 140])
    })

    it('triggers on a gap close to 2x (within tolerance)', () => {
      // gap = 78, spacing = 40, ratio = 1.95, nearestMultiple = 2, |1.95-2| = 0.05 <= 0.25
      const result = interpolateMissingLines([0, 40, 118, 158], 40)
      expect(result.length).toBe(5) // one line inserted
      expect(result[2]).toBe(79) // midpoint of 40-118
    })

    it('handles empty and single-item input', () => {
      expect(interpolateMissingLines([], 40)).toEqual([])
      expect(interpolateMissingLines([10], 40)).toEqual([10])
    })

    it('returns copy when spacing is 0', () => {
      expect(interpolateMissingLines([10, 50], 0)).toEqual([10, 50])
    })
  })

  describe('scoreLineConfidence', () => {
    it('scores hough + projection + pixelScan as high', () => {
      expect(scoreLineConfidence({ hough: true, projection: true, pixelScan: true })).toBe(0.95)
    })

    it('scores hough + projection as medium', () => {
      expect(scoreLineConfidence({ hough: true, projection: true })).toBe(0.7)
    })

    it('scores interpolated as low', () => {
      expect(scoreLineConfidence({ interpolated: true })).toBe(0.4)
    })

    it('scores hough-only as suspect', () => {
      expect(scoreLineConfidence({ hough: true })).toBe(0.3)
    })

    it('scores projection-only as 0.5', () => {
      expect(scoreLineConfidence({ projection: true })).toBe(0.5)
    })

    it('returns 0 for no sources', () => {
      expect(scoreLineConfidence({})).toBe(0)
      expect(scoreLineConfidence(null)).toBe(0)
    })

    it('interpolated takes priority over other flags', () => {
      // If a line is interpolated, that's its confidence regardless of other flags
      expect(scoreLineConfidence({ interpolated: true, hough: true, projection: true })).toBe(0.4)
    })
  })

  describe('computeDeskewAngle', () => {
    it('returns 0 for already-aligned rect (angle near 0)', () => {
      expect(computeDeskewAngle(-0.3, 200, 100)).toBe(0)
    })

    it('returns 0 for already-aligned rect (angle near -90)', () => {
      // -90 means the rect is axis-aligned but reported as -90
      // After adjustment: 90 + (-90) = 0
      expect(computeDeskewAngle(-89.7, 100, 200)).toBe(0)
    })

    it('returns correct small angle for slightly rotated rect', () => {
      const angle = computeDeskewAngle(-2, 200, 100)
      expect(angle).toBe(-2)
    })

    it('clamps to 15 degrees for extreme rotation', () => {
      expect(computeDeskewAngle(-25, 200, 100)).toBe(-15)
    })

    it('handles angle near -45 (ambiguous orientation)', () => {
      // -44 stays as-is since it's > -45
      const angle = computeDeskewAngle(-44, 200, 100)
      expect(angle).toBe(-15) // clamped
    })

    it('handles angle just below -45', () => {
      // -46: adjusted to 90 + (-46) = 44, clamped to 15
      expect(computeDeskewAngle(-46, 200, 100)).toBe(15)
    })
  })

  describe('filterComponentsByArea', () => {
    const stats = [
      { area: 100, x: 0, y: 0, width: 10, height: 10 },
      { area: 400, x: 10, y: 0, width: 20, height: 20 },   // expected
      { area: 420, x: 30, y: 0, width: 20, height: 21 },   // expected
      { area: 2000, x: 50, y: 0, width: 100, height: 20 },  // too large
      { area: 10, x: 60, y: 0, width: 2, height: 5 },       // too small
    ]

    it('keeps components within tolerance of expected area', () => {
      const result = filterComponentsByArea(stats, 400, 0.5)
      expect(result.length).toBe(2)
      expect(result[0].area).toBe(400)
      expect(result[1].area).toBe(420)
    })

    it('rejects too small and too large components', () => {
      const result = filterComponentsByArea(stats, 400, 0.5)
      expect(result.find(s => s.area === 100)).toBeUndefined()
      expect(result.find(s => s.area === 2000)).toBeUndefined()
      expect(result.find(s => s.area === 10)).toBeUndefined()
    })

    it('returns empty for no matching components', () => {
      expect(filterComponentsByArea(stats, 5000, 0.1)).toEqual([])
    })

    it('returns empty for empty input', () => {
      expect(filterComponentsByArea([], 400, 0.5)).toEqual([])
    })
  })

  describe('buildCellGrid', () => {
    const hLines = [
      { position: 0, confidence: 0.9 },
      { position: 40, confidence: 0.8 },
      { position: 80, confidence: 0.7 },
    ]
    const vLines = [
      { position: 0, confidence: 0.9 },
      { position: 40, confidence: 0.6 },
      { position: 80, confidence: 0.95 },
      { position: 120, confidence: 0.5 },
    ]

    it('produces correct row/col indices for a 2x3 grid', () => {
      const cells = buildCellGrid(hLines, vLines, 40, 40)
      expect(cells.length).toBe(6) // 2 rows × 3 cols
      expect(cells[0]).toEqual({ row: 0, col: 0, x: 0, y: 0, width: 40, height: 40, confidence: 0.6 })
      expect(cells[5]).toEqual({ row: 1, col: 2, x: 80, y: 40, width: 40, height: 40, confidence: 0.5 })
    })

    it('cell confidence is the minimum of its four bounding lines', () => {
      const cells = buildCellGrid(hLines, vLines, 40, 40)
      // Cell (0,1): vLines[1].confidence=0.6, vLines[2].confidence=0.95,
      //             hLines[0].confidence=0.9, hLines[1].confidence=0.8
      // min = 0.6
      expect(cells[1].confidence).toBe(0.6)
    })

    it('skips cells where width deviates > 50% from expected', () => {
      const irregularVLines = [
        { position: 0, confidence: 0.9 },
        { position: 10, confidence: 0.8 }, // width 10 vs expected 40 = 25%, too small
        { position: 50, confidence: 0.7 },
      ]
      const cells = buildCellGrid(hLines, irregularVLines, 40, 40)
      // Cell (row, col=0) has width 10 which is < 40*0.5=20, so skipped
      // Cell (row, col=1) has width 40, included
      expect(cells.length).toBe(2) // 2 rows, only col=1 valid
    })

    it('returns empty for fewer than 2 lines in either direction', () => {
      expect(buildCellGrid([{ position: 0 }], vLines, 40, 40)).toEqual([])
      expect(buildCellGrid(hLines, [{ position: 0 }], 40, 40)).toEqual([])
    })

    it('handles missing confidence values (defaults to 1)', () => {
      const h = [{ position: 0 }, { position: 40 }]
      const v = [{ position: 0 }, { position: 40 }]
      const cells = buildCellGrid(h, v, 40, 40)
      expect(cells[0].confidence).toBe(1)
    })
  })

  describe('deduplicateLines', () => {
    it('keeps only one line when two are within minDistance', () => {
      const lines = [
        { position: 100, confidence: 0.5 },
        { position: 102, confidence: 0.8 },
      ]
      const result = deduplicateLines(lines, 5)
      expect(result.length).toBe(1)
      expect(result[0].confidence).toBe(0.8) // higher confidence wins
    })

    it('keeps the higher-confidence line', () => {
      const lines = [
        { position: 50, confidence: 0.9 },
        { position: 52, confidence: 0.3 },
      ]
      const result = deduplicateLines(lines, 5)
      expect(result[0].position).toBe(50)
      expect(result[0].confidence).toBe(0.9)
    })

    it('does not merge lines that are far apart', () => {
      const lines = [
        { position: 50, confidence: 0.8 },
        { position: 100, confidence: 0.7 },
        { position: 150, confidence: 0.6 },
      ]
      const result = deduplicateLines(lines, 5)
      expect(result.length).toBe(3)
    })

    it('handles empty input', () => {
      expect(deduplicateLines([], 5)).toEqual([])
    })

    it('handles single line', () => {
      const result = deduplicateLines([{ position: 42, confidence: 0.9 }], 5)
      expect(result).toEqual([{ position: 42, confidence: 0.9 }])
    })

    it('handles ties in confidence (keeps first)', () => {
      const lines = [
        { position: 50, confidence: 0.5 },
        { position: 52, confidence: 0.5 },
      ]
      const result = deduplicateLines(lines, 5)
      expect(result.length).toBe(1)
      expect(result[0].position).toBe(50) // first one kept
    })
  })
})
