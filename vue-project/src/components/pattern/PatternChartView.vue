<template>
  <div class="pattern-chart-view" v-if="experimental">
    <div class="notation-header">
      <h4>Pattern Chart Notation</h4>
      <div class="view-toggle">
        <button 
          @click="safeSetViewMode('linear')" 
          :class="{ 'active': viewMode === 'linear' }"
        >
          Linear
        </button>
        <button 
          @click="safeSetViewMode('circular')" 
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
      @click="toggleStitchDisplay"
    >
      <span v-if="displayRepeatedStitchesSeparately">Collapse Stitches</span>
      <span v-else>Expand Stitches</span>
    </button>

    <!-- Linear notation view -->
    <div v-if="viewMode === 'linear'" class="linear-notation">
      <div v-if="hasRows" class="row-focused-view">
        <!-- Row header section -->
        <div class="row-header">
          <div class="row-info">
            <div class="row-title">
              <h2>Row {{ currentRow?.rowNum || 1 }}</h2>
              <span class="row-color">Color {{ currentRow?.color || 'None' }}</span>
            </div>
            <button 
              @click="toggleRowComplete"
              :class="['complete-button', { 'completed': isRowComplete }]"
            >
              <span v-if="isRowComplete">✓</span>
              <span v-else>○</span>
              <span>{{ isRowComplete ? 'Completed' : 'Mark Complete' }}</span>
            </button>
            <button 
              v-show="!hasRowNotes && !showNotes"
              @click="showNotes = true"
              class="notes-button"
            >
              <span>Add Notes</span>
            </button>
          </div>
          
          <!-- Stitches per view control -->
          <div class="stitch-control">
            <label for="stitchesPerView">Stitches per view:</label>
            <div class="number-control">
              <button 
                @click="decreaseStitches" 
                :disabled="stitchesPerView <= 1"
              >
                −
              </button>
              <span>{{ stitchesPerView }}</span>
              <button 
                @click="increaseStitches" 
                :disabled="stitchesPerView >= maxStitchesPerView"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- Row notes section -->
        <div v-show="showNotes || hasRowNotes" class="row-notes-section">
          <div class="notes-header">
            <span>Row Notes</span>
            <span class="character-count" :class="{ 'limit-reached': currentRowNotes.length >= 500 }">
              {{ currentRowNotes.length }}/500
            </span>
            <button @click="saveNotes" class="save-notes-button" :class="{ 'unsaved': !notesSaved }" title="Save notes">
              <span>💾</span>
            </button>
            <button @click="hideNotes" class="close-notes-button">
              <span>×</span>
            </button>
          </div>
          <textarea 
            v-model="currentRowNotes" 
            placeholder="Add your notes for this row here..."
            class="notes-textarea"
            maxlength="500"
            @input="markAsUnsaved"
          ></textarea>
        </div>
        
        <!-- Focused stitch navigation -->
        <div class="stitch-navigation">
          <button 
            @click="previousStitches" 
            class="nav-button"
            :disabled="currentStitchIndex === 0"
          >
            <span>←</span>
          </button>
          
          <!-- Current stitches display -->
          <div class="stitch-content">
            <div class="current-stitches">
              <template v-if="currentRow && currentRow.codes && currentRow.codes.length">
                <div v-for="(stitch, i) in currentStitchesView" 
                  :key="`focused-stitch-${i}`" 
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
            </div>
            <div class="stitch-progress">
              <span class="progress-indicator">
                {{ stitchProgress }}
              </span>
            </div>
          </div>
          
          <button 
            @click="nextStitches" 
            class="nav-button"
            :disabled="currentStitchIndex + stitchesPerView >= totalStitches"
          >
            <span>→</span>
          </button>
        </div>

        <!-- Full row preview section -->
        <div class="full-row-preview">
          <h3>Full Row Preview</h3>
          <div class="preview-content">
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
        
        <!-- Row navigation controls -->
        <div class="row-navigation">
          <button 
            @click="previousRow" 
            class="nav-button large"
            :disabled="currentRowIndex === 0"
          >
            <span>←</span> Prev Row
          </button>
          <div class="row-selector">
            <span class="row-label desktop-only">Row</span>
            <select 
              v-model="currentRowIndex" 
              class="row-select"
            >
              <option 
                v-for="(row, index) in safeRows" 
                :key="index" 
                :value="index"
              >
                Row {{ row.rowNum }} ({{ row.color || 'No color' }})
              </option>
            </select>
            <span class="row-counter desktop-only">of {{ safeRows.length }}</span>
          </div>
          <button 
            @click="nextRow" 
            class="nav-button large"
            :disabled="currentRowIndex >= safeRows.length - 1"
          >
            Next Row <span>→</span>
          </button>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { hasStitchSymbol, getStitchSymbolPath, stitchSymbolMapping } from '@/assets/crochet-symbols/stitch-mapping.js';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

