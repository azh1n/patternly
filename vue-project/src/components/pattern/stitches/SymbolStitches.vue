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
          <div class="current-stitches-container" :style="currentStitchesContainerStyle">
            <div v-for="(stitch, i) in currentStitchesView" 
              :key="`focused-stitch-${i}`" 
              class="stitch-wrapper"
              :class="{ 'repeat-pattern-large': isRepeatPattern(stitch) }"
            >
              <div class="stitch-symbol" :class="[getStitchClass(stitch), { 'with-count': !displayRepeatedStitchesSeparately && getStitchCount(stitch) > 1 }]">
                <template v-if="isRepeatPattern(stitch)">
                  <div class="repeat-pattern-content" :style="getRepeatGridStyle(stitch)">
                    <div class="repeat-paren-container left">
                      <div class="repeat-left-paren">(</div>
                    </div>
                    <template v-for="(repeatStitch, rIndex) in getRepeatStitches(stitch)" :key="`current-repeat-stitch-${rIndex}`">
                      <div class="repeat-stitch-container">
                        <div class="repeat-stitch" :class="getStitchClass(repeatStitch)">
                          <template v-if="checkSymbolExists(repeatStitch)">
                            <img 
                              :src="getSymbolPath(repeatStitch)" 
                              :alt="repeatStitch" 
                              class="stitch-svg medium"
                            />
                          </template>
                          <template v-else>
                            <span v-if="getStitchCount(repeatStitch) > 1" class="stitch-count-inline">{{ getStitchCount(repeatStitch) }}</span>{{ getStitchType(repeatStitch) }}
                          </template>
                          <div v-if="getStitchCount(repeatStitch) > 1" class="stitch-count-badge repeat-badge">
                            {{ getStitchCount(repeatStitch) }}
                          </div>
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
            <div class="stitch-symbol" :class="[getStitchClass(stitch), { 'with-count': !displayRepeatedStitchesSeparately && getStitchCount(stitch) > 1 }]">
              <template v-if="isRepeatPattern(stitch)">
                <div class="repeat-pattern-content" :style="getRepeatGridStyle(stitch)">
                  <div class="repeat-paren-container left">
                    <div class="repeat-left-paren">(</div>
                  </div>
                  <template v-for="(repeatStitch, rIndex) in getRepeatStitches(stitch)" :key="`repeat-stitch-${rIndex}`">
                    <div class="repeat-stitch-container">
                      <div class="repeat-stitch" :class="getStitchClass(repeatStitch)">
                        <template v-if="checkSymbolExists(repeatStitch)">
                          <img 
                            :src="getSymbolPath(repeatStitch)" 
                            :alt="repeatStitch" 
                            class="stitch-svg small"
                          />
                        </template>
                        <template v-else>
                          {{ getStitchType(repeatStitch) }}
                        </template>
                        <div v-if="getStitchCount(repeatStitch) > 1" class="stitch-count-badge repeat-badge">
                          {{ getStitchCount(repeatStitch) }}
                        </div>
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
        <StitchKeyTooltip :stitches="filteredStitches" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject, nextTick } from 'vue';
import StitchVisualization from './StitchVisualization.vue';
import { hasStitchSymbol, getStitchSymbolPath, stitchSymbolMapping } from '@/assets/crochet-symbols/stitch-mapping.js';
import { useTheme } from '@/services/theme';
import StitchKeyTooltip from './StitchKeyTooltip.vue';

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
const mounted = ref(false);
const displayRepeatedStitchesSeparately = ref(false);
const currentStitchIndex = ref(0);
const stitchesPerView = ref(props.initialStitchesPerView);
const stitchVisRef = ref(null);

const currentStitchesContainerStyle = computed(() => {
  return {
    '--stitches-per-view': stitchesPerView.value
  };
});

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

// Format the repeat pattern content - extract just the part inside parentheses
function formatRepeatPattern(stitch) {
  if (!isRepeatPattern(stitch)) return stitch;
  
  const match = stitch.match(/\(([^)]+)\)/);
  return match ? match[1] : stitch;
}

