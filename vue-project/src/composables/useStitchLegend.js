/**
 * Stitch Legend Composable
 *
 * Groups classified cells by visual similarity (perceptual hash),
 * manages legend state for user correction, and assembles confirmed
 * cells into pattern rows.
 */

import { ref, computed } from 'vue';
import { averageHash, groupBySimilarity } from '@/utils/imageHash';
import { assemblePatternRows } from '@/utils/gridAnalysis';

// All stitch types available for selection
export const STITCH_TYPES = [
  { value: 'ch', label: 'Chain (ch)' },
  { value: 'sc', label: 'Single Crochet (sc)' },
  { value: 'hdc', label: 'Half Double Crochet (hdc)' },
  { value: 'dc', label: 'Double Crochet (dc)' },
  { value: 'tr', label: 'Treble Crochet (tr)' },
  { value: 'dtr', label: 'Double Treble (dtr)' },
  { value: 'sl', label: 'Slip Stitch (sl)' },
  { value: 'scinc', label: 'SC Increase (scinc)' },
  { value: 'scdec', label: 'SC Decrease (scdec)' },
  { value: 'hdcinc', label: 'HDC Increase (hdcinc)' },
  { value: 'hdcdec', label: 'HDC Decrease (hdcdec)' },
  { value: 'dcinc', label: 'DC Increase (dcinc)' },
  { value: 'dcdec', label: 'DC Decrease (dcdec)' },
  { value: 'fpdc', label: 'Front Post DC (fpdc)' },
  { value: 'unknown', label: 'Unknown' },
];

export function useStitchLegend() {
  // Legend entries: { id, stitchType, cellCount, avgConfidence, thumbnailData, cellIndices }
  const legendEntries = ref([]);
  // Map from cell index → legend entry id
  const cellToGroup = ref(new Map());

  /**
   * Build legend from classification results and cell images.
   *
   * @param {{ stitchType: string, confidence: number }[]} predictions
   * @param {{ width: number, height: number, data: Uint8ClampedArray }[]} cellImages
   */
  function buildLegend(predictions, cellImages) {
    if (!predictions || !cellImages || predictions.length !== cellImages.length) {
      legendEntries.value = [];
      return;
    }

    // Compute perceptual hash for each cell
    const hashedCells = cellImages.map((img, index) => ({
      hash: averageHash(img),
      index,
      prediction: predictions[index],
      image: img,
    }));

    // Group by visual similarity (threshold 15 = ~23% of 64 bits can differ)
    const groups = groupBySimilarity(hashedCells, 15);

    // Build legend entries
    const entries = groups.map((group, groupIdx) => {
      const id = `group-${groupIdx}`;
      const cellIndices = group.items.map(item => item.index);

      // Most common prediction in the group
      const typeCounts = {};
      let totalConfidence = 0;
      for (const item of group.items) {
        const type = item.prediction.stitchType;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        totalConfidence += item.prediction.confidence;
      }

      const mostCommonType = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])[0][0];

      const avgConfidence = totalConfidence / group.items.length;

      // Use first cell as representative thumbnail
      const thumbCell = group.items[0].image;

      return {
        id,
        stitchType: mostCommonType,
        cellCount: group.items.length,
        avgConfidence,
        thumbnailData: thumbCell,
        cellIndices,
      };
    });

    // Sort: unknowns first, then by cell count descending
    entries.sort((a, b) => {
      if (a.stitchType === 'unknown' && b.stitchType !== 'unknown') return -1;
      if (a.stitchType !== 'unknown' && b.stitchType === 'unknown') return 1;
      return b.cellCount - a.cellCount;
    });

    legendEntries.value = entries;

    // Build cell-to-group map
    const map = new Map();
    for (const entry of entries) {
      for (const idx of entry.cellIndices) {
        map.set(idx, entry.id);
      }
    }
    cellToGroup.value = map;
  }

  /**
   * Update the stitch type for a legend group.
   */
  function updateGroupType(groupId, newType) {
    const entry = legendEntries.value.find(e => e.id === groupId);
    if (entry) {
      entry.stitchType = newType;
    }
  }

  /**
   * Check if all groups have been assigned a non-unknown type.
   */
  const allGroupsAssigned = computed(() => {
    return legendEntries.value.length > 0 &&
      legendEntries.value.every(e => e.stitchType !== 'unknown');
  });

  /**
   * Build pattern rows from confirmed legend.
   *
   * @param {{ row: number, col: number }[]} gridCells - Cell position data
   * @param {{ rows: number, cols: number }} gridDimensions
   * @param {string} startCorner
   * @param {string} rowDirection
   * @returns {{ number: number, text: string, stitches: string[], color: null, side: null }[]}
   */
  function buildPatternRows(gridCells, gridDimensions, startCorner, rowDirection) {
    if (!gridCells || !gridDimensions || !legendEntries.value.length) return [];

    // Apply confirmed stitch types to cells
    const cellsWithTypes = gridCells.map((cell, index) => {
      const groupId = cellToGroup.value.get(index);
      const entry = legendEntries.value.find(e => e.id === groupId);
      return {
        ...cell,
        stitchType: entry ? entry.stitchType : 'unknown',
      };
    });

    // Order cells into pattern rows
    const orderedRows = assemblePatternRows(cellsWithTypes, gridDimensions, startCorner, rowDirection);

    // Build row objects with collapsed stitches
    const patternRows = orderedRows.map((rowCells, rowIndex) => {
      const stitches = collapseStitches(rowCells.map(c => c.stitchType));
      const text = `Row ${rowIndex + 1}: ${stitches.join(', ')}`;

      return {
        number: rowIndex + 1,
        text,
        stitches,
        color: null,
        side: null,
      };
    });

    return patternRows;
  }

  return {
    legendEntries,
    buildLegend,
    updateGroupType,
    allGroupsAssigned,
    buildPatternRows,
    STITCH_TYPES,
  };
}

/**
 * Collapse consecutive identical stitch types into counted notation.
 * ["sc", "sc", "sc", "dc", "dc"] → ["3sc", "2dc"]
 */
function collapseStitches(types) {
  if (!types || types.length === 0) return [];

  const result = [];
  let current = types[0];
  let count = 1;

  for (let i = 1; i < types.length; i++) {
    if (types[i] === current) {
      count++;
    } else {
      result.push(count > 1 ? `${count}${current}` : current);
      current = types[i];
      count = 1;
    }
  }
  result.push(count > 1 ? `${count}${current}` : current);

  return result;
}
