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
              <div v-if="!displayRepeatedStitchesSeparately && getStitchCount(stitch) > 1" class="stitch-count-badge">
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
const displayRepeatedStitchesSeparately = ref(true);
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
  return processRowStitches(props.currentRow.codes, displayRepeatedStitchesSeparately.value).length;
});

// Get current stitches for the focused view
const currentStitchesView = computed(() => {
  if (!props.currentRow || !props.currentRow.codes || !props.currentRow.codes.length) return [];
  
  const processedStitches = processRowStitches(props.currentRow.codes, displayRepeatedStitchesSeparately.value);
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
  'ns': { label: 'Normal Stitch (ns)' }
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
  align-self: flex-start;
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
  transform: translateY(-5px);
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

.stitch-symbol.with-count {
  overflow: visible;
}

.no-stitches {
  font-style: italic;
  color: var(--text-secondary, #aaa);
  padding: 0.5rem;
}

/* Stitch key */
.stitch-key {
  margin-top: 1.5rem;
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

:root.light .stitch-key {
  border-top-color: #e0e0e0;
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
    width: 36px;
    height: 36px;
    font-size: 0.8rem;
  }
  
  .stitch-count-badge {
    min-width: 16px;
    height: 16px;
    font-size: 0.7rem;
    top: -5px;
    right: -5px;
  }

  .stitch-key {
    margin-top: 1rem;
  }
  
  .key-items {
    gap: 0.75rem;
  }
  
  .key-item .stitch-symbol {
    width: 32px;
    height: 32px;
  }
}
</style> 