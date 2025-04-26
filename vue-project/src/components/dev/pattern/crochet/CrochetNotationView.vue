<template>
  <div class="crochet-notation-view">
    <div class="notation-header">
      <h4>Crochet Chart Notation</h4>
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
            <StitchSymbol 
              v-for="(stitch, i) in row.stitches" 
              :key="`stitch-${i}`"
              :stitch="stitch"
            />
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
      <div class="circular-container">
        <svg 
          :width="svgSize" 
          :height="svgSize" 
          :viewBox="`0 0 ${svgSize} ${svgSize}`" 
          class="circular-chart"
        >
          <!-- Draw concentric circles for each row -->
          <circle 
            v-for="(row, index) in rows" 
            :key="`circle-${index}`"
            :cx="centerX" 
            :cy="centerY" 
            :r="getRowRadius(index)" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="1" 
            stroke-dasharray="5,5"
            :class="{ 'active-row': index === activeRowIndex }"
          />
          
          <!-- Draw row numbers -->
          <text 
            v-for="(row, index) in rows" 
            :key="`row-num-${index}`"
            :x="centerX + 5" 
            :y="centerY - getRowRadius(index) + 15" 
            font-size="12" 
            fill="currentColor"
          >
            Row {{ row.number }}
          </text>
          
          <!-- Draw stitches for active row -->
          <g v-if="activeRow && activeRow.stitches">
            <template v-if="Array.isArray(activeRow.stitches)">
              <foreignObject 
                v-for="(stitch, i) in activeRow.stitches" 
                :key="`stitch-${i}`"
                :x="getStitchX(i, activeRow.stitches.length) - 20" 
                :y="getStitchY(i, activeRow.stitches.length) - 20" 
                width="40" 
                height="40"
              >
                <StitchSymbol 
                  :stitch="stitch"
                  class="circular-stitch"
                />
              </foreignObject>
            </template>
            
            <template v-else-if="activeRow.stitches.repeated">
              <!-- Calculate total stitch count for positioning -->
              <foreignObject 
                v-for="(stitch, i) in getExpandedStitches(activeRow.stitches)" 
                :key="`stitch-${i}`"
                :x="getStitchX(i, getExpandedStitches(activeRow.stitches).length) - 20" 
                :y="getStitchY(i, getExpandedStitches(activeRow.stitches).length) - 20" 
                width="40" 
                height="40"
              >
                <StitchSymbol 
                  :stitch="stitch"
                  class="circular-stitch"
                />
              </foreignObject>
            </template>
          </g>
        </svg>
        
        <!-- Row selector for circular view -->
        <div class="row-selector">
          <button 
            v-for="(row, index) in rows" 
            :key="`selector-${index}`"
            @click="activeRowIndex = index"
            :class="{ active: index === activeRowIndex }"
          >
            {{ row.number }}
          </button>
        </div>
      </div>
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
import { ref, computed } from 'vue';
import StitchSymbol from './StitchSymbol.vue';

const props = defineProps({
  rows: {
    type: Array,
    required: true
  }
});

// View mode (linear or circular)
const viewMode = ref('linear');
const activeRowIndex = ref(0);

// SVG dimensions for circular view
const svgSize = 500;
const centerX = svgSize / 2;
const centerY = svgSize / 2;
const baseRadius = 50;
const radiusIncrement = 40;

// Active row for circular view
const activeRow = computed(() => {
  return props.rows[activeRowIndex.value] || null;
});

// Get radius for a specific row
const getRowRadius = (rowIndex) => {
  return baseRadius + (rowIndex * radiusIncrement);
};

// Calculate X position for a stitch in circular view
const getStitchX = (stitchIndex, totalStitches) => {
  const angle = (stitchIndex / totalStitches) * 2 * Math.PI;
  const radius = getRowRadius(activeRowIndex.value);
  return centerX + radius * Math.cos(angle);
};

// Calculate Y position for a stitch in circular view
const getStitchY = (stitchIndex, totalStitches) => {
  const angle = (stitchIndex / totalStitches) * 2 * Math.PI;
  const radius = getRowRadius(activeRowIndex.value);
  return centerY + radius * Math.sin(angle);
};

// Expand repeated stitches for circular view
const getExpandedStitches = (stitches) => {
  if (!stitches || !stitches.repeated) return [];
  
  const result = [...(stitches.beforeRepeat || [])];
  
  // Add repeated stitches
  for (let i = 0; i < stitches.repeatCount; i++) {
    result.push(...stitches.repeatedStitches);
  }
  
  // Add after repeat stitches
  result.push(...(stitches.afterRepeat || []));
  
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
}

.circular-chart {
  max-width: 100%;
  height: auto;
}

.circular-chart circle {
  opacity: 0.5;
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
  transform: scale(0.8);
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
  color: #333;
  border-color: #e0e0e0;
  background: #f8f9fa;
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
</style>
