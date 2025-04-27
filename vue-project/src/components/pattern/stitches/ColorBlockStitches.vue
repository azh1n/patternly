<template>
  <div class="color-block-stitches">
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
            <div class="stitch-symbol" :class="[getStitchClass(stitch)]">
              <span v-if="!displayRepeatedStitchesSeparately && getStitchCount(stitch) > 1" class="stitch-count-inline">{{ getStitchCount(stitch) }}</span>{{ getStitchType(stitch) }}
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
            <div class="stitch-symbol" :class="[getStitchClass(stitch)]">
              <span v-if="!displayRepeatedStitchesSeparately && getStitchCount(stitch) > 1" class="stitch-count-inline">{{ getStitchCount(stitch) }}</span>{{ getStitchType(stitch) }}
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import StitchVisualization from './StitchVisualization.vue';

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

// Local state for expand/collapse stitches
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

// Expose some methods/properties to parent
defineExpose({
  currentStitchIndex,
  stitchesPerView,
  displayRepeatedStitchesSeparately
});
</script>

<style scoped>
.color-block-stitches {
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

.no-stitches {
  font-style: italic;
  color: var(--text-secondary, #aaa);
  padding: 0.5rem;
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
}

/* Add the inline stitch count styling */
.stitch-count-inline {
  font-weight: bold;
  margin-right: 1px;
  position: relative;
  z-index: 1;
}
</style> 