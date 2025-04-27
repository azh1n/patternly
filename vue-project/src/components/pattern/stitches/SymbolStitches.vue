<template>
  <div class="symbol-stitches">
    <StitchVisualization
      :totalStitches="totalStitches"
      :initialStitchesPerView="initialStitchesPerView"
      :maxStitchesPerView="maxStitchesPerView"
      @update:currentStitchIndex="updateCurrentStitchIndex"
      @update:stitchesPerView="updateStitchesPerView"
      ref="stitchVisRef"
    >
      <!-- Current stitches slot -->
      <template #current-stitches>
        <template v-if="currentRow && currentRow.codes && currentRow.codes.length">
          <div v-for="(stitch, i) in currentStitchesView" 
            :key="`focused-stitch-${i}`" 
            class="stitch-wrapper"
          >
            <div class="stitch-symbol" :class="[getStitchClass(stitch), { 'with-count': !displayRepeatedStitchesSeparately && getStitchCount(stitch) > 1 }]">
              <template v-if="checkSymbolExists(stitch)">
                <img 
                  :src="getSymbolPath(stitch)" 
                  :alt="stitch" 
                  class="stitch-svg"
                />
              </template>
              <template v-else>
                {{ getStitchType(stitch) }}
              </template>
              <div v-if="!displayRepeatedStitchesSeparately && getStitchCount(stitch) > 1" class="stitch-count-badge smaller-badge">
                {{ getStitchCount(stitch) }}
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- Row preview slot -->
      <template #row-preview>
        <template v-if="currentRow && currentRow.codes && currentRow.codes.length">
          <div 
            v-for="(stitch, i) in processRowStitches(currentRow.codes, displayRepeatedStitchesSeparately)" 
            :key="`preview-stitch-${i}`" 
            class="stitch-wrapper"
            :class="{ 
              'preview-stitch': true,
              'current-stitch': i >= currentStitchIndex && i < currentStitchIndex + stitchesPerView,
              'completed-stitch': i < currentStitchIndex 
            }"
          >
            <div class="stitch-symbol" :class="[getStitchClass(stitch), { 'with-count': !displayRepeatedStitchesSeparately && getStitchCount(stitch) > 1 }]">
              <template v-if="checkSymbolExists(stitch)">
                <img 
                  :src="getSymbolPath(stitch)" 
                  :alt="stitch" 
                  class="stitch-svg"
                />
              </template>
              <template v-else>
                {{ getStitchType(stitch) }}
              </template>
              <div v-if="!displayRepeatedStitchesSeparately && getStitchCount(stitch) > 1" class="stitch-count-badge">
                {{ getStitchCount(stitch) }}
              </div>
            </div>
          </div>
        </template>
        <div v-else class="no-stitches">
          No stitches defined for this row
        </div>
      </template>
    </StitchVisualization>

    <!-- Toggle for expand/collapse stitches -->
    <button
      class="expand-toggle"
      :aria-pressed="displayRepeatedStitchesSeparately"
      @click="toggleStitchDisplay"
    >
      <span v-if="displayRepeatedStitchesSeparately">Collapse Stitches</span>
      <span v-else>Expand Stitches</span>
    </button>

    <!-- Stitch key tooltip -->
    <div class="stitch-key-wrapper">
      <button class="stitch-key-trigger" aria-label="Show stitch key">
        <span class="question-mark">?</span>
        <span class="tooltip-text">Key</span>
      </button>
      <div class="stitch-key-tooltip">
        <h5>Stitch Key</h5>
        <div class="key-items">
          <div v-for="(symbol, abbr) in filteredStitches" :key="`key-${abbr}`" class="key-item">
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import StitchVisualization from './StitchVisualization.vue';
import { hasStitchSymbol, getStitchSymbolPath, stitchSymbolMapping } from '@/assets/crochet-symbols/stitch-mapping.js';

const props = defineProps({
  currentRow: {
    type: Object,
    default: () => ({})
  },
  maxStitchesPerView: {
    type: Number,
    default: 5
  },
  initialStitchesPerView: {
    type: Number,
    default: 3
  }
});

// Local state for component
const mounted = ref(false);
const displayRepeatedStitchesSeparately = ref(false);
const currentStitchIndex = ref(0);
const stitchesPerView = ref(props.initialStitchesPerView);
const stitchVisRef = ref(null);

// Toggle for expanding/collapsing stitches
const toggleStitchDisplay = () => {
  displayRepeatedStitchesSeparately.value = !displayRepeatedStitchesSeparately.value;
};

