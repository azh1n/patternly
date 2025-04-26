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
            <div class="stitch-symbol" :class="[getStitchClass(stitch)]">
              <span class="stitch-count-inline">{{ getStitchCount(stitch) }}</span>{{ getStitchType(stitch) }}
            </div>
          </div>
        </template>
      </template>

      <!-- Row preview slot -->
      <template #row-preview>
        <template v-if="currentRow && currentRow.codes && currentRow.codes.length">
          <div 
            v-for="(stitch, i) in processRowStitches(currentRow.codes, false)" 
            :key="`preview-stitch-${i}`" 
            class="stitch-wrapper"
            :class="{ 
              'preview-stitch': true,
              'current-stitch': i >= currentStitchIndex && i < currentStitchIndex + stitchesPerView,
              'completed-stitch': i < currentStitchIndex 
            }"
          >
            <div class="stitch-symbol" :class="[getStitchClass(stitch)]">
              <span class="stitch-count-inline">{{ getStitchCount(stitch) }}</span>{{ getStitchType(stitch) }}
            </div>
          </div>
        </template>
        <div v-else class="no-stitches">
          No stitches defined for this row
        </div>
      </template>
    </StitchVisualization>

    <!-- Stitch key -->
    <div class="stitch-key">
      <h5>Stitch Key</h5>
      <div class="key-items">
        <div v-for="(symbol, abbr) in commonStitches" :key="`key-${abbr}`" class="key-item">
          <div class="stitch-symbol" :class="getStitchClass(abbr)">
            {{ abbr }}
          </div>
          <span class="key-label">{{ symbol.label }}</span>
        </div>
      </div>
    </div>
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

// Local state for component
const displayRepeatedStitchesSeparately = ref(false);
const currentStitchIndex = ref(0);
const stitchesPerView = ref(props.initialStitchesPerView);
const stitchVisRef = ref(null);

// Computed values 
const totalStitches = computed(() => {
  if (!props.currentRow || !props.currentRow.codes) return 0;
  // Import the correct calculation method from parent PatternView component
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
  
  const processedStitches = processRowStitches(props.currentRow.codes, false);
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
watch([() => props.currentRow], () => {
  // Reset index when row changes
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

// Expose some methods/properties to parent
defineExpose({
  currentStitchIndex,
  stitchesPerView
});
</script>

<style scoped>
.text-stitches {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
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

/* Stitch symbol styling */
.stitch-symbol {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Inline stitch count styling */
.stitch-count-inline {
  font-weight: bold;
  margin-right: 1px;
}

.no-stitches {
  font-style: italic;
  color: var(--text-secondary, #aaa);
  padding: 0.5rem;
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
  background-color: #00bcd4;
  color: white;
  border-color: #0097a7;
}

.stitch-symbol.stitch-ns {
  background-color: #607d8b;
  color: white;
  border-color: #546e7a;
}

/* Stitch key */
.stitch-key {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.stitch-key h5 {
  margin: 0 0 1rem;
  color: var(--text-primary);
  font-size: 1rem;
  text-align: center;
}

.key-items {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.35rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.key-label {
  font-size: 0.875rem;
  color: var(--text-primary);
}

/* Light theme overrides */
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

:root.light .stitch-key {
  border-top-color: #e0e0e0;
}

:root.light .key-item {
  background-color: rgba(0, 0, 0, 0.03);
}

:root.light .key-label {
  color: #333;
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .stitch-symbol {
    width: 36px;
    height: 36px;
    font-size: 0.8rem;
  }
  
  .stitch-count-inline {
    font-size: 0.7rem;
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