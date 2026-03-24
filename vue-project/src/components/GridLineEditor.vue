<template>
  <div class="grid-line-editor">
    <!-- SVG Overlay -->
    <svg
      ref="svgRef"
      class="grid-line-svg"
      :class="{ 'capture-clicks': activeTool !== 'select' || isDragging }"
      :viewBox="`0 0 ${imageWidth} ${imageHeight}`"
      preserveAspectRatio="xMidYMid meet"
      @mousedown="onSvgMouseDown"
      @mousemove="onSvgMouseMove"
      @mouseup="onSvgMouseUp"
      @touchstart.prevent="onSvgTouchStart"
      @touchmove.prevent="onSvgTouchMove"
      @touchend="onSvgTouchEnd"
    >
      <!-- Grid area rectangle -->
      <rect
        v-if="gridArea"
        :x="gridArea.x"
        :y="gridArea.y"
        :width="gridArea.width"
        :height="gridArea.height"
        fill="none"
        stroke="lime"
        :stroke-width="borderStrokeWidth"
        stroke-dasharray="8,4"
        class="grid-border-rect"
      />

      <!-- Horizontal lines -->
      <line
        v-for="line in horizontalLines"
        :key="'h-' + line.id"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :stroke="line.id === selectedLineId ? '#ffdd00' : (line.isGridBorder ? 'lime' : '#ff4444')"
        :stroke-width="lineStrokeWidth"
        :class="['grid-line', { selected: line.id === selectedLineId }]"
      />

      <!-- Vertical lines -->
      <line
        v-for="line in verticalLines"
        :key="'v-' + line.id"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :stroke="line.id === selectedLineId ? '#ffdd00' : (line.isGridBorder ? 'lime' : '#4488ff')"
        :stroke-width="lineStrokeWidth"
        :class="['grid-line', { selected: line.id === selectedLineId }]"
      />

      <!-- Delete button for selected line -->
      <foreignObject
        v-if="selectedLine && deleteButtonPos"
        :x="deleteButtonPos.x - scaledDeleteSize / 2"
        :y="deleteButtonPos.y - scaledDeleteSize / 2"
        :width="scaledDeleteSize"
        :height="scaledDeleteSize"
      >
        <button
          class="delete-line-btn"
          :style="{ width: scaledDeleteSize + 'px', height: scaledDeleteSize + 'px', fontSize: (scaledDeleteSize * 0.5) + 'px' }"
          @click.stop="onDeleteSelected"
          @mousedown.stop
          @touchstart.stop
          title="Delete line"
        >
          <font-awesome-icon :icon="['fas', 'xmark']" />
        </button>
      </foreignObject>

      <!-- Preview line while adding -->
      <line
        v-if="previewLine"
        :x1="previewLine.x1"
        :y1="previewLine.y1"
        :x2="previewLine.x2"
        :y2="previewLine.y2"
        stroke="#ffdd00"
        :stroke-width="lineStrokeWidth"
        stroke-dasharray="6,3"
        opacity="0.7"
      />

      <!-- Preview rect while adding border -->
      <rect
        v-if="previewRect"
        :x="previewRect.x"
        :y="previewRect.y"
        :width="previewRect.width"
        :height="previewRect.height"
        fill="none"
        stroke="#ffdd00"
        :stroke-width="borderStrokeWidth"
        stroke-dasharray="6,3"
        opacity="0.7"
      />
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useGridLineEditor } from '@/composables/useGridLineEditor';

const props = defineProps({
  gridResult: { type: Object, required: true },
  imageWidth: { type: Number, required: true },
  imageHeight: { type: Number, required: true }
});

const emit = defineEmits(['confirm', 'reset']);

const svgRef = ref(null);

const {
  horizontalLines,
  verticalLines,
  gridArea,
  activeTool,
  selectedLineId,
  selectedLine,
  allLines,
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
  buildGridResult
} = useGridLineEditor();

// Drag state
const isDragging = ref(false);
const dragStartPos = ref(null);
const dragLineOriginalPos = ref(null);

// Preview state for add tools
const previewLine = ref(null);
const previewRect = ref(null);
const borderDragStart = ref(null);

// Scaling for line widths based on image dimensions
const lineStrokeWidth = computed(() => {
  const dim = Math.max(props.imageWidth, props.imageHeight);
  return Math.max(0.5, Math.min(2, dim / 800));
});

