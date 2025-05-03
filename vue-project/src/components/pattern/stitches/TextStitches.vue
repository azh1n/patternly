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
          <div class="current-stitches-container" :style="currentStitchesContainerStyle">
            <div v-for="(stitch, i) in currentStitchesView" 
              :key="`focused-stitch-${i}`" 
              class="stitch-wrapper"
              :class="{ 'repeat-pattern-large': isRepeatPattern(stitch) }"
            >
              <div class="stitch-symbol" :class="getStitchClass(stitch)">
                <template v-if="isRepeatPattern(stitch)">
                  <div class="repeat-pattern-content" :style="getRepeatGridStyle(stitch)">
                    <div class="repeat-paren-container left">
                      <div class="repeat-left-paren">(</div>
                    </div>
                    <template v-for="(repeatStitch, rIndex) in getRepeatStitches(stitch)" :key="`repeat-stitch-${rIndex}`">
                      <div class="repeat-stitch-container">
                        <div class="repeat-stitch" :class="getStitchClass(repeatStitch)">
                          <span class="stitch-count-inline">{{ getStitchCount(repeatStitch) }}</span>{{ getStitchType(repeatStitch) }}
                        </div>
                        <div v-if="rIndex < getRepeatStitches(stitch).length - 1" class="repeat-comma">,</div>
                      </div>
                    </template>
                    <div class="repeat-paren-container right">
                      <div class="repeat-right-paren">)</div>
                      <div class="repeat-multiplier">{{ getRepeatMultiplier(stitch) }}</div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <span class="stitch-count-inline">{{ getStitchCount(stitch) }}</span>{{ getStitchType(stitch) }}
                </template>
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
              'completed-stitch': i < currentStitchIndex,
              'repeat-pattern': isRepeatPattern(stitch)
            }"
          >
            <div class="stitch-symbol" :class="getStitchClass(stitch)">
              <template v-if="isRepeatPattern(stitch)">
                <div class="repeat-pattern-content" :style="getRepeatGridStyle(stitch)">
                  <div class="repeat-paren-container left">
                    <div class="repeat-left-paren">(</div>
                  </div>
                  <template v-for="(repeatStitch, rIndex) in getRepeatStitches(stitch)" :key="`repeat-stitch-${rIndex}`">
                    <div class="repeat-stitch-container">
                      <div class="repeat-stitch" :class="getStitchClass(repeatStitch)">
                        <span class="stitch-count-inline">{{ getStitchCount(repeatStitch) }}</span>{{ getStitchType(repeatStitch) }}
                      </div>
                      <div v-if="rIndex < getRepeatStitches(stitch).length - 1" class="repeat-comma">,</div>
                    </div>
                  </template>
                  <div class="repeat-paren-container right">
                    <div class="repeat-right-paren">)</div>
                    <div class="repeat-multiplier">{{ getRepeatMultiplier(stitch) }}</div>
                  </div>
                </div>
              </template>
              <template v-else>
                <span class="stitch-count-inline">{{ getStitchCount(stitch) }}</span>{{ getStitchType(stitch) }}
              </template>
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
      <div class="stitch-key-tooltip-container" :class="isDarkMode ? 'dark-theme' : 'light-theme'">
        <div class="text-stitch-key-tooltip">
          <h5>Stitch Key</h5>
          <div class="key-items">
            <div v-for="(symbol, abbr) in filteredStitches" :key="`key-${abbr}`" class="key-item">
              <div class="stitch-symbol" :class="getStitchClass(abbr)">
                {{ abbr }}
              </div>
              <span class="key-label">{{ symbol.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import StitchVisualization from './StitchVisualization.vue';
import { useTheme } from '@/services/theme';

// Get the theme state from the theme service
const { isDarkMode } = useTheme();

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
const currentStitchesContainerStyle = computed(() => {
  return {
    '--stitches-per-view': stitchesPerView.value
  };
});

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

// Toggle for expanding/collapsing stitches
const toggleStitchDisplay = () => {
  displayRepeatedStitchesSeparately.value = !displayRepeatedStitchesSeparately.value;
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
      
      // Handle repeat patterns like "(1sc, 1inc) x6"
      if (typeof stitch === 'string' && stitch.includes('(') && stitch.includes(')') && stitch.includes('x')) {
        const repeatMatch = stitch.match(/\(([^)]+)\)\s*x(\d+)/);
        if (repeatMatch) {
          const repeatedContent = repeatMatch[1];
          const repeatCount = parseInt(repeatMatch[2], 10);
          
          // Split the repeated content by commas
          const stitches = repeatedContent.split(',').map(s => s.trim());
          
          // Repeat the pattern
          for (let i = 0; i < repeatCount; i++) {
            stitches.forEach(s => {
              const match = s.match(/^(\d+)([a-zA-Z]+)/);
              if (match) {
                const count = parseInt(match[1]);
                const type = match[2];
                
                for (let j = 0; j < count; j++) {
                  expandedStitches.push(type);
                }
              } else {
                expandedStitches.push(s);
              }
            });
          }
        }
      } else {
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

// Check if a stitch is a repeat pattern
function isRepeatPattern(stitch) {
  return typeof stitch === 'string' && stitch.includes('(') && stitch.includes(')') && stitch.includes('x');
}

// Format the repeat pattern content
function formatRepeatPattern(stitch) {
  if (!isRepeatPattern(stitch)) return stitch;
  
  const match = stitch.match(/\(([^)]+)\)/);
  return match ? match[1] : stitch;
}

// Get individual stitches from a repeat pattern
function getRepeatStitches(stitch) {
  if (!isRepeatPattern(stitch)) return [];
  
  const content = formatRepeatPattern(stitch);
  return content.split(',').map(s => s.trim());
}

// Calculate grid layout for repeat pattern
function getRepeatGridStyle(stitch) {
  if (!isRepeatPattern(stitch)) return {};
  
  const stitches = getRepeatStitches(stitch);
  const stitchCount = stitches.length;
  
  // Fixed width for a single stitch
  const singleStitchWidth = 40; 
  
  return {
    display: 'grid',
    gridTemplateColumns: `20px repeat(${stitchCount}, ${singleStitchWidth}px) 30px`,
    width: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '4px',
    '--stitch-count': stitchCount,
    paddingInline: '7px'
  };
}

// Get the multiplier (the "x2" part) from a repeat pattern
function getRepeatMultiplier(stitch) {
  if (!isRepeatPattern(stitch)) return '';
  
  const match = stitch.match(/x(\d+)/);
  return match ? `x${match[1]}` : '';
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
  stitchesPerView,
  displayRepeatedStitchesSeparately
});
</script>

<style scoped>
.text-stitches {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Current stitches container with fixed width */
.current-stitches-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 25px;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 15px;
  overflow-x: hidden;
}

/* Stitch wrapper */
.stitch-wrapper {
  display: inline-block;
  margin: 2px;
  transition: all 0.2s ease;
}

/* Make stitch size responsive based on stitches per view */
.text-stitches :deep(.current-stitches) .stitch-wrapper {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
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
  transition: all 0.2s ease;
}

.text-stitches :deep(.current-stitches) .stitch-symbol {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  font-size: 0.875rem;
  box-sizing: border-box;
}

/* Make repeat patterns responsive */
.text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large {
  width: auto;
  flex-basis: auto;
  max-width: 280px;
}

.text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .repeat-pattern-content {
  width: auto !important;
  max-width: 100%;
}

.text-stitches :deep(.current-stitches) {
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 10px 0;
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

/* Stitch count badge */
.stitch-count-badge {
  display: none;
}

.stitch-count-badge.smaller-badge {
  display: none;
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

/* Repeat pattern styling */
.stitch-wrapper.repeat-pattern {
  width: auto;
  min-width: auto;
  display: flex;
  flex-direction: column;
}

.stitch-wrapper.repeat-pattern .stitch-symbol {
  width: auto;
  height: auto;
  min-width: auto;
  font-size: 0.75rem;
  padding: 0;
  white-space: normal;
  background-color: rgba(0, 0, 0, 0.05);
  border: 1px dashed var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  box-sizing: border-box;
}

/* Styling for repeat pattern components */
.repeat-pattern-content {
  display: grid;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
}

.repeat-stitch-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  position: relative;
}

.repeat-paren-container {
  display: flex;
  align-items: center;
  height: 40px;
}

.repeat-paren-container.left {
  justify-content: flex-end;
  padding-right: 2px;
}

.repeat-paren-container.right {
  justify-content: flex-start;
  padding-left: 0;
  display: flex;
  align-items: center;
}

.repeat-left-paren, .repeat-right-paren {
  font-size: 1.2rem;
  font-weight: 500;
  opacity: 0.8;
}

.repeat-comma {
  display: none; /* Hide the commas */
}

/* Keep structure styles but remove old selectors that are no longer used */
.repeat-inner {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.repeat-stitch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-weight: 500;
  height: 40px;
  width: 40px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.8rem;
}

.repeat-multiplier {
  font-weight: bold;
  color: var(--accent-color);
  margin-left: 0; /* Remove the margin to bring multiplier closer to parenthesis */
  font-size: 0.9rem;
  white-space: nowrap;
}

/* Stitch type colors inside repeat patterns */
.repeat-stitch.stitch-sc {
  background-color: rgba(76, 175, 80, 0.25);
  color: #e8f5e9;
}

.repeat-stitch.stitch-dc {
  background-color: rgba(33, 150, 243, 0.25);
  color: #e3f2fd;
}

.repeat-stitch.stitch-hdc {
  background-color: rgba(103, 58, 183, 0.25);
  color: #ede7f6;
}

.repeat-stitch.stitch-tr {
  background-color: rgba(255, 152, 0, 0.25);
  color: #fff8e1;
}

.repeat-stitch.stitch-dtr {
  background-color: rgba(255, 87, 34, 0.25);
  color: #fbe9e7;
}

.repeat-stitch.stitch-ch {
  background-color: rgba(76, 175, 80, 0.25);
  color: #e8f5e9;
}

.repeat-stitch.stitch-sl {
  background-color: rgba(158, 158, 158, 0.25);
  color: #f5f5f5;
}

.repeat-stitch.stitch-inc {
  background-color: rgba(63, 81, 181, 0.25);
  color: #e8eaf6;
}

.repeat-stitch.stitch-dec {
  background-color: rgba(156, 39, 176, 0.25);
  color: #f3e5f5;
}

.repeat-stitch.stitch-bs {
  background-color: rgba(0, 188, 212, 0.25);
  color: #e0f7fa;
}

.repeat-stitch.stitch-ns {
  background-color: rgba(96, 125, 139, 0.25);
  color: #eceff1;
}

/* Light theme overrides for stitch colors */
:root.light .repeat-stitch.stitch-sc {
  background-color: rgba(76, 175, 80, 0.2);
  color: #1b5e20;
}

:root.light .repeat-stitch.stitch-dc {
  background-color: rgba(33, 150, 243, 0.2);
  color: #0d47a1;
}

:root.light .repeat-stitch.stitch-hdc {
  background-color: rgba(103, 58, 183, 0.2);
  color: #4a148c;
}

:root.light .repeat-stitch.stitch-tr {
  background-color: rgba(255, 152, 0, 0.2);
  color: #e65100;
}

:root.light .repeat-stitch.stitch-dtr {
  background-color: rgba(255, 87, 34, 0.2);
  color: #bf360c;
}

:root.light .repeat-stitch.stitch-ch {
  background-color: rgba(76, 175, 80, 0.2);
  color: #1b5e20;
}

:root.light .repeat-stitch.stitch-sl {
  background-color: rgba(158, 158, 158, 0.2);
  color: #212121;
}

:root.light .repeat-stitch.stitch-inc {
  background-color: rgba(63, 81, 181, 0.2);
  color: #1a237e;
}

:root.light .repeat-stitch.stitch-dec {
  background-color: rgba(156, 39, 176, 0.2);
  color: #4a148c;
}

:root.light .repeat-stitch.stitch-bs {
  background-color: rgba(0, 188, 212, 0.2);
  color: #006064;
}

:root.light .repeat-stitch.stitch-ns {
  background-color: rgba(96, 125, 139, 0.2);
  color: #263238;
}

.stitch-key-wrapper {
  position: relative;
  display: inline-block;
  align-self: flex-end;
  margin: 0;
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

.stitch-key-tooltip-container {
  position: absolute;
  bottom: 100%;
  right: 0;
  z-index: 100;
  display: none;
}

.stitch-key-wrapper:hover .stitch-key-tooltip-container {
  display: block;
}

/* Text stitch key tooltip */
.text-stitch-key-tooltip {
  width: 420px;
  border-radius: 6px;
  padding: 0.75rem;
}

.text-stitch-key-tooltip h5 {
  margin: 0 0 0.75rem;
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
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  width: calc(50% - 0.375rem);
  min-width: 180px;
}

.key-label {
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 140px;
}

/* Light theme styles */
.stitch-key-tooltip-container.light-theme {
  background-color: #FFFFFF !important;
  border: 1px solid #E0E0E0 !important;
  color: #333333 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.stitch-key-tooltip-container.light-theme .text-stitch-key-tooltip {
  background-color: #FFFFFF !important;
  border: 1px solid #E0E0E0 !important;
  color: #333333 !important;
}

.stitch-key-tooltip-container.light-theme h5 {
  color: #333333 !important;
}

.stitch-key-tooltip-container.light-theme .key-item {
  background-color: rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

.stitch-key-tooltip-container.light-theme .key-label {
  color: #333333 !important;
}

/* Dark theme styles */
.stitch-key-tooltip-container.dark-theme .text-stitch-key-tooltip {
  background-color: #333333 !important;
  border: 1px solid #444444 !important;
  color: #FFFFFF !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.stitch-key-tooltip-container.dark-theme h5 {
  color: #FFFFFF !important;
}

.stitch-key-tooltip-container.dark-theme .key-item {
  background-color: rgba(0, 0, 0, 0.15) !important;
  border-color: transparent !important;
}

.stitch-key-tooltip-container.dark-theme .key-label {
  color: #FFFFFF !important;
}

/* Light theme overrides for the question mark */
:root.light .question-mark {
  background-color: #aaa;
  color: white;
}

:root.light .stitch-key-trigger:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Light theme overrides */
:root.light .stitch-symbol {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  color: #333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Restored light theme overrides for stitch types */
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

:root.light .stitch-wrapper.preview-stitch.completed-stitch .stitch-symbol {
  background-color: #e0e0e0 !important;
  border-color: #ccc !important;
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .current-stitches-container {
    padding: 2px;
    gap: 2px;
  }
  
  .text-stitches :deep(.current-stitches) .stitch-wrapper {
    margin: 1px;
    min-width: 25px;
  }
  
  .text-stitches :deep(.current-stitches) .stitch-symbol {
    min-width: 25px;
    height: 34px;
    font-size: clamp(0.6rem, 1.5vw, 0.75rem);
  }
  
  .text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large {
    max-width: 100%;
  }
  
  .text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .repeat-stitch {
    min-width: 25px;
    height: 40px !important;
    width: 40px !important;
    min-height: 25px;
    font-size: 0.65rem;
  }
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

.stitch-symbol.with-count {
  overflow: visible;
}

:root.light .expand-toggle {
  background: #2979ff;
  color: white;
}

:root.light .expand-toggle[aria-pressed="true"] {
  background: #1565c0;
}

/* Large repeat pattern in current stitches */
.stitch-wrapper.repeat-pattern-large .repeat-pattern-content {
  transform: scale(1.1);
  height: 44px;
  width: calc((var(--stitch-count) + 1) * 44px) !important;
  grid-template-columns: 16px repeat(var(--stitch-count), 50px) 28px !important;
}

.stitch-wrapper.repeat-pattern-large .repeat-left-paren,
.stitch-wrapper.repeat-pattern-large .repeat-right-paren {
  font-size: 1.4rem;
}

.stitch-wrapper.repeat-pattern-large .repeat-multiplier {
  font-size: 1.1rem;
}

.stitch-wrapper.repeat-pattern-large .repeat-stitch {
  height: 44px;
  width: 44px;
  font-size: 0.9rem;
}

/* Light theme overrides for repeat patterns */
:root.light .stitch-wrapper.repeat-pattern .stitch-symbol {
  background-color: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
}

:root.light .repeat-multiplier {
  color: #4CAF50;
}

/* Dark theme overrides for repeat patterns */
:root:not(.light) .stitch-wrapper.repeat-pattern .stitch-symbol {
  background-color: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3);
}

:root:not(.light) .repeat-multiplier {
  color: #4CAF50;
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

/* CSS rules for focused view repeat patterns */
.text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large {
  margin-inline: 60px;
  background-color: transparent;
  border-radius: 0;
}

.text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .stitch-symbol {
  background-color: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3);
  border: 1px solid rgba(76, 175, 80, 0.3);
  width: 100%;
  height: auto;
  padding: 0;
}

.text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .repeat-pattern-content {
  transform: none;
  width: 100% !important;
  max-width: 100%;
  height: auto;
  min-height: 44px;
  display: grid;
  justify-content: center;
  align-items: center;
  margin: 0;
}

.text-stitches :deep(.current-stitches) .repeat-stitch-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  margin: 0;
}

.text-stitches :deep(.current-stitches) .repeat-stitch {
  width: 50px !important;
  height: 50px !important;
  font-size: 1.1rem;
  font-weight: 600;
  box-shadow: none;
  border: none;
  border-radius: 3px;
}

.text-stitches :deep(.current-stitches) .repeat-comma {
  display: none;
}

.text-stitches :deep(.current-stitches) .repeat-paren-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
}

.text-stitches :deep(.current-stitches) .repeat-paren-container.left {
  padding-right: 2px;
  justify-content: flex-end;
}

.text-stitches :deep(.current-stitches) .repeat-paren-container.right {
  padding-left: 0;
  justify-content: flex-start;
  display: flex;
  align-items: center;
}

.text-stitches :deep(.current-stitches) .repeat-left-paren,
.text-stitches :deep(.current-stitches) .repeat-right-paren {
  font-size: 1.4rem;
  font-weight: 500;
  opacity: 0.8;
}

.text-stitches :deep(.current-stitches) .repeat-multiplier {
  font-weight: bold;
  color: var(--accent-color, #4f87ff);
  margin-left: 0;
  font-size: 1.1rem;
  white-space: nowrap;
}

/* Override stitch colors in focused view repeat patterns to match the preview */
.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-sc {
  background-color: rgba(76, 175, 80, 0.25);
  color: #e8f5e9;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-dc {
  background-color: rgba(33, 150, 243, 0.25);
  color: #e3f2fd;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-hdc {
  background-color: rgba(103, 58, 183, 0.25);
  color: #ede7f6;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-tr {
  background-color: rgba(255, 152, 0, 0.25);
  color: #fff8e1;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-dtr {
  background-color: rgba(255, 87, 34, 0.25);
  color: #fbe9e7;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-ch {
  background-color: rgba(76, 175, 80, 0.25);
  color: #e8f5e9;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-sl {
  background-color: rgba(158, 158, 158, 0.25);
  color: #f5f5f5;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-inc {
  background-color: rgba(63, 81, 181, 0.25);
  color: #e8eaf6;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-dec {
  background-color: rgba(156, 39, 176, 0.25);
  color: #f3e5f5;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-bs {
  background-color: rgba(0, 188, 212, 0.25);
  color: #e0f7fa;
  border: none;
}

.text-stitches :deep(.current-stitches) .repeat-stitch.stitch-ns {
  background-color: rgba(96, 125, 139, 0.25);
  color: #eceff1;
  border: none;
}

/* Light theme overrides for focused view repeat stitches */
:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-sc {
  background-color: rgba(76, 175, 80, 0.2);
  color: #1b5e20;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-dc {
  background-color: rgba(33, 150, 243, 0.2);
  color: #0d47a1;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-hdc {
  background-color: rgba(103, 58, 183, 0.2);
  color: #4a148c;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-tr {
  background-color: rgba(255, 152, 0, 0.2);
  color: #e65100;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-dtr {
  background-color: rgba(255, 87, 34, 0.2);
  color: #bf360c;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-ch {
  background-color: rgba(76, 175, 80, 0.2);
  color: #1b5e20;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-sl {
  background-color: rgba(158, 158, 158, 0.2);
  color: #212121;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-inc {
  background-color: rgba(63, 81, 181, 0.2);
  color: #1a237e;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-dec {
  background-color: rgba(156, 39, 176, 0.2);
  color: #4a148c;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-bs {
  background-color: rgba(0, 188, 212, 0.2);
  color: #006064;
}

:root.light .text-stitches :deep(.current-stitches) .repeat-stitch.stitch-ns {
  background-color: rgba(96, 125, 139, 0.2);
  color: #263238;
}

/* Light theme override for focused repeat pattern container */
:root.light .text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .stitch-symbol {
  background-color: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
}

/* Desktop styles for repeat patterns */
@media (min-width: 768px) {
  .text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large {
    margin-inline: 60px;
    background-color: transparent;
    border-radius: 0;
  }
  
  .text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .stitch-symbol {
    background-color: rgba(76, 175, 80, 0.15);
    border-color: rgba(76, 175, 80, 0.3);
    border: 1px solid rgba(76, 175, 80, 0.3);
    width: 100%;
    height: auto;
    padding: 0;
  }
  
  .text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .repeat-pattern-content {
    transform: none;
    width: 100% !important;
    max-width: 100%;
    height: auto;
    min-height: 44px;
    display: grid;
    justify-content: center;
    align-items: center;
    margin: 0;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-stitch-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    margin: 0;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-stitch {
    width: 50px !important;
    height: 50px !important;
    font-size: 1.1rem;
    font-weight: 600;
    box-shadow: none;
    border: none;
    border-radius: 3px;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-comma {
    display: none;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-paren-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 44px;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-paren-container.left {
    padding-right: 2px;
    justify-content: flex-end;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-paren-container.right {
    padding-left: 0;
    justify-content: flex-start;
    display: flex;
    align-items: center;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-left-paren,
  .text-stitches :deep(.current-stitches) .repeat-right-paren {
    font-size: 1.4rem;
    font-weight: 500;
    opacity: 0.8;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-multiplier {
    font-weight: bold;
    color: var(--accent-color, #4f87ff);
    margin-left: 0;
    font-size: 1.1rem;
    white-space: nowrap;
  }
}

/* Mobile styles for repeat patterns */
@media (max-width: 767px) {
  .text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large {
    margin-inline: 0;
    background-color: transparent;
    border-radius: 0;
  }
  
  .text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .stitch-symbol {
    background-color: rgba(76, 175, 80, 0.15);
    border-color: rgba(76, 175, 80, 0.3);
    border: 1px solid rgba(76, 175, 80, 0.3);
    width: 85%;
    height: auto;
    padding: 0;
  }
  
  .text-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .repeat-pattern-content {
    transform: none;
    width: 100% !important;
    max-width: 100%;
    height: auto;
    min-height: 44px;
    display: grid;
    justify-content: center;
    align-items: center;
    margin: 0;
    gap: 0 !important;
    grid-template-columns: 12px repeat(var(--stitch-count), auto) 20px !important;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-stitch-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0;
    margin: 0;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-stitch {
    width: 40px !important;
    height: 40px !important;
    font-size: 0.9rem;
    font-weight: 600;
    box-shadow: none;
    border: none;
    border-radius: 3px;
    margin: 0;
    padding: 0;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-comma {
    display: none;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-paren-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0;
    margin: 0;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-paren-container.left {
    margin-right: 0;
    padding-right: 0;
    justify-content: flex-end;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-paren-container.right {
    margin-left: 0;
    padding-left: 0;
    justify-content: flex-start;
    display: flex;
    align-items: center;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-left-paren,
  .text-stitches :deep(.current-stitches) .repeat-right-paren {
    font-size: 1rem;
    font-weight: 500;
    opacity: 0.8;
  }
  
  .text-stitches :deep(.current-stitches) .repeat-multiplier {
    font-weight: bold;
    color: var(--accent-color, #4f87ff);
    margin-left: 0;
    font-size: 0.8rem;
    white-space: nowrap;
  }
  
  /* Full preview repeat pattern mobile styles */
  .stitch-wrapper.preview-stitch.repeat-pattern .repeat-pattern-content {
    padding-inline: 0px !important;
  }
}
</style> 


