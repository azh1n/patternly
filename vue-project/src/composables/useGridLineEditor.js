import { ref, computed } from 'vue';

let nextLineId = 1;

function assignId(line) {
  return { ...line, id: nextLineId++ };
}

function deepCloneLines(lines) {
  return lines.map(l => ({ ...l }));
}

export function useGridLineEditor() {
  // Working line arrays
  const horizontalLines = ref([]);
  const verticalLines = ref([]);
  const gridArea = ref(null);
  const medianCellWidth = ref(0);
  const medianCellHeight = ref(0);

  // Originals for reset
  const originalHorizontalLines = ref([]);
  const originalVerticalLines = ref([]);
  const originalGridArea = ref(null);

  // Tool state
  const activeTool = ref('select');
  const selectedLineId = ref(null);
  const isEditorActive = ref(false);

  // Image dimensions
  const imageWidth = ref(0);
  const imageHeight = ref(0);

  const allLines = computed(() => [
    ...horizontalLines.value,
    ...verticalLines.value
  ]);

  const selectedLine = computed(() => {
    if (!selectedLineId.value) return null;
    return allLines.value.find(l => l.id === selectedLineId.value) || null;
  });

  function initFromGridResult(gridResult, imgWidth, imgHeight) {
    imageWidth.value = imgWidth;
    imageHeight.value = imgHeight;
    medianCellWidth.value = gridResult.medianCellWidth || 0;
    medianCellHeight.value = gridResult.medianCellHeight || 0;
    gridArea.value = gridResult.gridArea ? { ...gridResult.gridArea } : null;

    // Assign IDs and store working copies
    horizontalLines.value = (gridResult.horizontalLines || []).map(assignId);
    verticalLines.value = (gridResult.verticalLines || []).map(assignId);

    // Deep-clone originals for reset
    originalHorizontalLines.value = deepCloneLines(horizontalLines.value);
    originalVerticalLines.value = deepCloneLines(verticalLines.value);
    originalGridArea.value = gridArea.value ? { ...gridArea.value } : null;

    selectedLineId.value = null;
    activeTool.value = 'select';
    isEditorActive.value = true;
  }

  function resetLines() {
    horizontalLines.value = deepCloneLines(originalHorizontalLines.value);
    verticalLines.value = deepCloneLines(originalVerticalLines.value);
    gridArea.value = originalGridArea.value ? { ...originalGridArea.value } : null;
    selectedLineId.value = null;
    activeTool.value = 'select';
  }

  function selectLine(id) {
    selectedLineId.value = id;
  }

  function deselectLine() {
    selectedLineId.value = null;
  }

  function deleteSelectedLine() {
    if (!selectedLineId.value) return;

    const hIdx = horizontalLines.value.findIndex(l => l.id === selectedLineId.value);
    if (hIdx !== -1) {
      horizontalLines.value.splice(hIdx, 1);
      selectedLineId.value = null;
      return;
    }

    const vIdx = verticalLines.value.findIndex(l => l.id === selectedLineId.value);
    if (vIdx !== -1) {
      verticalLines.value.splice(vIdx, 1);
      selectedLineId.value = null;
      return;
    }
  }

  function moveLine(id, newPosition) {
    // Horizontal lines: only Y changes
    const hLine = horizontalLines.value.find(l => l.id === id);
    if (hLine) {
      const clamped = Math.max(0, Math.min(newPosition, imageHeight.value));
      hLine.y1 = clamped;
      hLine.y2 = clamped;
      return;
    }

    // Vertical lines: only X changes
    const vLine = verticalLines.value.find(l => l.id === id);
    if (vLine) {
      const clamped = Math.max(0, Math.min(newPosition, imageWidth.value));
      vLine.x1 = clamped;
      vLine.x2 = clamped;
      return;
    }
  }

  function addHorizontalLine(yPosition) {
    const area = gridArea.value;
    const x1 = area ? area.x : 0;
    const x2 = area ? area.x + area.width : imageWidth.value;
    const y = Math.max(0, Math.min(yPosition, imageHeight.value));

    const line = assignId({
      x1,
      y1: y,
      x2,
      y2: y,
      isGridBorder: false,
      isHorizontalGridLine: true,
      isVerticalGridLine: false,
      detectionMethod: 'manual',
      confidence: 1
    });

    horizontalLines.value.push(line);
    return line.id;
  }

  function addVerticalLine(xPosition) {
    const area = gridArea.value;
    const y1 = area ? area.y : 0;
    const y2 = area ? area.y + area.height : imageHeight.value;
    const x = Math.max(0, Math.min(xPosition, imageWidth.value));

    const line = assignId({
      x1: x,
      y1,
      x2: x,
      y2,
      isGridBorder: false,
      isHorizontalGridLine: false,
      isVerticalGridLine: true,
      detectionMethod: 'manual',
      confidence: 1
    });

    verticalLines.value.push(line);
    return line.id;
  }

  function setGridArea(rect) {
    gridArea.value = {
      x: Math.max(0, rect.x),
      y: Math.max(0, rect.y),
      width: Math.min(rect.width, imageWidth.value - rect.x),
      height: Math.min(rect.height, imageHeight.value - rect.y)
    };
  }

  function setActiveTool(tool) {
    activeTool.value = tool;
    if (tool !== 'select') {
      selectedLineId.value = null;
    }
  }

  function buildGridResult() {
    // Strip IDs and return a gridResult-compatible object
    const stripId = ({ id, ...rest }) => rest;

    return {
      horizontalLines: horizontalLines.value.map(stripId),
      verticalLines: verticalLines.value.map(stripId),
      gridArea: gridArea.value ? { ...gridArea.value } : null,
      gridFound: true,
      medianCellWidth: medianCellWidth.value,
      medianCellHeight: medianCellHeight.value
    };
  }

  function deactivate() {
    isEditorActive.value = false;
    selectedLineId.value = null;
    horizontalLines.value = [];
    verticalLines.value = [];
    gridArea.value = null;
  }

  return {
    // State
    horizontalLines,
    verticalLines,
    gridArea,
    activeTool,
    selectedLineId,
    selectedLine,
    allLines,
    isEditorActive,
    imageWidth,
    imageHeight,
    medianCellWidth,
    medianCellHeight,

    // Actions
    initFromGridResult,
    resetLines,
    selectLine,
    deselectLine,
    deleteSelectedLine,
    moveLine,
    addHorizontalLine,
    addVerticalLine,
    setGridArea,
    setActiveTool,
    buildGridResult,
    deactivate
  };
}