// Component state
const mounted = ref(false);
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

// Navigation state
const currentRowIndex = ref(0);
const currentStitchIndex = ref(0);
const stitchesPerView = ref(3);
const maxStitchesPerView = 5;

// Notes feature state
const currentRowNotes = ref('');
const showNotes = ref(false);
const notesSaved = ref(true);

// Create a safe rows accessor
const safeRows = computed(() => {
  return props.pattern?.parsedRows || [];
});

// Current row accessor
const currentRow = computed(() => {
  if (!safeRows.value.length || currentRowIndex.value >= safeRows.value.length) {
    return null;
  }
  return safeRows.value[currentRowIndex.value];
});

// Check if we have rows to display
const hasRows = computed(() => {
  return safeRows.value.length > 0;
});

// Check if current row is complete
const isRowComplete = computed(() => {
  if (!currentRow.value || !props.pattern?.completedRows) return false;
  return props.pattern.completedRows[`row${currentRow.value.rowNum}`] || false;
});

// Check if current row has notes
const hasRowNotes = computed(() => {
  if (!currentRow.value || !props.pattern?.rowNotes) return false;
  const rowKey = `row${currentRow.value.rowNum}`;
  return !!props.pattern.rowNotes[rowKey] && props.pattern.rowNotes[rowKey].trim() !== '';
});

// Total stitches in current row
const totalStitches = computed(() => {
  if (!currentRow.value || !currentRow.value.codes) return 0;
  
  return processRowStitches(currentRow.value.codes, displayRepeatedStitchesSeparately.value).length;
});

// Get current stitches for the focused view
const currentStitchesView = computed(() => {
  if (!currentRow.value || !currentRow.value.codes || !currentRow.value.codes.length) return [];
  
  const processedStitches = processRowStitches(currentRow.value.codes, displayRepeatedStitchesSeparately.value);
  return processedStitches.slice(currentStitchIndex.value, currentStitchIndex.value + stitchesPerView.value);
});

// Stitch progress indicator
const stitchProgress = computed(() => {
  if (!currentRow.value || !totalStitches.value) return '0 of 0';
  
  const start = currentStitchIndex.value + 1;
  const end = Math.min(currentStitchIndex.value + stitchesPerView.value, totalStitches.value);
  
  return `${start}-${end} of ${totalStitches.value} stitches`;
});

// Navigation methods
const nextRow = () => {
  if (!mounted.value) return;
  if (currentRowIndex.value < safeRows.value.length - 1) {
    currentRowIndex.value++;
    currentStitchIndex.value = 0; // Reset stitch index when changing rows
    nextTick(() => {
      updateScrollPosition();
      loadRowNotes();
    });
  }
};

const previousRow = () => {
  if (!mounted.value) return;
  if (currentRowIndex.value > 0) {
    currentRowIndex.value--;
    currentStitchIndex.value = 0; // Reset stitch index when changing rows
    nextTick(() => {
      updateScrollPosition();
      loadRowNotes();
    });
  }
};

const nextStitches = () => {
  if (!mounted.value) return;
  if (currentStitchIndex.value + stitchesPerView.value < totalStitches.value) {
    currentStitchIndex.value += stitchesPerView.value;
    nextTick(() => {
      updateScrollPosition();
    });
  }
};