const borderStrokeWidth = computed(() => lineStrokeWidth.value * 1.5);

const hitThreshold = computed(() => {
  const dim = Math.max(props.imageWidth, props.imageHeight);
  return Math.max(5, Math.min(15, dim / 150));
});

const scaledDeleteSize = computed(() => {
  const dim = Math.max(props.imageWidth, props.imageHeight);
  return Math.max(20, Math.min(40, dim / 50));
});

// Position for delete button (midpoint of selected line)
const deleteButtonPos = computed(() => {
  if (!selectedLine.value) return null;
  const l = selectedLine.value;
  return {
    x: (l.x1 + l.x2) / 2,
    y: (l.y1 + l.y2) / 2
  };
});

// Determine if a line is horizontal or vertical
function isHorizontalLine(lineId) {
  return horizontalLines.value.some(l => l.id === lineId);
}

// Find the nearest line to a point
function findNearestLine(svgPos) {
  let nearest = null;
  let minDist = hitThreshold.value;

  for (const line of horizontalLines.value) {
    // Distance from point to horizontal line = |point.y - line.y|
    // But only if point.x is within line's x range
    if (svgPos.x >= Math.min(line.x1, line.x2) && svgPos.x <= Math.max(line.x1, line.x2)) {
      const dist = Math.abs(svgPos.y - line.y1);
      if (dist < minDist) {
        minDist = dist;
        nearest = line;
      }
    }
  }

  for (const line of verticalLines.value) {
    // Distance from point to vertical line = |point.x - line.x|
    if (svgPos.y >= Math.min(line.y1, line.y2) && svgPos.y <= Math.max(line.y1, line.y2)) {
      const dist = Math.abs(svgPos.x - line.x1);
      if (dist < minDist) {
        minDist = dist;
        nearest = line;
      }
    }
  }

  return nearest;
}