// Get the multiplier (the "x2" part) from a repeat pattern
function getRepeatMultiplier(stitch) {
  if (!isRepeatPattern(stitch)) return '';
  
  const match = stitch.match(/x(\d+)/);
  return match ? `x${match[1]}` : '';
}

// Get individual stitches from a repeat pattern
function getRepeatStitches(stitch) {
  if (!isRepeatPattern(stitch)) return [];
  
  const content = formatRepeatPattern(stitch);
  return content.split(',').map(s => s.trim());
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
  'inc': { label: 'Increase' },
  'dec': { label: 'Decrease' },
  'fpdc': { label: 'Front Post Double Crochet (fpdc)' }
  // Removed bs and ns as they don't have SVG files
};

// Setup observer for theme changes
onMounted(() => {
  // Define the observer
  const observer = new MutationObserver(() => {
    // Apply dynamic theme changes to stitch key tooltip
    const tooltip = document.querySelector('.stitch-key-tooltip-container');
    if (tooltip) {
      if (isDarkMode.value) {
        tooltip.classList.add('dark-theme');
        tooltip.classList.remove('light-theme');
      } else {
        tooltip.classList.add('light-theme');
        tooltip.classList.remove('dark-theme');
      }
    }
  });
  
  // Observe document root for style changes
  observer.observe(document.documentElement, { 
    attributes: true,
    attributeFilter: ['style']
  });
  
  // Fix the stitch symbol display function
  try {
    // Override the hasStitchSymbol function to also check if the SVG file actually exists
    // This is needed because some stitch symbols might be defined in the mapping but don't have SVG files
    const originalHasStitchSymbol = hasStitchSymbol;
    
    // Create a set of available SVGs
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
      // 'border-stitch.svg' and 'negative-stitch.svg' don't exist in the assets folder
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
  
  // Clean up
  onUnmounted(() => {
    observer.disconnect();
    
    // Clean up stitch symbol override
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
});

// Expose some methods/properties to parent
defineExpose({
  currentStitchIndex,
  stitchesPerView,
  displayRepeatedStitchesSeparately
});

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
</script>

<style scoped>
.symbol-stitches {
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
  overflow-y: visible;
}

/* Stitch wrapper */
.stitch-wrapper {
  display: inline-block;
  margin: 2px;
  transition: all 0.2s ease;
}

/* Make stitch size responsive based on stitches per view */
.symbol-stitches :deep(.current-stitches) .stitch-wrapper {
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
  background: var(--stitch-bg, #333);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.symbol-stitches :deep(.current-stitches) .stitch-symbol {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  font-size: 0.875rem;
  box-sizing: border-box;
}

/* Make repeat patterns responsive */
.symbol-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large {
  width: auto;
  flex-basis: auto;
  max-width: 280px;
}

.symbol-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .repeat-pattern-content {
  width: auto !important;
  max-width: 100%;
}

.symbol-stitches :deep(.current-stitches) {
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
  z-index: 5;
  overflow: visible;
}

.stitch-count-badge.smaller-badge {
  min-width: 14px;
  height: 14px;
  top: -2px;
  right: 0px;
  font-size: 0.5rem;
  padding: 0 2px;
  border-width: 1px;
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

.repeat-multiplier {
  font-weight: bold;
  color: var(--accent-color);
  margin-left: 0; /* Remove the margin to bring multiplier closer to parenthesis */
  font-size: 0.9rem;
  white-space: nowrap;
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

/* CSS rules for focused view repeat patterns - copied from TextStitches.vue */
.symbol-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large {
  margin-inline: 60px;
  background-color: transparent;
  border-radius: 0;
}

.symbol-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .stitch-symbol {
  background-color: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3);
  border: 1px solid rgba(76, 175, 80, 0.3);
  width: 100%;
  height: auto;
  padding: 0;
}

.symbol-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .repeat-pattern-content {
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

.symbol-stitches :deep(.current-stitches) .repeat-stitch-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  margin: 0;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-weight: 500;
  height: 50px !important;
  width: 50px !important;
  box-sizing: border-box;
  overflow: visible;
  text-overflow: ellipsis;
  font-size: 1.1rem;
  font-weight: 600;
  box-shadow: none;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-comma {
  display: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-paren-container {
  display: flex;
  align-items: center;
  height: 44px;
}

.symbol-stitches :deep(.current-stitches) .repeat-paren-container.left {
  justify-content: flex-end;
  padding-right: 2px;
}

.symbol-stitches :deep(.current-stitches) .repeat-paren-container.right {
  justify-content: flex-start;
  padding-left: 0;
  display: flex;
  align-items: center;
}

.symbol-stitches :deep(.current-stitches) .repeat-left-paren,
.symbol-stitches :deep(.current-stitches) .repeat-right-paren {
  font-size: 1.4rem;
  font-weight: 500;
  opacity: 0.8;
}

.symbol-stitches :deep(.current-stitches) .repeat-multiplier {
  font-weight: bold;
  color: var(--accent-color, #4f87ff);
  margin-left: 0;
  font-size: 1.1rem;
  white-space: nowrap;
}

/* Light theme override for focused repeat pattern container */
:root.light .symbol-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .stitch-symbol {
  background-color: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
}

/* Override stitch colors in focused view repeat patterns to match the preview */
.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-sc {
  background-color: rgba(76, 175, 80, 0.25);
  color: #e8f5e9;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-dc {
  background-color: rgba(33, 150, 243, 0.25);
  color: #e3f2fd;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-hdc {
  background-color: rgba(103, 58, 183, 0.25);
  color: #ede7f6;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-tr {
  background-color: rgba(255, 152, 0, 0.25);
  color: #fff8e1;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-dtr {
  background-color: rgba(255, 87, 34, 0.25);
  color: #fbe9e7;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-ch {
  background-color: rgba(76, 175, 80, 0.25);
  color: #e8f5e9;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-sl {
  background-color: rgba(158, 158, 158, 0.25);
  color: #f5f5f5;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-inc {
  background-color: rgba(63, 81, 181, 0.25);
  color: #e8eaf6;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-dec {
  background-color: rgba(156, 39, 176, 0.25);
  color: #f3e5f5;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-bs {
  background-color: rgba(0, 188, 212, 0.25);
  color: #e0f7fa;
  border: none;
}

.symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-ns {
  background-color: rgba(96, 125, 139, 0.25);
  color: #eceff1;
  border: none;
}

/* Light theme overrides for focused view repeat stitches */
:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-sc {
  background-color: rgba(76, 175, 80, 0.2);
  color: #1b5e20;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-dc {
  background-color: rgba(33, 150, 243, 0.2);
  color: #0d47a1;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-hdc {
  background-color: rgba(103, 58, 183, 0.2);
  color: #4a148c;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-tr {
  background-color: rgba(255, 152, 0, 0.2);
  color: #e65100;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-dtr {
  background-color: rgba(255, 87, 34, 0.2);
  color: #bf360c;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-ch {
  background-color: rgba(76, 175, 80, 0.2);
  color: #1b5e20;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-sl {
  background-color: rgba(158, 158, 158, 0.2);
  color: #212121;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-inc {
  background-color: rgba(63, 81, 181, 0.2);
  color: #1a237e;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-dec {
  background-color: rgba(156, 39, 176, 0.2);
  color: #4a148c;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-bs {
  background-color: rgba(0, 188, 212, 0.2);
  color: #006064;
}

:root.light .symbol-stitches :deep(.current-stitches) .repeat-stitch.stitch-ns {
  background-color: rgba(96, 125, 139, 0.2);
  color: #263238;
}

/* Mobile styles for repeat patterns */
@media (max-width: 767px) {
  .current-stitches-container {
    padding: 2px;
    gap: 2px;
    overflow: visible;
  }
  
  .symbol-stitches :deep(.current-stitches) {
    overflow: visible;
  }
  
  .symbol-stitches :deep(.current-stitches) .stitch-wrapper {
    margin: 1px;
    min-width: 25px;
  }
  
  .symbol-stitches :deep(.current-stitches) .stitch-symbol {
    min-width: 25px;
    height: 34px;
    font-size: clamp(0.6rem, 1.5vw, 0.75rem);
  }
  
  /* Add styles for SVG images in focused view on mobile */
  .symbol-stitches :deep(.current-stitches) .stitch-symbol .stitch-svg {
    width: 20px;
    height: 20px;
  }
  
  .symbol-stitches :deep(.current-stitches) .stitch-symbol .stitch-svg.medium {
    width: 18px;
    height: 18px;
  }
  
  /* Focused view repeat styles for mobile */
  .symbol-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large {
    margin-inline: 0;
    background-color: transparent;
    border-radius: 0;
  }
  
  .symbol-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .stitch-symbol {
    background-color: rgba(76, 175, 80, 0.15);
    border-color: rgba(76, 175, 80, 0.3);
    border: 1px solid rgba(76, 175, 80, 0.3);
    width: 85%;
    height: auto;
    padding: 0;
  }
  
  .symbol-stitches :deep(.current-stitches) .stitch-wrapper.repeat-pattern-large .repeat-pattern-content {
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
  
  .symbol-stitches :deep(.current-stitches) .repeat-stitch-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0;
    margin: 0;
  }
  
  .symbol-stitches :deep(.current-stitches) .repeat-stitch {
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
  
  .symbol-stitches :deep(.current-stitches) .repeat-paren-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0;
    margin: 0;
  }
  
  .symbol-stitches :deep(.current-stitches) .repeat-paren-container.left {
    margin-right: 0;
    padding-right: 0;
    justify-content: flex-end;
  }
  
  .symbol-stitches :deep(.current-stitches) .repeat-paren-container.right {
    margin-left: 0;
    padding-left: 0;
    justify-content: flex-start;
    display: flex;
    align-items: center;
  }
  
  .symbol-stitches :deep(.current-stitches) .repeat-left-paren,
  .symbol-stitches :deep(.current-stitches) .repeat-right-paren {
    font-size: 1rem;
    font-weight: 500;
    opacity: 0.8;
  }
  
  .symbol-stitches :deep(.current-stitches) .repeat-multiplier {
    font-weight: bold;
    color: var(--accent-color, #4f87ff);
    margin-left: 0;
    font-size: 0.8rem;
    white-space: nowrap;
  }
  
  /* Full row preview mobile styles - restored */
  .symbol-stitches :deep(.full-row-preview) {
    margin-top: 0.25rem;
    padding-top: 0.75rem;
  }
  
  .symbol-stitches :deep(.full-row-preview h3) {
    margin-bottom: 0.5rem;
    font-size: 1rem;
  }
  
  .stitch-wrapper.preview-stitch {
    margin: 1px;
  }
  
  .stitch-wrapper.preview-stitch.current-stitch {
    transform: translateY(-2px);
  }
  
  .stitch-wrapper.preview-stitch.current-stitch .stitch-symbol {
    border: 1.5px solid var(--accent-color, #4f87ff);
  }
  
  .symbol-stitches :deep(.preview-content) {
    gap: 2px;
    padding: 2px 0;
  }
  
  /* Full preview repeat pattern mobile styles */
  .stitch-wrapper.preview-stitch.repeat-pattern .repeat-pattern-content {
    padding-inline: 0px !important;
  }
}

/* Full row preview styling */
.symbol-stitches :deep(.full-row-preview) {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #444);
}

.symbol-stitches :deep(.full-row-preview h3) {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  text-align: center;
  color: var(--text-primary);
  font-weight: 600;
}

.symbol-stitches :deep(.preview-content) {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  max-width: 100%;
  overflow-x: auto;
}

/* Stitch appearance in preview */
.stitch-wrapper.preview-stitch .stitch-symbol {
  width: 45px;
  height: 45px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.stitch-wrapper.preview-stitch .stitch-svg {
  width: 35px;
  height: 35px;
  object-fit: contain;
}

.stitch-wrapper.preview-stitch .stitch-svg.small {
  width: 28px;
  height: 28px;
}

/* Additional theme targeting using CSS variables */
.stitch-key-tooltip {
  background-color: var(--card-bg, #FFFFFF) !important;
  border: 1px solid var(--border-color, #E0E0E0) !important;
  color: var(--text-primary, #333333) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.stitch-key-tooltip h5 {
  color: var(--text-primary, #333333) !important;
}

.key-item {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05)) !important;
  border-color: var(--border-color, rgba(0, 0, 0, 0.05)) !important;
}

.key-label {
  color: var(--text-primary, #333333) !important;
}

/* Base repeat badge styling */
.repeat-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  font-size: 0.65rem;
  z-index: 999;
  padding: 0 3px;
}

/* Specific styling for repeat badges in the preview row */
.symbol-stitches :deep(.preview-stitch) .repeat-badge {
  top: -6px;
  right: -6px;
  z-index: 999;
}

/* Specific styling for repeat badges in the focused view */
.symbol-stitches :deep(.current-stitches) .repeat-badge {
  top: -4px;
  right: -5px;
  min-width: 14px;
  height: 14px;
  font-size: 0.5rem;
  z-index: 1;
}

/* Ensure the repeat pattern containers can display badges properly */
.symbol-stitches :deep(.current-stitches) .repeat-stitch,
.symbol-stitches :deep(.preview-content) .repeat-stitch {
  overflow: visible;
  position: relative;
}

@media (max-width: 767px) {
  .repeat-badge {
    min-width: 14px;
    height: 14px;
    font-size: 0.6rem;
    top: -5px;
    right: -5px;
  }
  
  .symbol-stitches :deep(.current-stitches) .repeat-badge {
    top: -2px;
    right: 0px;
    min-width: 14px;
    height: 14px;
    font-size: 0.5rem;
  }
}

/* Light theme overrides for completed stitches */
:root.light .stitch-wrapper.preview-stitch.completed-stitch .stitch-symbol {
  background-color: #e0e0e0 !important;
  border-color: #ccc !important;
}

.symbol-stitches :deep(.preview-content) {
  gap: 0.2rem;
  padding: 0.25rem 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.stitch-wrapper.preview-stitch {
  position: relative;
  transition: all 0.2s ease;
  margin: 2px;
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

/* Mobile specific preview adjustments */
@media (max-width: 767px) {
  .symbol-stitches :deep(.full-row-preview) {
    margin-top: 0.25rem;
    padding-top: 0.75rem;
  }
  
  .symbol-stitches :deep(.full-row-preview h3) {
    margin-bottom: 0.5rem;
    font-size: 1rem;
  }
  
  .stitch-wrapper.preview-stitch {
    margin: 1px;
  }
  
  .stitch-wrapper.preview-stitch.current-stitch {
    transform: translateY(-2px);
  }
  
  .stitch-wrapper.preview-stitch.current-stitch .stitch-symbol {
    border: 1.5px solid var(--accent-color, #4f87ff);
  }
}

/* Full row preview styling */
.symbol-stitches :deep(.full-row-preview) {
  margin-top: 0.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color, #444);
}

.symbol-stitches :deep(.full-row-preview h3) {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  text-align: center;
  color: var(--text-primary);
  font-weight: 600;
}

.symbol-stitches :deep(.preview-content) {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  max-width: 100%;
  overflow-x: auto;
}

/* Stitch appearance in preview */
.stitch-wrapper.preview-stitch .stitch-symbol {
  width: 45px;
  height: 45px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.stitch-wrapper.preview-stitch .stitch-svg {
  width: 35px;
  height: 35px;
  object-fit: contain;
}

.stitch-wrapper.preview-stitch .stitch-svg.small {
  width: 28px;
  height: 28px;
}

/* Increase badge size for preview */
.stitch-wrapper.preview-stitch .stitch-count-badge {
  min-width: 20px;
  height: 20px;
  font-size: 0.75rem;
  top: -8px;
  right: -8px;
  padding: 0 4px;
}

/* Larger repeat pattern stitches */
.stitch-wrapper.preview-stitch.repeat-pattern .repeat-stitch {
  width: 45px !important;
  height: 45px !important;
  font-size: 0.9rem;
}

@media (max-width: 767px) {
  .stitch-wrapper.preview-stitch .stitch-symbol {
    width: 40px;
    height: 40px;
    font-size: 0.85rem;
  }
  
  .stitch-wrapper.preview-stitch .stitch-svg {
    width: 30px;
    height: 30px;
  }
  
  .stitch-wrapper.preview-stitch .stitch-svg.small {
    width: 24px;
    height: 24px;
  }
  
  .stitch-wrapper.preview-stitch .stitch-count-badge {
    min-width: 18px;
    height: 18px;
    font-size: 0.7rem;
  }
}

/* Styling for repeat pattern components */
.repeat-pattern-content {
  position: relative;
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

.repeat-stitch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-weight: 500;
  height: 40px;
  width: 40px;
  box-sizing: border-box;
  position: relative;
  overflow: visible;
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

/* Repeat pattern styling in preview */
.stitch-wrapper.preview-stitch.repeat-pattern {
  width: auto;
  min-width: auto;
  display: flex;
  flex-direction: column;
}

.stitch-wrapper.preview-stitch.repeat-pattern .stitch-symbol {
  width: auto;
  min-width: 150px;
  height: auto;
  min-height: 45px;
  font-size: 0.9rem;
  padding: 0;
  white-space: normal;
  background-color: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3) !important;
  border: 1px dashed var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  box-sizing: border-box;
}

.stitch-wrapper.preview-stitch.repeat-pattern .repeat-pattern-content {
  display: grid;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 45px;
  gap: 4px;
  grid-template-columns: 20px repeat(var(--stitch-count), 45px) 30px;
}

.stitch-wrapper.preview-stitch.repeat-pattern .repeat-stitch {
  width: 45px !important;
  height: 45px !important;
  font-size: 0.9rem;
}

.stitch-wrapper.preview-stitch.repeat-pattern .repeat-left-paren,
.stitch-wrapper.preview-stitch.repeat-pattern .repeat-right-paren {
  font-size: 1.4rem;
  font-weight: 500;
  opacity: 0.8;
}

.stitch-wrapper.preview-stitch.repeat-pattern .repeat-multiplier {
  font-weight: bold;
  color: var(--accent-color);
  margin-left: 0;
  font-size: 1.1rem;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .stitch-wrapper.preview-stitch.repeat-pattern .stitch-symbol {
    min-width: 120px;
    min-height: 40px;
    font-size: 0.8rem;
  }
  
  .stitch-wrapper.preview-stitch.repeat-pattern .repeat-pattern-content {
    height: 40px;
    gap: 2px;
    grid-template-columns: 15px repeat(var(--stitch-count), 40px) 25px;
  }
  
  .stitch-wrapper.preview-stitch.repeat-pattern .repeat-stitch {
    width: 40px !important;
    height: 40px !important;
    font-size: 0.85rem;
  }
  
  .stitch-wrapper.preview-stitch.repeat-pattern .repeat-left-paren,
  .stitch-wrapper.preview-stitch.repeat-pattern .repeat-right-paren {
    font-size: 1.2rem;
  }
  
  .stitch-wrapper.preview-stitch.repeat-pattern .repeat-multiplier {
    font-size: 0.9rem;
  }
}

/* Stitch key wrapper */
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

/* Expand toggle button */
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

/* Light theme overrides */
:root.light .expand-toggle {
  background: #2979ff;
  color: white;
}

:root.light .expand-toggle[aria-pressed="true"] {
  background: #1565c0;
}

:root.light .question-mark {
  background-color: #aaa;
  color: white;
}

:root.light .stitch-key-trigger:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style> 