const previousStitches = () => {
  if (!mounted.value) return;
  if (currentStitchIndex.value > 0) {
    currentStitchIndex.value = Math.max(0, currentStitchIndex.value - stitchesPerView.value);
    nextTick(() => {
      updateScrollPosition();
    });
  }
};

// Row completion toggle
const toggleRowComplete = async () => {
  if (!mounted.value || !currentRow.value) return;
  
  try {
    const textId = props.pattern.id;
    const completionData = props.pattern.completedRows || {};
    completionData[`row${currentRow.value.rowNum}`] = !completionData[`row${currentRow.value.rowNum}`];
    
    await updateDoc(doc(db, 'patterns', textId), {
      completedRows: completionData
    });
  } catch (error) {
    console.error('Error updating row completion:', error);
  }
};

// Notes functions
const loadRowNotes = () => {
  if (!mounted.value || !currentRow.value) return;
  
  try {
    // Load existing notes for this row if any
    if (props.pattern?.rowNotes && props.pattern.rowNotes[`row${currentRow.value.rowNum}`]) {
      currentRowNotes.value = props.pattern.rowNotes[`row${currentRow.value.rowNum}`];
      notesSaved.value = true;
    } else {
      currentRowNotes.value = '';
      notesSaved.value = true;
    }
  } catch (error) {
    console.error('Error loading row notes:', error);
  }
};

const hideNotes = () => {
  if (!mounted.value) return;
  
  try {
    // If there are unsaved changes, ask user if they want to save
    if (!notesSaved.value && currentRowNotes.value.trim()) {
      if (confirm('You have unsaved notes. Would you like to save them before closing?')) {
        saveNotes();
      }
    } else if (!currentRowNotes.value.trim()) {
      // If there are no notes, remove them from storage
      saveNotes();
    }
    
    showNotes.value = false;
  } catch (error) {
    console.error('Error hiding notes:', error);
    showNotes.value = false;
  }
};

const saveNotes = async () => {
  if (!mounted.value || !currentRow.value) return;
  
  try {
    const textId = props.pattern.id;
    const notesData = props.pattern.rowNotes || {};
    
    // Only save if there's content, otherwise remove the note
    if (currentRowNotes.value.trim()) {
      notesData[`row${currentRow.value.rowNum}`] = currentRowNotes.value.trim();
    } else {
      delete notesData[`row${currentRow.value.rowNum}`];
    }
    
    await updateDoc(doc(db, 'patterns', textId), {
      rowNotes: notesData
    });
    
    // Mark notes as saved after successful save
    notesSaved.value = true;
  } catch (error) {
    console.error('Error saving row notes:', error);
  }
};

// Mark notes as unsaved when the user types
const markAsUnsaved = () => {
  if (!mounted.value) return;
  notesSaved.value = false;
};

// Stitch view controls
const decreaseStitches = () => {
  if (!mounted.value) return;
  if (stitchesPerView.value > 1) {
    stitchesPerView.value--;
  }
};

const increaseStitches = () => {
  if (!mounted.value) return;
  if (stitchesPerView.value < maxStitchesPerView) {
    stitchesPerView.value++;
  }
};