// Convert screen coords to SVG (image pixel) coords
function screenToSvgCoords(event) {
  const svg = svgRef.value;
  if (!svg) return { x: 0, y: 0 };
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

function getTouchCoords(event) {
  if (event.touches && event.touches.length > 0) {
    return { clientX: event.touches[0].clientX, clientY: event.touches[0].clientY };
  }
  return { clientX: event.clientX, clientY: event.clientY };
}

// --- Line drag ---

function startLineDrag(line, event) {
  isDragging.value = true;
  const svgPos = screenToSvgCoords(event);
  dragStartPos.value = svgPos;

  if (isHorizontalLine(line.id)) {
    dragLineOriginalPos.value = line.y1;
  } else {
    dragLineOriginalPos.value = line.x1;
  }
}

// --- SVG-level mouse handlers ---

function onSvgMouseDown(event) {
  const svgPos = screenToSvgCoords(event);

  if (activeTool.value === 'addHorizontal') {
    event.stopPropagation();
    const id = addHorizontalLine(svgPos.y);
    selectLine(id);
    setActiveTool('select');
    return;
  }

  if (activeTool.value === 'addVertical') {
    event.stopPropagation();
    const id = addVerticalLine(svgPos.x);
    selectLine(id);
    setActiveTool('select');
    return;
  }

  if (activeTool.value === 'addBorder') {
    event.stopPropagation();
    borderDragStart.value = svgPos;
    previewRect.value = { x: svgPos.x, y: svgPos.y, width: 0, height: 0 };
    return;
  }

  // Select tool — find nearest line
  if (activeTool.value === 'select') {
    const nearest = findNearestLine(svgPos);
    if (nearest) {
      event.stopPropagation();
      event.preventDefault();
      selectLine(nearest.id);
      startLineDrag(nearest, event);
    } else {
      deselectLine();
      // Let event bubble for pan
    }
  }
}

function onSvgMouseMove(event) {
  const svgPos = screenToSvgCoords(event);

  // Dragging a selected line
  if (isDragging.value && selectedLineId.value && dragStartPos.value != null) {
    event.stopPropagation();
    event.preventDefault();

    if (isHorizontalLine(selectedLineId.value)) {
      const delta = svgPos.y - dragStartPos.value.y;
      moveLine(selectedLineId.value, dragLineOriginalPos.value + delta);
    } else {
      const delta = svgPos.x - dragStartPos.value.x;
      moveLine(selectedLineId.value, dragLineOriginalPos.value + delta);
    }
    return;
  }

  // Border drag preview
  if (activeTool.value === 'addBorder' && borderDragStart.value) {
    event.stopPropagation();
    const x = Math.min(borderDragStart.value.x, svgPos.x);
    const y = Math.min(borderDragStart.value.y, svgPos.y);
    const w = Math.abs(svgPos.x - borderDragStart.value.x);
    const h = Math.abs(svgPos.y - borderDragStart.value.y);
    previewRect.value = { x, y, width: w, height: h };
    return;
  }

  // Preview line for add tools
  if (activeTool.value === 'addHorizontal') {
    const area = gridArea.value;
    previewLine.value = {
      x1: area ? area.x : 0,
      y1: svgPos.y,
      x2: area ? area.x + area.width : props.imageWidth,
      y2: svgPos.y
    };
    return;
  }

  if (activeTool.value === 'addVertical') {
    const area = gridArea.value;
    previewLine.value = {
      x1: svgPos.x,
      y1: area ? area.y : 0,
      x2: svgPos.x,
      y2: area ? area.y + area.height : props.imageHeight
    };
    return;
  }
}

function onSvgMouseUp() {
  // Finish border drag
  if (activeTool.value === 'addBorder' && borderDragStart.value && previewRect.value) {
    if (previewRect.value.width > 10 && previewRect.value.height > 10) {
      setGridArea(previewRect.value);
    }
    borderDragStart.value = null;
    previewRect.value = null;
    setActiveTool('select');
  }

  finishDrag();
}

function finishDrag() {
  isDragging.value = false;
  dragStartPos.value = null;
  dragLineOriginalPos.value = null;
}

// --- Touch handlers ---

function onSvgTouchStart(event) {
  if (event.touches.length !== 1) return;
  const coords = getTouchCoords(event);
  onSvgMouseDown({ ...coords, stopPropagation: () => event.stopPropagation(), preventDefault: () => event.preventDefault() });
}

function onSvgTouchMove(event) {
  if (event.touches.length !== 1) return;
  const coords = getTouchCoords(event);
  onSvgMouseMove({ ...coords, stopPropagation: () => event.stopPropagation(), preventDefault: () => event.preventDefault() });
}

function onSvgTouchEnd() {
  if (activeTool.value === 'addBorder' && borderDragStart.value && previewRect.value) {
    if (previewRect.value.width > 10 && previewRect.value.height > 10) {
      setGridArea(previewRect.value);
    }
    borderDragStart.value = null;
    previewRect.value = null;
    setActiveTool('select');
  }
  finishDrag();
}

// --- Delete ---

function onDeleteSelected() {
  deleteSelectedLine();
}

// --- Confirm / Reset ---

function onConfirm() {
  const result = buildGridResult();
  emit('confirm', result);
}

function onReset() {
  resetLines();
  previewLine.value = null;
  previewRect.value = null;
  emit('reset');
}

// --- Keyboard shortcuts ---

function onKeyDown(event) {
  if (event.key === 'Escape') {
    deselectLine();
    if (activeTool.value !== 'select') {
      setActiveTool('select');
      previewLine.value = null;
      previewRect.value = null;
    }
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedLineId.value) {
    deleteSelectedLine();
  }
}

// Clean up preview when tool changes
watch(activeTool, () => {
  previewLine.value = null;
  previewRect.value = null;
  borderDragStart.value = null;
});

// Init from props
onMounted(() => {
  initFromGridResult(props.gridResult, props.imageWidth, props.imageHeight);
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});

// Expose methods for parent toolbar
defineExpose({
  activeTool,
  selectedLineId,
  setActiveTool,
  onReset,
  onConfirm,
  onDeleteSelected
});
</script>

<style scoped>
.grid-line-editor {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.grid-line-svg {
  width: 100%;
  height: 100%;
  pointer-events: auto;
  cursor: default;
}

.grid-line-svg.capture-clicks {
  cursor: crosshair;
}

.grid-line {
  pointer-events: none;
}

.grid-line.selected {
  filter: drop-shadow(0 0 3px #ffdd00) drop-shadow(0 0 6px #ffdd00);
}

.grid-border-rect {
  pointer-events: none;
}

.delete-line-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  pointer-events: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: background 0.15s ease;
}

.delete-line-btn:hover {
  background: rgba(239, 68, 68, 1);
}
</style>