// Computed values 
const totalStitches = computed(() => {
  if (!props.currentRow || !props.currentRow.codes) return 0;
  
  // Use the correct calculation method
  const calculateTotalStitches = (codes) => {
    if (!codes || !Array.isArray(codes)) return 0;
    
    return codes.reduce((total, code) => {
      // If it's a repeat pattern like "(1sc, 1inc) x6", handle differently
      if (code.includes('(') && code.includes(')') && code.includes('x')) {
        // Extract content inside parentheses and repeat count
        const repeatMatch = code.match(/\(([^)]+)\)\s*x(\d+)/);
        if (repeatMatch) {
          const repeatedContent = repeatMatch[1];
          const repeatCount = parseInt(repeatMatch[2], 10);
          
          // Split the repeated content by commas
          const stitches = repeatedContent.split(',').map(s => s.trim());
          
          // Calculate stitches in each repeat
          let stitchesPerRepeat = 0;
          for (const stitch of stitches) {
            // Extract the number from each stitch code
            const countMatch = stitch.match(/^(\d+)/);
            stitchesPerRepeat += (countMatch ? parseInt(countMatch[1], 10) : 1);
          }
          
          // Multiply by repeat count
          return total + (stitchesPerRepeat * repeatCount);
        }
      } else {
        // For normal stitches like "22dc", extract the number
        const match = code.match(/^(\d+)/);
        return total + (match ? parseInt(match[1], 10) : 1);
      }
    }, 0);
  };
  
  return calculateTotalStitches(props.currentRow.codes);
});

// Filter stitches to only show those present in the current row
const filteredStitches = computed(() => {
  if (!props.currentRow || !props.currentRow.codes || !props.currentRow.codes.length) {
    return {};
  }
  
  const result = {};
  const stitchTypes = new Set();
  
  // Extract stitch types from the current row
  props.currentRow.codes.forEach(code => {
    if (!code) return;
    
    // Handle repeat patterns like "(1sc, 1inc) x6"
    if (code.includes('(') && code.includes(')') && code.includes('x')) {
      const repeatMatch = code.match(/\(([^)]+)\)\s*x\d+/);
      if (repeatMatch) {
        const repeatedContent = repeatMatch[1];
        // Split by commas and process each stitch
        repeatedContent.split(',').forEach(stitch => {
          const stitchType = stitch.trim().replace(/^\d+/, '');
          stitchTypes.add(stitchType);
        });
      }
    } else {
      // Handle normal stitches like "22dc"
      const stitchType = code.toString().replace(/^\d+/, '');
      stitchTypes.add(stitchType);
    }
  });
  
  // Only include stitches that are in the current row
  for (const type of stitchTypes) {
    if (commonStitches[type]) {
      result[type] = commonStitches[type];
    }
  }
  
  return result;
});

// Get current stitches for the focused view
const currentStitchesView = computed(() => {
  if (!props.currentRow || !props.currentRow.codes || !props.currentRow.codes.length) return [];
  
  const processedStitches = processRowStitches(props.currentRow.codes, displayRepeatedStitchesSeparately.value);
  // Always show exactly stitchesPerView blocks, regardless of their stitch count
  return processedStitches.slice(currentStitchIndex.value, currentStitchIndex.value + stitchesPerView.value);
});

// Update handlers for the child component
const updateCurrentStitchIndex = (index) => {
  currentStitchIndex.value = index;
};

const updateStitchesPerView = (count) => {
  stitchesPerView.value = count;
};

// Watch for changes to total stitches
watch([() => props.currentRow, displayRepeatedStitchesSeparately], () => {
  // Reset index when row changes or stitch display mode changes
  currentStitchIndex.value = 0;
  
  // Sync with child component
  if (stitchVisRef.value) {
    stitchVisRef.value.currentStitchIndex = 0;
  }
});

// Wrapper functions for stitch symbols
function checkSymbolExists(stitch) {
  if (!mounted.value) return false;
  return window.hasStitchSymbol ? window.hasStitchSymbol(stitch) : hasStitchSymbol(stitch);
}

function getSymbolPath(stitch) {
  return getStitchSymbolPath(stitch);
}

// Helper functions
// Process stitches based on display mode
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

function getStitchCount(stitch) {
  if (!stitch) return 1;
  
  const match = stitch.toString().match(/^(\d+)([a-zA-Z]+)/);
  if (match) {
    return parseInt(match[1]);
  }
  return 1;
}

