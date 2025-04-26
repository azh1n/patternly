<template>
  <div class="crochet-notation-view">
    <div class="notation-header">
      <h4>Crochet Chart Notation</h4>
      <div class="pattern-info">
        <div class="pattern-shape-indicator">
          <span class="shape-label">Pattern Shape:</span>
          <span class="shape-value" :class="patternShape.type">
            {{ patternShape.type === 'circular' ? 'Circular' : patternShape.type === 'rectangular' ? 'Rectangular' : 'Unknown' }}
            <span class="confidence-indicator" v-if="patternShape.type !== 'unknown'">
              ({{ Math.round(patternShape.confidence * 100) }}% confidence)
            </span>
          </span>
        </div>
      </div>
      <div class="view-toggle">
        <button 
          @click="viewMode = 'linear'" 
          :class="{ active: viewMode === 'linear' }"
          title="Show linear notation"
        >
          Linear
        </button>
        <button 
          @click="viewMode = 'circular'" 
          :class="{ active: viewMode === 'circular' }"
          title="Show circular notation"
        >
          Circular
        </button>
        <button 
          v-if="patternShape.type === 'circular' || viewMode === '3d'"
          @click="viewMode = '3d'" 
          :class="{ active: viewMode === '3d' }"
          title="Show 3D visualization"
        >
          3D View
        </button>
      </div>
    </div>

    <!-- Linear notation view -->
    <div v-if="viewMode === 'linear'" class="linear-notation">
      <div v-for="(row, rowIndex) in rows" :key="`row-${rowIndex}`" class="notation-row">
        <div class="row-header">
          <span class="row-number">Row {{ row.number }}</span>
          <div v-if="row.color" class="color-indicator" :style="{ backgroundColor: getColorHex(row.color) }"></div>
        </div>
        
        <div class="row-stitches">
          <!-- Handle repeated stitches -->
          <template v-if="row.stitches && row.stitches.repeated">
            <!-- Before repeat -->
            <StitchSymbol 
              v-for="(stitch, i) in row.stitches.beforeRepeat" 
              :key="`before-${i}`"
              :stitch="stitch"
            />
            
            <!-- Repeat group -->
            <div class="repeat-group">
              <span class="repeat-bracket left-bracket">(</span>
              
              <StitchSymbol 
                v-for="(stitch, i) in row.stitches.repeatedStitches" 
                :key="`rep-${i}`"
                :stitch="stitch"
              />
              
              <span class="repeat-bracket right-bracket">)</span>
              <span class="repeat-count">x{{ row.stitches.repeatCount }}</span>
            </div>
            
            <!-- After repeat -->
            <StitchSymbol 
              v-for="(stitch, i) in row.stitches.afterRepeat" 
              :key="`after-${i}`"
              :stitch="stitch"
            />
          </template>
          
          <!-- Regular stitches -->
          <template v-else-if="row.stitches && Array.isArray(row.stitches)">
            <template v-for="(stitch, i) in row.stitches" :key="`stitch-${i}`">
              <!-- For repeated stitches, display them separately -->
              <template v-if="getStitchCount(stitch) > 1 && displayRepeatedStitchesSeparately">
                <StitchSymbol 
                  v-for="j in getStitchCount(stitch)" 
                  :key="`stitch-${i}-${j}`"
                  :stitch="getStitchType(stitch)"
                  :showCount="false"
                />
              </template>
              <!-- Display as single stitch with count -->
              <StitchSymbol 
                v-else
                :stitch="stitch"
              />
            </template>
          </template>
          
          <!-- No stitches detected -->
          <div v-else class="no-stitches-message">
            No stitches detected. Original text: {{ row.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- Circular notation view -->
    <div v-else-if="viewMode === 'circular'" class="circular-notation">
      <!-- Control buttons -->
      <div class="view-controls">
        <div class="zoom-controls">
          <button @click="zoomIn" class="zoom-btn" title="Zoom in">
            <span class="zoom-icon">+</span>
          </button>
          <button @click="resetZoom" class="zoom-btn" title="Reset zoom">
            <span class="zoom-icon">⟲</span>
          </button>
          <button @click="zoomOut" class="zoom-btn" title="Zoom out">
            <span class="zoom-icon">-</span>
          </button>
        </div>
        <button 
          @click="toggleMultipleRowsView" 
          class="multi-row-btn" 
          :class="{ active: showMultipleRows }"
          title="Toggle multiple rows view"
        >
          <span v-if="showMultipleRows">Single Row</span>
          <span v-else>Multiple Rows</span>
        </button>
      </div>
      
      <div 
        class="circular-container" 
        ref="circularContainer"
        @mousedown="startPan"
        @mousemove="pan"
        @mouseup="endPan"
        @mouseleave="endPan"
        @wheel="handleZoom"
      >
        <svg 
          :width="svgSize" 
          :height="svgSize" 
          :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`" 
          class="circular-chart"
        >
          <!-- Background grid for reference -->
          <g class="grid-lines">
            <!-- Horizontal grid lines -->
            <line 
              v-for="i in 10" 
              :key="`h-grid-${i}`"
              :x1="0" 
              :y1="i * (svgSize / 10)" 
              :x2="svgSize" 
              :y2="i * (svgSize / 10)" 
              class="grid-line"
            />
            <!-- Vertical grid lines -->
            <line 
              v-for="i in 10" 
              :key="`v-grid-${i}`"
              :x1="i * (svgSize / 10)" 
              :y1="0" 
              :x2="i * (svgSize / 10)" 
              :y2="svgSize" 
              class="grid-line"
            />
          </g>
          
          <!-- Draw concentric circles for each row -->
          <circle 
            v-for="(row, index) in rows" 
            :key="`circle-${index}`"
            :cx="centerX" 
            :cy="centerY" 
            :r="getRowRadius(index)" 
            fill="none" 
            stroke="currentColor" 
            :class="{ 'active-row': index === activeRowIndex }"
          />
          
          <!-- Draw all rows with their stitches -->
          <g v-for="(row, rowIndex) in rows" :key="`row-${rowIndex}`" 
             :class="{ 
               'active-row-group': rowIndex === activeRowIndex,
               'visible-row-group': isRowVisible(rowIndex)
             }">
            <!-- Draw connecting lines between stitches in the same row -->
            <g class="connecting-lines" v-if="isRowVisible(rowIndex) && getRowStitches(row).length > 1">
              <path 
                :d="getStitchConnectionPath(getRowStitches(row), rowIndex)" 
                class="stitch-connection"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
                stroke-dasharray="4,2"
                :class="{ 'active-connection': rowIndex === activeRowIndex }"
              />
            </g>
            
            <!-- Draw connecting lines to previous row if not first row -->
            <g class="row-connections" v-if="rowIndex > 0 && isRowVisible(rowIndex) && isRowVisible(rowIndex-1)">
              <line 
                v-for="(stitch, stitchIndex) in getRowStitches(row)" 
                :key="`connection-${rowIndex}-${stitchIndex}`"
                :x1="getStitchCenterX(stitchIndex, getRowStitches(row).length, rowIndex)" 
                :y1="getStitchCenterY(stitchIndex, getRowStitches(row).length, rowIndex)"
                :x2="getClosestPreviousStitchX(stitchIndex, rowIndex)" 
                :y2="getClosestPreviousStitchY(stitchIndex, rowIndex)"
                class="row-connection"
                stroke="currentColor"
                stroke-width="1"
                :class="{ 'active-connection': rowIndex === activeRowIndex }"
              />
            </g>
            
            <!-- Draw row number at appropriate positions -->
            <text 
              v-if="isRowVisible(rowIndex)"
              :x="centerX + getRowRadius(rowIndex) + 10" 
              :y="centerY" 
              font-size="12" 
              fill="currentColor"
              class="row-number-label"
              :class="{ 'active-label': rowIndex === activeRowIndex }"
            >
              Row {{ row.number }}
            </text>
            
            <!-- Draw stitches for visible rows -->
            <g v-if="isRowVisible(rowIndex)">
              <g v-if="getRowStitches(row).length > 0">
                <g 
                  v-for="(stitch, stitchIndex) in getRowStitches(row)" 
                  :key="`stitch-${rowIndex}-${stitchIndex}`"
                  :transform="`translate(${getStitchCenterX(stitchIndex, getRowStitches(row).length, rowIndex)}, ${getStitchCenterY(stitchIndex, getRowStitches(row).length, rowIndex)})`"
                  class="stitch-symbol-container"
                >
                  <g :transform="`rotate(${getStitchRotation(stitchIndex, getRowStitches(row).length)})`">
                  <foreignObject 
                    x="-15"
                    y="-15"
                    width="30"
                    height="30"
                  >
                    <StitchSymbol 
                      :stitch="stitch"
                      :showCount="false"
                      class="circular-stitch"
                      :class="{ 'active-stitch': rowIndex === activeRowIndex }"
                    />
                  </foreignObject>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </svg>
        
        <!-- Row selector for circular view -->
        <div class="row-selector">
          <button 
            v-for="(row, index) in rows" 
            :key="`selector-${index}`"
            @click="showMultipleRows ? toggleRowVisibility(index) : selectRow(index)"
            :class="{ 
              'active': index === activeRowIndex,
              'visible': isRowVisible(index) && showMultipleRows
            }"
            :title="showMultipleRows ? 'Toggle row visibility' : 'Set as active row'"
          >
            {{ row.number }}
          </button>
        </div>
      </div>
    </div>

    <!-- 3D View -->
    <div v-else-if="viewMode === '3d'" class="threed-view-container">
      <Crochet3DView :rows="rows" />
    </div>
    
    <!-- Stitch key -->
    <div class="stitch-key">
      <h5>Stitch Key</h5>
      <div class="key-items">
        <div v-for="(symbol, abbr) in commonStitches" :key="abbr" class="key-item">
          <StitchSymbol :stitch="abbr" :showCount="false" />
          <span class="key-label">{{ symbol.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import StitchSymbol from './StitchSymbol.vue';
import Crochet3DView from './Crochet3DView.vue';
import { detectPatternShape } from '@/utils/patternShapeDetector';

const props = defineProps({
  rows: {
    type: Array,
    required: true
  },
  rawContent: {
    type: String,
    default: ''
  }
});

// View mode (linear, circular, or 3d)
const viewMode = ref('linear');

// Pattern shape detection
const patternShape = ref({ type: 'unknown', confidence: 0 });

// Detect pattern shape when rows or content changes
watch(() => [props.rows, props.rawContent], () => {
  patternShape.value = detectPatternShape(props.rows, props.rawContent);
  
  // Auto-switch to circular or 3d view if pattern is detected as circular with high confidence
  if (patternShape.value.type === 'circular' && patternShape.value.confidence > 0.8 && viewMode.value === 'linear') {
    viewMode.value = 'circular';
  }
}, { immediate: true, deep: true });

// SVG dimensions for circular view
const svgSize = 500;
const centerX = svgSize / 2;
const centerY = svgSize / 2;
const baseRadius = 30;
const radiusIncrement = 20;

// Active row for circular view
const activeRowIndex = ref(0);
const activeRow = computed(() => {
  return props.rows[activeRowIndex.value] || null;
});

// Multiple row selection
const visibleRows = ref([0]); // Start with just the first row visible
const showMultipleRows = ref(false);

const toggleRowVisibility = (rowIndex) => {
  if (visibleRows.value.includes(rowIndex)) {
    // If already visible and not the only visible row, remove it
    if (visibleRows.value.length > 1) {
      visibleRows.value = visibleRows.value.filter(index => index !== rowIndex);
    }
  } else {
    // Add to visible rows
    visibleRows.value.push(rowIndex);
  }
};

// When clicking a row number, make it active and visible
const selectRow = (rowIndex) => {
  activeRowIndex.value = rowIndex;
  if (!visibleRows.value.includes(rowIndex)) {
    visibleRows.value.push(rowIndex);
  }
};

// Helper function to safely check if a row is visible
const isRowVisible = (rowIndex) => {
  return visibleRows.value && visibleRows.value.includes(rowIndex);
};

// Zoom and pan functionality
const zoomLevel = ref(1);
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const circularContainer = ref(null);

// Computed viewBox for SVG
const viewBox = computed(() => {
  const width = svgSize / zoomLevel.value;
  const height = svgSize / zoomLevel.value;
  const x = centerX - (width / 2) + panOffset.value.x;
  const y = centerY - (height / 2) + panOffset.value.y;
  return { x, y, width, height };
});

// Zoom functions
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value * 1.2, 5);
};

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value / 1.2, 0.5);
};

const resetZoom = () => {
  zoomLevel.value = 1;
  panOffset.value = { x: 0, y: 0 };
};

const handleZoom = (event) => {
  event.preventDefault();
  if (event.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
};

// Pan functions
const startPan = (event) => {
  if (event.button === 0) { // Left mouse button
    isPanning.value = true;
    panStart.value = {
      x: event.clientX,
      y: event.clientY
    };
  }
};

const pan = (event) => {
  if (!isPanning.value) return;
  
  const dx = (event.clientX - panStart.value.x) / zoomLevel.value;
  const dy = (event.clientY - panStart.value.y) / zoomLevel.value;
  
  panOffset.value = {
    x: panOffset.value.x - dx,
    y: panOffset.value.y - dy
  };
  
  panStart.value = {
    x: event.clientX,
    y: event.clientY
  };
};

const endPan = () => {
  isPanning.value = false;
};

// Option to display repeated stitches separately
const displayRepeatedStitchesSeparately = ref(true);

// Extract count from stitch string (e.g., "3dc" -> 3)
const getStitchCount = (stitch) => {
  const match = stitch.match(/^(\d+)/);
  return match ? parseInt(match[1]) : 1;
};

// Extract stitch type from stitch string (e.g., "3dc" -> "dc")
const getStitchType = (stitch) => {
  const match = stitch.match(/^(\d+)?([a-zA-Z]+)/);
  return match ? match[2] : stitch;
};

// Get radius for a specific row
const getRowRadius = (rowIndex) => {
  // Use a logarithmic scale for row spacing to handle many rows more compactly
  // First few rows have more space, then spacing decreases for higher row numbers
  if (rowIndex <= 3) {
    return baseRadius + (rowIndex * radiusIncrement);
  } else {
    const additionalRows = rowIndex - 3;
    return baseRadius + (3 * radiusIncrement) + (additionalRows * (radiusIncrement / 2));
  }
};

// Calculate X position for a stitch in circular view
const getStitchX = (index, total, rowIndex = activeRowIndex.value) => {
  const angle = (index / total) * 2 * Math.PI;
  const radius = getRowRadius(rowIndex);
  return centerX + radius * Math.cos(angle - Math.PI/2) - 15;
};

const getStitchY = (index, total, rowIndex = activeRowIndex.value) => {
  const angle = (index / total) * 2 * Math.PI;
  const radius = getRowRadius(rowIndex);
  return centerY + radius * Math.sin(angle - Math.PI/2) - 15;
};

// Get the center position of a stitch (for connecting lines)
const getStitchCenterX = (index, total, rowIndex = activeRowIndex.value) => {
  const angle = (index / total) * 2 * Math.PI;
  const radius = getRowRadius(rowIndex);
  return centerX + radius * Math.cos(angle - Math.PI/2);
};

const getStitchCenterY = (index, total, rowIndex = activeRowIndex.value) => {
  const angle = (index / total) * 2 * Math.PI;
  const radius = getRowRadius(rowIndex);
  return centerY + radius * Math.sin(angle - Math.PI/2);
};

// Calculate rotation angle for a stitch so bottom faces center
const getStitchRotation = (index, total) => {
  // Calculate the angle of the stitch from the center (in radians)
  const angleRad = (index / total) * 2 * Math.PI - Math.PI/2;
  // Convert to degrees and adjust so the bottom end faces the center
  // We need to rotate in the opposite direction of the angle
  const angleDeg = (angleRad * 180 / Math.PI) + 90;
  return angleDeg;
};

// Find the closest stitch in the previous row for connecting lines
const getClosestPreviousStitchX = (currentIndex, currentRowIndex) => {
  if (currentRowIndex <= 0) return centerX;
  
  const prevRow = props.rows[currentRowIndex - 1];
  const prevRowStitches = getRowStitches(prevRow);
  if (!prevRowStitches.length) return centerX;
  
  const currentTotal = getRowStitches(props.rows[currentRowIndex]).length;
  const prevTotal = prevRowStitches.length;
  
  // Find the closest angle match in the previous row
  const currentAngle = (currentIndex / currentTotal) * 2 * Math.PI;
  let closestIndex = 0;
  let minAngleDiff = Infinity;
  
  for (let i = 0; i < prevTotal; i++) {
    const prevAngle = (i / prevTotal) * 2 * Math.PI;
    const angleDiff = Math.abs(currentAngle - prevAngle);
    if (angleDiff < minAngleDiff) {
      minAngleDiff = angleDiff;
      closestIndex = i;
    }
  }
  
  return getStitchCenterX(closestIndex, prevTotal, currentRowIndex - 1);
};

const getClosestPreviousStitchY = (currentIndex, currentRowIndex) => {
  if (currentRowIndex <= 0) return centerY;
  
  const prevRow = props.rows[currentRowIndex - 1];
  const prevRowStitches = getRowStitches(prevRow);
  if (!prevRowStitches.length) return centerY;
  
  const currentTotal = getRowStitches(props.rows[currentRowIndex]).length;
  const prevTotal = prevRowStitches.length;
  
  // Find the closest angle match in the previous row
  const currentAngle = (currentIndex / currentTotal) * 2 * Math.PI;
  let closestIndex = 0;
  let minAngleDiff = Infinity;
  
  for (let i = 0; i < prevTotal; i++) {
    const prevAngle = (i / prevTotal) * 2 * Math.PI;
    const angleDiff = Math.abs(currentAngle - prevAngle);
    if (angleDiff < minAngleDiff) {
      minAngleDiff = angleDiff;
      closestIndex = i;
    }
  }
  
  return getStitchCenterY(closestIndex, prevTotal, currentRowIndex - 1);
};

// Generate a path for connecting stitches in the same row
const getStitchConnectionPath = (stitches, rowIndex) => {
  if (!stitches || stitches.length < 2) return '';
  
  const total = stitches.length;
  let path = `M ${getStitchCenterX(0, total, rowIndex)} ${getStitchCenterY(0, total, rowIndex)}`;
  
  for (let i = 1; i < total; i++) {
    path += ` L ${getStitchCenterX(i, total, rowIndex)} ${getStitchCenterY(i, total, rowIndex)}`;
  }
  
  // Close the path for a complete circle
  path += ` L ${getStitchCenterX(0, total, rowIndex)} ${getStitchCenterY(0, total, rowIndex)}`;
  
  return path;
};

// Get all stitches for a row, handling both regular and repeated stitch formats
const getRowStitches = (row) => {
  if (!row || !row.stitches) return [];
  
  if (Array.isArray(row.stitches)) {
    if (displayRepeatedStitchesSeparately.value) {
      // Expand repeated stitches into individual stitches
      const expandedStitches = [];
      row.stitches.forEach(stitch => {
        const count = getStitchCount(stitch);
        const type = getStitchType(stitch);
        for (let i = 0; i < count; i++) {
          expandedStitches.push(type);
        }
      });
      return expandedStitches;
    }
    return row.stitches;
  } else if (row.stitches.repeated) {
    return getExpandedStitches(row.stitches);
  }
  
  return [];
};

// Calculate the total count of stitches when expanded
const getExpandedStitchesCount = (stitches, upToIndex = null) => {
  let count = 0;
  const limit = upToIndex !== null ? upToIndex : stitches.length;
  
  for (let i = 0; i < limit; i++) {
    if (displayRepeatedStitchesSeparately.value) {
      count += getStitchCount(stitches[i]);
    } else {
      count += 1;
    }
  }
  
  return count;
};

// Calculate the index for a stitch in the expanded view
const getExpandedStitchIndex = (stitches, index) => {
  if (!displayRepeatedStitchesSeparately.value) return index;
  
  let expandedIndex = 0;
  for (let i = 0; i < index; i++) {
    expandedIndex += getStitchCount(stitches[i]);
  }
  
  return expandedIndex;
};

// Expand repeated stitches for circular view
const getExpandedStitches = (repeatedStitches) => {
  const result = [];
  
  // Add before repeat stitches
  if (repeatedStitches.beforeRepeat) {
    if (displayRepeatedStitchesSeparately.value) {
      // Expand each stitch based on its count
      repeatedStitches.beforeRepeat.forEach(stitch => {
        const count = getStitchCount(stitch);
        const type = getStitchType(stitch);
        for (let i = 0; i < count; i++) {
          result.push(type);
        }
      });
    } else {
      result.push(...repeatedStitches.beforeRepeat);
    }
  }
  
  // Add repeated stitches
  if (repeatedStitches.repeatedStitches && repeatedStitches.repeatCount) {
    for (let i = 0; i < repeatedStitches.repeatCount; i++) {
      if (displayRepeatedStitchesSeparately.value) {
        // Expand each stitch based on its count
        repeatedStitches.repeatedStitches.forEach(stitch => {
          const count = getStitchCount(stitch);
          const type = getStitchType(stitch);
          for (let j = 0; j < count; j++) {
            result.push(type);
          }
        });
      } else {
        result.push(...repeatedStitches.repeatedStitches);
      }
    }
  }
  
  // Add after repeat stitches
  if (repeatedStitches.afterRepeat) {
    if (displayRepeatedStitchesSeparately.value) {
      // Expand each stitch based on its count
      repeatedStitches.afterRepeat.forEach(stitch => {
        const count = getStitchCount(stitch);
        const type = getStitchType(stitch);
        for (let i = 0; i < count; i++) {
          result.push(type);
        }
      });
    } else {
      result.push(...repeatedStitches.afterRepeat);
    }
  }
  
  return result;
};

// Color hex mapping
const getColorHex = (colorName) => {
  const colorMap = {
    'red': '#ff5252',
    'blue': '#4f87ff',
    'green': '#4caf50',
    'yellow': '#ffc107',
    'purple': '#9c27b0',
    'pink': '#e91e63',
    'orange': '#ff9800',
    'teal': '#009688',
    'brown': '#795548',
    'gray': '#9e9e9e',
    'black': '#000000',
    'white': '#ffffff'
  };
  
  return colorMap[colorName.toLowerCase()] || colorName;
};

// Common stitches for the key
const commonStitches = {
  'ch': { label: 'Chain (ch)' },
  'sl': { label: 'Slip Stitch (sl st)' },
  'sc': { label: 'Single Crochet (sc)' },
  'hdc': { label: 'Half Double Crochet (hdc)' },
  'dc': { label: 'Double Crochet (dc)' },
  'tr': { label: 'Treble Crochet (tr)' },
  'dtr': { label: 'Double Treble Crochet (dtr)' }
};
</script>

<style scoped>
.crochet-notation-view {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--card-bg, #2a2a2a);
  border-radius: 8px;
  border: 1px solid var(--border-color, #444);
}

.notation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.notation-header h4 {
  margin: 0;
  color: var(--text-primary, #fff);
  font-size: 1.125rem;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
}

.view-toggle button {
  padding: 0.25rem 0.75rem;
  background: transparent;
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-toggle button.active {
  background: var(--accent-color, #4f87ff);
  color: white;
  border-color: var(--accent-color, #4f87ff);
}

/* Linear notation styles */
.linear-notation {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.notation-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.row-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.row-number {
  font-weight: 600;
  color: var(--accent-color, #4f87ff);
}

.color-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: inline-block;
}

.row-stitches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.1);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.no-stitches-message {
  padding: 0.75rem;
  color: var(--text-secondary, #aaa);
  font-style: italic;
  font-size: 0.875rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  border: 1px dashed var(--border-color, #444);
}

/* Repeat group styling */
.repeat-group {
  display: flex;
  align-items: center;
  background-color: rgba(79, 135, 255, 0.1);
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.repeat-bracket {
  font-size: 2.5rem;
  font-weight: 400;
  color: var(--accent-color, #4f87ff);
  margin: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding-bottom: 7px;
}

.left-bracket {
  margin-right: 0.25rem;
}

.right-bracket {
  margin-left: 0.25rem;
  margin-right: 0.125rem;
}

.repeat-count {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--accent-color, #4f87ff);
  padding: 0.125rem 0.25rem;
  background: rgba(79, 135, 255, 0.15);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Circular notation styles */
.circular-notation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.circular-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  overflow: hidden;
  cursor: grab;
}

.circular-container:active {
  cursor: grabbing;
}

.circular-chart {
  max-width: 100%;
  height: auto;
}

.view-controls {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 0.5rem;
}

.zoom-controls {
  display: flex;
  gap: 0.5rem;
}

.multi-row-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  background: var(--background-secondary, #333);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  cursor: pointer;
  transition: all 0.2s ease;
}

.multi-row-btn:hover,
.multi-row-btn.active {
  background: var(--accent-color, #4f87ff);
  border-color: var(--accent-color, #4f87ff);
}

.zoom-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--background-secondary, #333);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.zoom-btn:hover {
  background: var(--accent-color, #4f87ff);
  border-color: var(--accent-color, #4f87ff);
}

.zoom-icon {
  font-size: 1rem;
  font-weight: bold;
}

.circular-chart circle {
  opacity: 0.3;
  transition: opacity 0.2s ease, stroke 0.2s ease;
  stroke: var(--border-color, rgba(255, 255, 255, 0.3));
}

.circular-chart circle.active-row {
  opacity: 1;
  stroke-width: 2;
  stroke-dasharray: none;
  stroke: var(--accent-color, #4f87ff);
}

.circular-stitch {
  transform: scale(0.7);
}

.grid-line {
  stroke: var(--border-color, rgba(255, 255, 255, 0.1));
  stroke-width: 0.5;
}

.stitch-connection {
  opacity: 0.6;
}

.row-connection {
  opacity: 0.5;
  stroke-dasharray: 2,2;
}

.active-row-group {
  opacity: 1;
}

.row-number-label {
  font-weight: 500;
}

.row-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 1rem;
}

.row-selector button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.row-selector button.active {
  background: var(--accent-color, #4f87ff);
  color: white;
  border-color: var(--accent-color, #4f87ff);
}

.row-selector button.visible {
  background: rgba(79, 135, 255, 0.3);
  border-color: var(--accent-color, #4f87ff);
}

.active-connection {
  opacity: 1;
  stroke-width: 1.5;
}

.active-label {
  font-weight: bold;
}

.active-stitch {
  transform: scale(0.8);
}

.visible-row-group {
  opacity: 1;
}

/* Stitch key styles */
.stitch-key {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #444);
}

.stitch-key h5 {
  margin: 0 0 1rem;
  color: var(--text-primary, #fff);
  font-size: 1rem;
}

.key-items {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.key-label {
  font-size: 0.875rem;
  color: var(--text-primary, #fff);
}

/* Pattern shape indicator styles */
.pattern-info {
  display: flex;
  align-items: center;
  margin-right: auto;
  margin-left: 1rem;
}

.pattern-shape-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.shape-label {
  color: var(--text-secondary, #aaa);
}

.shape-value {
  font-weight: 500;
}

.shape-value.circular {
  color: var(--accent-color, #4CAF50);
}

.shape-value.rectangular {
  color: #2196F3;
}

.shape-value.unknown {
  color: var(--text-secondary, #aaa);
}

.confidence-indicator {
  font-size: 0.75rem;
  opacity: 0.8;
  font-weight: normal;
}

/* 3D View container */
.threed-view-container {
  width: 100%;
  min-height: 400px;
}

/* Light theme overrides */
:root.light .crochet-notation-view {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:root.light .view-toggle button {
  color: #333;
  border-color: #e0e0e0;
}

:root.light .view-toggle button.active {
  background: #2979ff;
  color: white;
  border-color: #2979ff;
}

:root.light .row-number {
  color: #2979ff;
}

:root.light .color-indicator {
  border: 1px solid rgba(0, 0, 0, 0.1);
}

:root.light .row-stitches {
  background: rgba(0, 0, 0, 0.03);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

:root.light .no-stitches-message {
  color: #666;
  background: rgba(0, 0, 0, 0.03);
  border-color: #ddd;
}

:root.light .repeat-group {
  background-color: rgba(41, 121, 255, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

:root.light .repeat-bracket,
:root.light .repeat-count {
  color: #2979ff;
}

:root.light .repeat-count {
  background: rgba(41, 121, 255, 0.12);
}

:root.light .circular-chart circle {
  stroke: rgba(0, 0, 0, 0.1);
}

:root.light .circular-chart circle.active-row {
  stroke: #2979ff;
}

:root.light .row-selector button {
  color: white;
  border-color: #222;
  background: #333;
}

:root.light .zoom-btn,
:root.light .multi-row-btn {
  background: #333;
  color: white;
  border-color: #222;
}

:root.light .zoom-btn:hover,
:root.light .multi-row-btn:hover,
:root.light .multi-row-btn.active {
  background: #2979ff;
  color: white;
  border-color: #2979ff;
}

:root.light .row-selector button.visible {
  background: rgba(41, 121, 255, 0.2);
  border-color: #2979ff;
}

:root.light .row-selector button.active {
  background: #2979ff;
  color: white;
  border-color: #2979ff;
}

:root.light .stitch-key {
  border-top-color: #e0e0e0;
}

:root.light .key-label {
  color: #333;
}

:root.light .shape-label {
  color: #666;
}

:root.light .shape-value.circular {
  color: #4CAF50;
}

:root.light .shape-value.rectangular {
  color: #2196F3;
}

:root.light .shape-value.unknown {
  color: #999;
}
</style>
