<template>
  <div class="pattern-chart-view" v-if="experimental">
    <div class="notation-header">
      <h4>Pattern Chart Notation</h4>
      <div class="view-toggle">
        <button 
          @click="viewMode = 'linear'" 
          :class="{ 'active': viewMode === 'linear' }"
        >
          Linear
        </button>
        <button 
          @click="viewMode = 'circular'" 
          :class="{ 'active': viewMode === 'circular' }"
          disabled
        >
          Circular (Coming Soon)
        </button>
      </div>
    </div>

    <!-- Expand/Collapse stitches toggle -->
    <button
      class="expand-toggle"
      :aria-pressed="displayRepeatedStitchesSeparately"
      @click="displayRepeatedStitchesSeparately = !displayRepeatedStitchesSeparately"
    >
      <span v-if="displayRepeatedStitchesSeparately">Collapse Stitches</span>
      <span v-else>Expand Stitches</span>
    </button>

    <!-- Linear notation view -->
    <div v-if="viewMode === 'linear'" class="linear-notation">
      <div v-if="hasRows" class="row-list">
        <div v-for="(row, rowIndex) in safeRows" :key="`row-${rowIndex}`" class="notation-row">
          <div class="row-header">
            <span class="row-number">Row {{ row.rowNum }}</span>
            <div v-if="row.color" class="color-indicator" :style="{ backgroundColor: getColorHex(row.color) }"></div>
          </div>
          
          <div class="row-stitches">
            <!-- Display stitches in a simple format -->
            <div class="horizontal-stitches">
              <template v-if="row.codes && row.codes.length">
                <div v-for="(stitch, i) in processRowStitches(row.codes, displayRepeatedStitchesSeparately)" 
                  :key="`stitch-${rowIndex}-${i}`" 
                  class="stitch-wrapper"
                >
                  <div class="stitch-symbol" :class="getStitchClass(stitch)">
                    <template v-if="checkSymbolExists(stitch)">
                      <img 
                        :src="getSymbolPath(stitch)" 
                        :alt="stitch" 
                        class="stitch-svg"
                      />
                    </template>
                    <template v-else>
                      {{ stitch }}
                    </template>
                  </div>
                </div>
              </template>
              <div v-else class="no-stitches">
                No stitches defined for this row
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-data-message">
        No pattern data available to display
      </div>
    </div>
    
    <!-- Stitch key -->
    <div class="stitch-key">
      <h5>Stitch Key</h5>
      <div class="key-items">
        <div v-for="(symbol, abbr) in commonStitches" :key="`key-${abbr}`" class="key-item">
          <div class="stitch-symbol" :class="getStitchClass(abbr)">
            <template v-if="checkSymbolExists(abbr)">
              <img 
                :src="getSymbolPath(abbr)" 
                :alt="abbr" 
                class="stitch-svg"
              />
            </template>
            <template v-else>
              {{ abbr }}
            </template>
          </div>
          <span class="key-label">{{ symbol.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { hasStitchSymbol, getStitchSymbolPath, stitchSymbolMapping } from '@/assets/crochet-symbols/stitch-mapping.js';

const props = defineProps({
  pattern: {
    type: Object,
    required: true
  },
  experimental: {
    type: Boolean,
    default: false
  }
});

// Local state for expand/collapse stitches
const displayRepeatedStitchesSeparately = ref(true);

// View mode (linear or circular)
const viewMode = ref('linear');

// Create a safe rows accessor
const safeRows = computed(() => {
  return props.pattern?.parsedRows || [];
});

// Check if we have rows to display
const hasRows = computed(() => {
  return safeRows.value.length > 0;
});

// Wrapper functions for stitch symbols
function checkSymbolExists(stitch) {
  return window.hasStitchSymbol ? window.hasStitchSymbol(stitch) : hasStitchSymbol(stitch);
}

function getSymbolPath(stitch) {
  return getStitchSymbolPath(stitch);
}

// Fix the stitch symbol display function
onMounted(() => {
  // Override the hasStitchSymbol function to also check if the SVG file actually exists
  // This is needed because some stitch symbols might be defined in the mapping but don't have SVG files
  const originalHasStitchSymbol = hasStitchSymbol;
  
  // Create a set of available SVG files
  const availableSvgs = new Set([
    'chain.svg', 
    'slip-stitch.svg', 
    'sc.svg', 
    'hdc.svg', 
    'dc.svg', 
    'tr.svg', 
    'dtr.svg',
    'sc-inc.svg',
    'hdc-inc.svg',
    'dc-inc.svg',
    'sc-dec.svg',
    'hdc-dec.svg',
    'dc-dec.svg',
    'front-post-dc.svg'
  ]);
  
  // Override the original function temporarily for this component
  window.originalHasStitchSymbol = hasStitchSymbol;
  window.hasStitchSymbol = function(stitchType) {
    if (!stitchType) return false;
    
    // Extract the stitch type without any number prefix
    const cleanType = stitchType.toString().replace(/^\d+/, '').toLowerCase();
    
    // Check if we have a mapping for this stitch type AND the SVG exists
    return !!stitchSymbolMapping[cleanType] && availableSvgs.has(stitchSymbolMapping[cleanType]);
  };
});

// Clean up when component is unmounted
onUnmounted(() => {
  // Restore the original function if it was saved
  if (window.originalHasStitchSymbol) {
    window.hasStitchSymbol = window.originalHasStitchSymbol;
    delete window.originalHasStitchSymbol;
  }
});

// Simpler stitch processing function
function processRowStitches(codes, expandRepeated) {
  if (!codes || !Array.isArray(codes)) return [];
  
  if (!expandRepeated) {
    // Just return the codes as is when not expanding
    return codes;
  } else {
    // Expand repeated stitches (e.g., "3sc" becomes ["sc", "sc", "sc"])
    const expandedStitches = [];
    
    codes.forEach(stitch => {
      if (!stitch) return;
      
      const match = stitch.toString().match(/^(\d+)([a-zA-Z]+)/);
      if (match) {
        const count = parseInt(match[1]);
        const type = match[2];
        
        for (let i = 0; i < count; i++) {
          expandedStitches.push(type);
        }
      } else {
        // If no match (no number prefix), just add the stitch as is
        expandedStitches.push(stitch);
      }
    });
    
    return expandedStitches;
  }
}

// Get stitch class for styling
function getStitchClass(stitch) {
  if (!stitch) return '';
  
  // Extract the stitch type (removing any number prefix)
  const type = stitch.toString().replace(/^\d+/, '');
  
  // Map common stitch types to classes
  const stitchClasses = {
    'sc': 'stitch-sc',
    'dc': 'stitch-dc',
    'hdc': 'stitch-hdc',
    'tr': 'stitch-tr',
    'dtr': 'stitch-dtr',
    'ch': 'stitch-ch',
    'sl': 'stitch-sl',
    'inc': 'stitch-inc',
    'dec': 'stitch-dec',
    'bs': 'stitch-bs',
    'ns': 'stitch-ns'
  };
  
  return stitchClasses[type] || '';
}

// Color hex mapping
const getColorHex = (colorName) => {
  if (!colorName) return '#888888';
  
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
    'white': '#ffffff',
    'a': '#ff5252',
    'b': '#4f87ff',
    'c': '#4caf50',
    'd': '#ffc107',
    'e': '#9c27b0',
    'f': '#e91e63',
    'g': '#ff9800',
    'h': '#009688'
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
.pattern-chart-view {
  margin-top: 2rem;
  padding: 1rem;
  border-radius: 8px;
  background: var(--card-bg, #2a2a2a);
  border: 1px solid var(--border-color, #444);
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
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

.view-toggle button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.view-toggle button.active {
  background: var(--accent-color, #4f87ff);
  color: white;
  border-color: var(--accent-color, #4f87ff);
}

.expand-toggle {
  margin: 0.5rem 0 1rem 0;
  padding: 0.35rem 1.2rem;
  background: var(--accent-color, #4f87ff);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  outline: none;
  display: inline-block;
}

.expand-toggle[aria-pressed="true"] {
  background: var(--accent-hover, #3a6fd9);
}

/* Linear notation styles */
.linear-notation {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 500px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  width: 100%;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.1);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 100%;
  box-sizing: border-box;
}

.horizontal-stitches {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.stitch-wrapper {
  display: inline-block;
  margin: 2px;
}

.stitch-svg {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-stitches, .no-data-message {
  font-style: italic;
  color: var(--text-secondary, #aaa);
  padding: 0.5rem;
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

/* Stitch symbol styling */
.stitch-symbol {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: var(--stitch-bg, #333);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Stitch type-specific styling */
.stitch-symbol.stitch-sc {
  background: var(--stitch-sc-bg, #e91e63);
  color: white;
}

.stitch-symbol.stitch-dc {
  background: var(--stitch-dc-bg, #4caf50);
  color: white;
}

.stitch-symbol.stitch-hdc {
  background: var(--stitch-hdc-bg, #ff9800);
  color: white;
}

.stitch-symbol.stitch-tr {
  background: var(--stitch-tr-bg, #2196f3);
  color: white;
}

.stitch-symbol.stitch-dtr {
  background: var(--stitch-dtr-bg, #9c27b0);
  color: white;
}

.stitch-symbol.stitch-ch {
  background: var(--stitch-ch-bg, #607d8b);
  color: white;
}

.stitch-symbol.stitch-sl {
  background: var(--stitch-sl-bg, #795548);
  color: white;
}

.stitch-symbol.stitch-inc,
.stitch-symbol.stitch-dec {
  background: var(--stitch-special-bg, #444);
  color: white;
}

.stitch-symbol.stitch-bs,
.stitch-symbol.stitch-ns {
  background: var(--stitch-special-bg, #444);
  color: white;
}

/* Light theme overrides */
:root.light .pattern-chart-view {
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

:root.light .row-stitches {
  background: rgba(0, 0, 0, 0.03);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

:root.light .key-label {
  color: #333;
}

:root.light .expand-toggle {
  background: #2979ff;
  color: white;
}

:root.light .expand-toggle[aria-pressed="true"] {
  background: #1565c0;
}

:root.light .stitch-symbol {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  color: #333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:root.light .stitch-key {
  border-top-color: #e0e0e0;
}

:root.light .stitch-symbol.stitch-sc {
  background: #ffcdd2;
  color: #c2185b;
  border-color: #e91e63;
}

:root.light .stitch-symbol.stitch-dc {
  background: #c8e6c9;
  color: #2e7d32;
  border-color: #4caf50;
}

:root.light .stitch-symbol.stitch-hdc {
  background: #ffe0b2;
  color: #e65100;
  border-color: #ff9800;
}

:root.light .stitch-symbol.stitch-tr {
  background: #bbdefb;
  color: #0d47a1;
  border-color: #2196f3;
}

:root.light .stitch-symbol.stitch-dtr {
  background: #e1bee7;
  color: #6a1b9a;
  border-color: #9c27b0;
}

:root.light .stitch-symbol.stitch-ch {
  background: #cfd8dc;
  color: #37474f;
  border-color: #607d8b;
}

:root.light .stitch-symbol.stitch-sl {
  background: #d7ccc8;
  color: #4e342e;
  border-color: #795548;
}

:root.light .stitch-symbol.stitch-inc,
:root.light .stitch-symbol.stitch-dec,
:root.light .stitch-symbol.stitch-bs,
:root.light .stitch-symbol.stitch-ns {
  background: #f5f5f5;
  color: #333;
  border-color: #9e9e9e;
}
</style> 