function getStitchType(stitch) {
  if (!stitch) return '';
  
  const match = stitch.toString().match(/^(\d+)([a-zA-Z]+)/);
  if (match) {
    return match[2];
  }
  return stitch;
}

// Common stitches for the key
const commonStitches = {
  'ch': { label: 'Chain (ch)' },
  'sl': { label: 'Slip Stitch (sl st)' },
  'sc': { label: 'Single Crochet (sc)' },
  'hdc': { label: 'Half Double Crochet (hdc)' },
  'dc': { label: 'Double Crochet (dc)' },
  'tr': { label: 'Treble Crochet (tr)' },
  'dtr': { label: 'Double Treble Crochet (dtr)' },
  'bs': { label: 'Border Stitch (bs)' },
  'ns': { label: 'Negative Stitch (ns)' }
};

// Fix the stitch symbol display function
onMounted(() => {
  try {
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
      'front-post-dc.svg',
      'bs.svg',
      'ns.svg'
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
    
    // Set mounted state
    mounted.value = true;
  } catch (error) {
    console.error('Error in onMounted:', error);
  }
});

// Clean up when component is unmounted
onUnmounted(() => {
  try {
    // Set mounted to false to prevent any further updates
    mounted.value = false;
    
    // Restore the original function if it was saved
    if (window.originalHasStitchSymbol) {
      window.hasStitchSymbol = window.originalHasStitchSymbol;
      delete window.originalHasStitchSymbol;
    }
  } catch (error) {
    console.error('Error in onUnmounted:', error);
  }
});

// Expose some methods/properties to parent
defineExpose({
  currentStitchIndex,
  stitchesPerView,
  displayRepeatedStitchesSeparately
});
</script>

