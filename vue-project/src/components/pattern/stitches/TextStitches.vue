<template>
  <div class="text-stitches">
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
              {{ getStitchType(stitch) }}
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
              {{ getStitchType(stitch) }}
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
.text-stitches {
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
  transition: transform 0.2s, box-shadow 0.2s;
}

.stitch-wrapper.preview-stitch.current-stitch {
  z-index: 2;
}

/* Stitch symbol */
.stitch-symbol {
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  position: relative;
  background-color: var(--background-color, #1e1e1e);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  transition: background-color 0.2s, transform 0.2s;
}

.stitch-symbol.with-count {
  font-weight: 600;
}

.stitch-count-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: var(--accent-color, #4f87ff);
  color: white;
  font-size: 0.75rem;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Stitch type colors */
.stitch-symbol.stitch-sc {
  background-color: #e91e63;
  color: white;
  border-color: #c2185b;
}

.stitch-symbol.stitch-dc {
  background-color: #2196f3;
  color: white;
  border-color: #1976d2;
}

.stitch-symbol.stitch-hdc {
  background-color: #673ab7;
  color: white;
  border-color: #512da8;
}

.stitch-symbol.stitch-tr {
  background-color: #ff9800;
  color: white;
  border-color: #f57c00;
}

.stitch-symbol.stitch-dtr {
  background-color: #ff5722;
  color: white;
  border-color: #e64a19;
}

.stitch-symbol.stitch-ch {
  background-color: #4caf50;
  color: white;
  border-color: #388e3c;
}

.stitch-symbol.stitch-sl {
  background-color: #9e9e9e;
  color: white;
  border-color: #757575;
}

.stitch-symbol.stitch-inc {
  background-color: #3f51b5;
  color: white;
  border-color: #303f9f;
}

.stitch-symbol.stitch-dec {
  background-color: #9c27b0;
  color: white;
  border-color: #7b1fa2;
}

.stitch-symbol.stitch-bs {
  background-color: #009688;
  color: white;
  border-color: #00796b;
}

.stitch-symbol.stitch-ns {
  background-color: #607d8b;
  color: white;
  border-color: #455a64;
}

/* Completed stitch */
.preview-stitch.completed-stitch .stitch-symbol {
  opacity: 0.7;
}

.preview-stitch.completed-stitch::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

/* Current stitch highlighting */
.preview-stitch.current-stitch .stitch-symbol {
  box-shadow: 0 0 0 2px var(--accent-color, #4f87ff);
  transform: translateY(-2px);
}

.no-stitches {
  color: var(--text-secondary, #aaa);
  font-style: italic;
  padding: 1rem;
  text-align: center;
}

/* Light theme overrides */
:root.light .stitch-symbol {
  background-color: #f5f5f5;
  color: #333;
  border-color: #ddd;
}

:root.light .stitch-symbol.stitch-sc { background-color: #ffcdd2; color: #000; border-color: #ef9a9a; }
:root.light .stitch-symbol.stitch-dc { background-color: #bbdefb; color: #000; border-color: #90caf9; }
:root.light .stitch-symbol.stitch-hdc { background-color: #d1c4e9; color: #000; border-color: #b39ddb; }
:root.light .stitch-symbol.stitch-tr { background-color: #ffe0b2; color: #000; border-color: #ffcc80; }
:root.light .stitch-symbol.stitch-dtr { background-color: #ffccbc; color: #000; border-color: #ffab91; }
:root.light .stitch-symbol.stitch-ch { background-color: #c8e6c9; color: #000; border-color: #a5d6a7; }
:root.light .stitch-symbol.stitch-sl { background-color: #f5f5f5; color: #000; border-color: #e0e0e0; }
:root.light .stitch-symbol.stitch-inc { background-color: #c5cae9; color: #000; border-color: #9fa8da; }
:root.light .stitch-symbol.stitch-dec { background-color: #e1bee7; color: #000; border-color: #ce93d8; }
:root.light .stitch-symbol.stitch-bs { background-color: #b2dfdb; color: #000; border-color: #80cbc4; }
:root.light .stitch-symbol.stitch-ns { background-color: #cfd8dc; color: #000; border-color: #b0bec5; }

@media (max-width: 767px) {
  .stitch-symbol {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
}
</style> 