// Update scroll position in the preview
const updateScrollPosition = () => {
  if (!mounted.value) return;
  
  try {
    // Wait for DOM to update
    setTimeout(() => {
      const container = document.querySelector('.preview-content');
      if (!container) return; // Guard against missing container

      const activeStitches = container.querySelectorAll('.current-stitch');
      if (activeStitches && activeStitches.length > 0) {
        const firstActiveStitch = activeStitches[0];
        if (!firstActiveStitch) return; // Guard against missing element
        
        const containerWidth = container.offsetWidth;
        const scrollPosition = firstActiveStitch.offsetLeft - (containerWidth / 2) + (firstActiveStitch.offsetWidth * stitchesPerView.value / 2);
        
        container.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
    }, 100); // Increased delay to ensure DOM has updated
  } catch (error) {
    console.error('Error updating scroll position:', error);
  }
};

// Wrapper functions for stitch symbols
function checkSymbolExists(stitch) {
  return window.hasStitchSymbol ? window.hasStitchSymbol(stitch) : hasStitchSymbol(stitch);
}

function getSymbolPath(stitch) {
  return getStitchSymbolPath(stitch);
}

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
    
    // Set mounted state
    mounted.value = true;
    
    // Use nextTick to ensure the component is fully rendered
    nextTick(() => {
      // Initialize the scroll position after mounting
      updateScrollPosition();
      
      // Load notes for the initial row
      loadRowNotes();
    });
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

// Watch for changes to update scroll position and load notes - with safety checks
watch([currentRowIndex, currentStitchIndex, stitchesPerView], () => {
  if (!mounted.value) return;
  
  nextTick(() => {
    updateScrollPosition();
  });
});

// Watch for changes in currentRowIndex
watch(currentRowIndex, (newIndex, oldIndex) => {
  if (!mounted.value) return;
  
  // Use nextTick to ensure component is updated
  nextTick(() => {
    // Load notes for the new row
    loadRowNotes();
    
    // Update notes visibility based on whether there are notes
    if (hasRowNotes.value) {
      showNotes.value = true;
    }
  });
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

// New method to safely set view mode
const safeSetViewMode = (mode) => {
  if (mounted.value) {
    viewMode.value = mode;
  }
};

// New method to toggle stitch display
const toggleStitchDisplay = () => {
  if (mounted.value) {
    displayRepeatedStitchesSeparately.value = !displayRepeatedStitchesSeparately.value;
  }
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
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  width: 100%;
}

/* Row focused view */
.row-focused-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Row header section */
.row-header {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #444);
}

.row-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.row-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.row-title h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--accent-color, #4f87ff);
}

.row-color {
  font-size: 0.875rem;
  color: var(--text-secondary, #aaa);
}

.complete-button {
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--accent-color, #4f87ff);
  border: 1px solid var(--accent-color, #4f87ff);
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.complete-button:hover:not(:disabled) {
  background: rgba(79, 135, 255, 0.1);
}

.complete-button.completed {
  background-color: var(--accent-color, #4f87ff);
  color: white;
}

.notes-button {
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--text-secondary, #aaa);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.notes-button:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
  border-color: var(--accent-color, #4f87ff);
}

/* Stitches per view control */
.stitch-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text-primary, #fff);
}

.number-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.number-control button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--button-bg, #333);
  color: var(--button-text, #fff);
  border: 1px solid var(--border-color, #444);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  line-height: 1;
}

.number-control button:hover:not(:disabled) {
  background: var(--button-hover-bg, #444);
  border-color: var(--accent-color, #4f87ff);
}

.number-control button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Row notes section */
.row-notes-section {
  margin: 0 0 1rem;
  border: 1px solid var(--border-color, #444);
  border-radius: 8px;
  overflow: hidden;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--border-color, #444);
}

.character-count {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-secondary, #aaa);
}

.character-count.limit-reached {
  color: #f44336;
  font-weight: bold;
}

.save-notes-button, 
.close-notes-button {
  background: transparent;
  border: none;
  color: var(--text-secondary, #aaa);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  width: 28px;
  height: 28px;
}

.save-notes-button:hover,
.close-notes-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--text-primary, #fff);
}

.save-notes-button.unsaved {
  color: #ff9800;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.notes-textarea {
  width: 100%;
  min-height: 80px;
  padding: 0.75rem 1rem;
  border: none;
  background-color: var(--card-bg, #2a2a2a);
  color: var(--text-primary, #fff);
  font-family: inherit;
  resize: none;
  outline: none;
}

/* Navigation buttons */
.nav-button {
  padding: 0.5rem 1rem;
  background: var(--button-bg, #333);
  color: var(--button-text, #fff);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-button:hover:not(:disabled) {
  background: var(--button-hover-bg, #444);
  border-color: var(--accent-color, #4f87ff);
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-button.large {
  padding: 0.8rem 1.2rem;
  font-size: 1rem;
}

/* Stitch navigation */
.stitch-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stitch-content {
  flex: 1;
  text-align: center;
}

.current-stitches {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.stitch-progress {
  font-size: 0.9rem;
  color: var(--text-secondary, #aaa);
}

/* Full row preview */
.full-row-preview {
  margin-top: 1rem;
  width: 100%;
}

.full-row-preview h3 {
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary, #fff);
}

.preview-content {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 70px;
  align-items: center;
  scroll-behavior: smooth;
}

/* Row navigation */
.row-navigation {
  margin-top: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--border-color, #444);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.row-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex: 1;
}

.row-counter {
  color: var(--text-secondary, #aaa);
  font-size: 0.9rem;
}

/* Row select dropdown */
.row-select {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color, #444);
  border-radius: 8px;
  background: var(--button-bg, #333);
  color: var(--text-primary, #fff);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.7rem center;
  background-size: 1.2rem;
  padding-right: 2.5rem;
}

/* Add white dropdown arrow in dark mode */
:root:not(.light) .row-select {
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
}

.row-select:hover {
  border-color: var(--accent-color, #4f87ff);
  background-color: var(--button-hover-bg, #444);
}

.row-select:focus {
  outline: none;
  border-color: var(--accent-color, #4f87ff);
}

/* Stitch wrapper in preview */
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

:root.light .row-title h2 {
  color: #2979ff;
}

:root.light .complete-button {
  color: #2979ff;
  border-color: #2979ff;
}

:root.light .complete-button.completed {
  background-color: #2979ff;
  color: white;
}

:root.light .complete-button:hover:not(:disabled) {
  background: rgba(41, 121, 255, 0.1);
}

:root.light .row-focused-view {
  background: rgba(0, 0, 0, 0.02);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

:root.light .row-notes-section {
  border-color: #e0e0e0;
}

:root.light .notes-header {
  background-color: rgba(0, 0, 0, 0.03);
  border-color: #e0e0e0;
}

:root.light .notes-textarea {
  background-color: #ffffff;
  color: #333;
}

:root.light .stitch-navigation,
:root.light .preview-content {
  background: rgba(0, 0, 0, 0.03);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

:root.light .nav-button {
  background: #f5f5f5;
  color: #333;
  border-color: #e0e0e0;
}

:root.light .nav-button:hover:not(:disabled) {
  background: #e0e0e0;
  border-color: #2979ff;
}

:root.light .row-select {
  background-color: #f5f5f5;
  color: #333;
  border-color: #e0e0e0;
}

:root.light .row-select:hover {
  background-color: #e0e0e0;
  border-color: #2979ff;
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

/* For desktop/mobile specific classes */
@media (min-width: 768px) {
  .mobile-only {
    display: none;
  }
  
  .desktop-only {
    display: inline-block;
  }
}

/* Mobile styles */
@media (max-width: 767px) {
  .pattern-chart-view {
    padding: 0.75rem;
  }

  .notation-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .view-toggle {
    width: 100%;
  }
  
  .view-toggle button {
    flex: 1;
  }

  .row-focused-view {
    padding: 1rem;
    gap: 1.5rem;
  }
  
  .row-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .row-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .stitch-control {
    width: 100%;
    justify-content: space-between;
  }

  .stitch-navigation {
    padding: 0.75rem;
  }

  .current-stitches {
    gap: 1rem;
  }

  .full-row-preview h3 {
    font-size: 1rem;
  }

  .preview-content {
    padding: 0.75rem;
  }
  
  .row-navigation {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem 0;
  }
  
  .row-selector {
    width: 100%;
    order: -1;
  }
  
  .row-select {
    min-width: 0;
    flex: 1;
    padding: 0.5rem;
    font-size: 0.9rem;
    background-position: right 0.5rem center;
    padding-right: 1.8rem;
    background-size: 1rem;
  }
  
  .nav-button.large {
    width: 100%;
    justify-content: center;
  }
  
  .desktop-only {
    display: none;
  }
  
  .mobile-only {
    display: inline-block;
  }
}
</style> 