<style scoped>
.symbol-stitches {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.expand-toggle {
  margin: 0.5rem auto 1rem auto;
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
  align-self: center;
}

.expand-toggle[aria-pressed="true"] {
  background: var(--accent-hover, #3a6fd9);
}

/* Stitch wrapper */
.stitch-wrapper {
  display: inline-block;
  margin: 2px;
}

.stitch-wrapper.preview-stitch {
  position: relative;
  transition: all 0.2s ease;
}

.stitch-wrapper.preview-stitch.current-stitch {
  transform: translateY(-3px);
}

.stitch-wrapper.preview-stitch.current-stitch .stitch-symbol {
  border: 2px solid var(--accent-color, #4f87ff);
  box-shadow: 0 0 8px rgba(79, 135, 255, 0.4);
}

.stitch-wrapper.preview-stitch.completed-stitch .stitch-symbol {
  opacity: 0.7;
  background-color: var(--completed-bg, #555) !important;
  border-color: var(--completed-border, #444) !important;
}

.stitch-svg {
  width: 100%;
  height: 100%;
  object-fit: contain;
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

/* Stitch count badge */
.stitch-count-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  background-color: var(--accent-color, #4f87ff);
  color: white;
  border-radius: 9px;
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid white;
  padding: 0 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.stitch-count-badge.smaller-badge {
  min-width: 14px;
  height: 14px;
  top: -4px;
  right: -4px;
  font-size: 0.5rem;
  padding: 0 2px;
  border-width: 1px;
}

.stitch-symbol.with-count {
  overflow: visible;
}

.no-stitches {
  font-style: italic;
  color: var(--text-secondary, #aaa);
  padding: 0.5rem;
}

/* Stitch key tooltip */
.stitch-key-wrapper {
  position: relative;
  display: inline-block;
  align-self: flex-end;
  margin: 0;
  margin-left: auto;
}

.stitch-key-trigger {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #aaa);
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.stitch-key-trigger:hover {
  color: var(--text-primary);
  background-color: rgba(0, 0, 0, 0.05);
}

.question-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--text-secondary, #aaa);
  color: var(--bg-primary, #222);
  font-size: 12px;
  font-weight: bold;
}

.tooltip-text {
  font-size: 0.75rem;
}

.stitch-key-tooltip {
  display: none;
  position: absolute;
  bottom: 100%;
  right: 0;
  width: 420px;
  background-color: var(--bg-secondary, #333);
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.stitch-key-wrapper:hover .stitch-key-tooltip {
  display: block;
}

.stitch-key-tooltip h5 {
  margin: 0 0 0.75rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  text-align: center;
}

.key-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-start;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  width: calc(50% - 0.375rem);
  min-width: 180px;
}

.key-label {
  font-size: 0.75rem;
  color: var(--text-primary, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 140px;
}

/* Light theme overrides for the tooltip */
:root.light .stitch-key-tooltip {
  background-color: white;
  border-color: #e0e0e0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:root.light .question-mark {
  background-color: #aaa;
  color: white;
}

:root.light .stitch-key-trigger:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

:root.light .key-item {
  background-color: rgba(0, 0, 0, 0.03);
}

/* Restored light theme overrides */
:root.light .stitch-symbol {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  color: #333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:root.light .stitch-wrapper.preview-stitch.completed-stitch .stitch-symbol {
  background-color: #e0e0e0 !important;
  border-color: #ccc !important;
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

/* Mobile adjustments */
@media (max-width: 767px) {
  .stitch-symbol {
    width: 34px;
    height: 34px;
    font-size: 0.75rem;
  }
  
  .stitch-wrapper {
    margin: 1px;
  }
  
  .stitch-wrapper.preview-stitch.current-stitch {
    transform: translateY(-2px);
  }
  
  .stitch-wrapper.preview-stitch.current-stitch .stitch-symbol {
    border: 1.5px solid var(--accent-color, #4f87ff);
  }
  
  .stitch-count-badge {
    min-width: 15px;
    height: 15px;
    font-size: 0.65rem;
    top: -4px;
    right: -4px;
    padding: 0 2px;
  }
  
  .expand-toggle {
    font-size: 0.8rem;
    padding: 0.25rem 0.8rem;
    margin: 0.2rem auto 0.6rem auto;
  }
  
  .symbol-stitches :deep(.current-stitches) {
    gap: 0.25rem;
    flex-wrap: wrap;
    justify-content: center;
    padding: 0;
    min-height: 40px;
  }
  
  .symbol-stitches :deep(.preview-content) {
    gap: 0.2rem;
    padding: 0.25rem 0;
  }
  
  .symbol-stitches :deep(.stitch-navigation) {
    padding: 0.5rem 0.25rem;
    gap: 0.5rem;
  }
  
  .symbol-stitches :deep(.stitch-content) {
    min-width: 0;
    padding: 0;
  }
  
  .symbol-stitches :deep(.nav-button) {
    padding: 0.8rem 0.7rem;
    min-width: 40px;
    height: 50px;
  }
  
  .symbol-stitches :deep(.prev-arrow),
  .symbol-stitches :deep(.next-arrow) {
    font-size: 0;
    line-height: 0;
  }
  
  .symbol-stitches :deep(.prev-arrow)::after {
    content: "‹";
    font-size: 1.8rem;
    font-weight: bold;
    display: inline-block;
  }
  
  .symbol-stitches :deep(.next-arrow)::after {
    content: "›";
    font-size: 1.8rem;
    font-weight: bold;
    display: inline-block;
  }
  
  .symbol-stitches :deep(.full-row-preview) {
    margin-top: 0.25rem;
    padding-top: 0.75rem;
  }
  
  .symbol-stitches :deep(.full-row-preview h3) {
    margin-bottom: 0.5rem;
    font-size: 1rem;
  }
  
  .stitch-key-tooltip {
    width: 340px;
    left: auto;
    right: 0;
  }
  
  .key-item {
    width: 100%;
    font-size: 0.7rem;
    min-width: 0;
  }
  
  .key-label {
    font-size: 0.7rem;
    min-width: 0;
  }
  .symbol-stitches :deep(.full-row-preview) {
    margin-top: 0.25rem;
    padding-top: 0.75rem;
  }
}

/* Mobile arrow styling */
.symbol-stitches :deep(.prev-arrow)::before,
.symbol-stitches :deep(.next-arrow)::before,
.symbol-stitches :deep(.prev-arrow)::after,
.symbol-stitches :deep(.next-arrow)::after {
  display: none;
}

@media (max-width: 767px) {
  .symbol-stitches :deep(.nav-button) {
    padding: 0.8rem 0.7rem;
    min-width: 40px;
    height: 50px;
  }
  
  .symbol-stitches :deep(.prev-arrow),
  .symbol-stitches :deep(.next-arrow) {
    font-size: 0;
    line-height: 0;
  }
  
  .symbol-stitches :deep(.prev-arrow)::after {
    content: "‹";
    font-size: 1.8rem;
    font-weight: bold;
    display: inline-block;
  }
  
  .symbol-stitches :deep(.next-arrow)::after {
    content: "›";
    font-size: 1.8rem;
    font-weight: bold;
    display: inline-block;
  }
}
</style> 