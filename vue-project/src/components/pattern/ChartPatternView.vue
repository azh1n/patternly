<template>
  <div class="chart-pattern-view">
    <div class="chart-controls">
      <div class="row-direction-controls">
        <div class="toggle-group">
          <span class="control-label">Row Direction:</span>
          <button 
            @click="toggleAlternateRows" 
            :class="['toggle-button', { 'active': alternateRows }]"
          >
            <span v-if="alternateRows">Alternating Rows</span>
            <span v-else>Same Direction</span>
          </button>
        </div>
        
        <div class="toggle-group">
          <span class="control-label">First Row:</span>
          <button 
            @click="toggleFirstRowDirection" 
            :class="['toggle-button', { 'active': firstRowRightToLeft }]"
          >
            <span v-if="firstRowRightToLeft">Right to Left</span>
            <span v-else>Left to Right</span>
          </button>
        </div>
      </div>
      
      <div class="zoom-controls">
        <button @click="decreaseZoom" class="zoom-button" :disabled="zoomLevel <= 0.5">
          <font-awesome-icon icon="search-minus" />
        </button>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <button @click="increaseZoom" class="zoom-button" :disabled="zoomLevel >= 2">
          <font-awesome-icon icon="search-plus" />
        </button>
      </div>
    </div>
    
    <div class="chart-container" ref="chartContainer">
      <div 
        v-if="processedRows.length > 0"
        class="chart-grid" 
        :style="{ transform: `scale(${zoomLevel})` }"
        @wheel="handleMouseWheel"
      >
        <div 
          v-for="(row, rowIndex) in processedRows" 
          :key="`row-${rowIndex}`" 
          class="chart-row"
          :class="{
            'right-to-left': isRowRightToLeft(rowIndex),
            'completed-row': isRowComplete(row)
          }"
        >
          <div class="row-label">
            <span class="row-number">{{ row.rowNum }}</span>
            <span class="row-color">{{ row.color }}</span>
            <button 
              @click="toggleRowComplete(row)" 
              :class="['complete-toggle', { 'completed': isRowComplete(row) }]"
              :title="isRowComplete(row) ? 'Mark as incomplete' : 'Mark as complete'"
            >
              <font-awesome-icon :icon="isRowComplete(row) ? 'check-circle' : 'circle'" />
            </button>
          </div>
          <div class="chart-stitches" :class="{ 'reverse': isRowRightToLeft(rowIndex) }">
            <div 
              v-for="(stitch, stitchIndex) in expandRowStitches(row)" 
              :key="`stitch-${rowIndex}-${stitchIndex}`" 
              class="chart-stitch"
              :class="{ 
                'current-stitch': isCurrentStitch(row, stitchIndex),
                [getStitchClass(stitch)]: true 
              }"
              @click="selectStitch(rowIndex, stitchIndex)"
            >
              <div v-if="checkSymbolExists(stitch)" class="stitch-symbol-container">
                <img 
                  :src="getSymbolPath(stitch)" 
                  :alt="stitch" 
                  class="stitch-svg"
                />
              </div>
              <div v-else class="fallback-stitch">
                {{ getStitchType(stitch) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="processedRows.length === 0 && props.pattern?.content" class="pattern-fallback">
        <h4>Pattern Content</h4>
        <p>The pattern couldn't be parsed for chart view. Here's the raw content:</p>
        <pre>{{ props.pattern.content }}</pre>
        <button @click="tryManualParsing" class="fallback-button">
          <font-awesome-icon icon="magic" />
          Try Manual Parsing
        </button>
        
        <!-- Debug info section (hidden by default) -->
        <div v-if="isDebugMode && showDebugInfo" class="debug-info">
          <h5>Debug Info</h5>
          <div class="debug-info-grid">
            <div><strong>Pattern ID:</strong> {{ props.pattern.id }}</div>
            <div><strong>Name:</strong> {{ props.pattern.name }}</div>
          </div>
          
          <!-- Sample stitch grid for testing -->
          <h5>Sample Stitches</h5>
          <div class="sample-stitch-grid">
            <div v-for="stitch in ['1sc', '1dc', '1hdc', '1tr', '1ch', '1sl', '1inc', '1dec']" 
                 :key="stitch" 
                 class="chart-stitch" 
                 :class="getStitchClass(stitch)">
              <div v-if="checkSymbolExists(stitch)" class="stitch-symbol-container">
                <img :src="getSymbolPath(stitch)" :alt="stitch" class="stitch-svg" />
              </div>
              <div v-else class="fallback-stitch">
                {{ getStitchType(stitch) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-chart-message">
        <font-awesome-icon icon="info-circle" size="lg" />
        <p>No pattern rows available to display in chart view.</p>
      </div>
    </div>
    
    <div class="stitch-info" v-if="selectedRowIndex !== null && selectedStitchIndex !== null">
      <div class="stitch-details">
        <h4>Selected Stitch:</h4>
        <p>Row {{ selectedRow?.rowNum || '?' }}, Stitch {{ selectedStitchIndex + 1 }}</p>
        <p>Type: {{ selectedStitch ? getStitchType(selectedStitch) : '?' }}</p>
        <p>Count: {{ selectedStitch ? getStitchCount(selectedStitch) : '?' }}</p>
      </div>
      <button @click="clearSelection" class="clear-button">
        <font-awesome-icon icon="times" />
        Clear Selection
      </button>
    </div>
    
    <div class="stitch-key">
      <h4>Stitch Key</h4>
      <div class="key-items">
        <div v-for="(info, code) in commonStitches" :key="`key-${code}`" class="key-item">
          <div class="key-symbol">
            <template v-if="checkSymbolExists(code)">
              <img 
                :src="getSymbolPath(code)" 
                :alt="code" 
                class="key-svg"
              />
            </template>
            <template v-else>
              {{ code }}
            </template>
          </div>
          <span class="key-label">{{ info.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { hasStitchSymbol, getStitchSymbolPath } from '@/assets/crochet-symbols/stitch-mapping.js';

const props = defineProps({
  pattern: {
    type: Object,
    required: true
  }
});

// Chart view configuration
const alternateRows = ref(true);
const firstRowRightToLeft = ref(true);
const zoomLevel = ref(1);
const chartContainer = ref(null);

// Always expand repeated stitches in chart view
const displayRepeatedStitchesSeparately = ref(true);

// For tracking the selected stitch
const selectedRowIndex = ref(null);
const selectedStitchIndex = ref(null);

// Common stitches for the key
const commonStitches = {
  'ch': { label: 'Chain' },
  'sc': { label: 'Single Crochet' },
  'hdc': { label: 'Half Double Crochet' },
  'dc': { label: 'Double Crochet' },
  'tr': { label: 'Treble Crochet' },
  'dtr': { label: 'Double Treble Crochet' },
  'sl': { label: 'Slip Stitch' },
  'inc': { label: 'Increase' },
  'dec': { label: 'Decrease' }
};

// Debugging flag
const isDebugMode = ref(true);
const showDebugInfo = ref(false); // Hidden by default

// Process pattern rows for display
const processedRows = computed(() => {
  if (!props.pattern) {
    return [];
  }
  
  // Check if we have parsed rows
  if (!props.pattern.parsedRows || props.pattern.parsedRows.length === 0) {
    // Try to parse from content directly
    if (props.pattern.content) {
      return parsePatternContent(props.pattern.content);
    }
  }
  
  // Use the parsedRows if available
  if (props.pattern.parsedRows && props.pattern.parsedRows.length > 0) {
    return [...props.pattern.parsedRows].reverse();
  }
  
  return [];
});

// Function to parse pattern content directly
const parsePatternContent = (content) => {
  if (!content) return [];
  
  // Check if this is the "Row: X, Color: Y, Stitches: Z" format
  if (content.includes('Row:') && content.includes('Color:') && content.includes('Stitches:')) {
    return parseFormattedPattern(content);
  }
  
  // Fall back to line-by-line parsing
  return parseLineByLinePattern(content);
};

// Parse the formatted pattern (Row: X, Color: Y, Stitches: Z)
const parseFormattedPattern = (content) => {
  try {
    // Split by rows if separated by commas followed by "Row:"
    const rowEntries = content.split(/,\s*Row:/);
    
    // For the first entry, we need to clean up the "Row:" prefix
    let firstEntry = rowEntries[0];
    if (rowEntries.length > 0 && firstEntry.startsWith('Row:')) {
      firstEntry = firstEntry.replace(/^Row:/, '').trim();
      rowEntries[0] = firstEntry;
    }
    
    const parsedRows = rowEntries.map((entry, index) => {
      // Add "Row:" back for consistent parsing if needed
      const fullEntry = index === 0 ? entry : `Row:${entry.startsWith(' ') ? entry : ` ${entry}`}`;
      
      // Extract row number
      let rowNum;
      if (index === 0) {
        // First entry special handling
        const firstRowMatch = fullEntry.match(/^(\d+)/);
        rowNum = firstRowMatch ? String(firstRowMatch[1]) : '0';
      } else {
        // Other entries
        const rowMatch = fullEntry.match(/Row:\s*(\d+)/);
        rowNum = rowMatch ? String(rowMatch[1]) : '0';
      }
      
      // Extract color
      const colorMatch = fullEntry.match(/Color:\s*([^,]*)/);
      const color = colorMatch ? colorMatch[1].trim() : 'No color';
      
      // Extract stitches section
      const stitchesMatch = fullEntry.match(/Stitches:\s*(.*?)(?:$|,\s*Row:)/);
      const stitchesText = stitchesMatch ? stitchesMatch[1].trim() : '';
      
      // Parse the stitches into individual codes
      const rawCodes = stitchesText.split(',').map(s => s.trim());
      
      // Create a new row with the parsed data
      return {
        rowNum,
        color,
        pattern: stitchesText,
        codes: rawCodes
      };
    });
    
    return parsedRows.reverse(); // Reverse for bottom-to-top display
  } catch (error) {
    console.error('Error parsing formatted pattern:', error);
    return [];
  }
};

// Parse pattern in line-by-line format
const parseLineByLinePattern = (content) => {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    
    const parsedRows = [];
    let currentRow = null;
    
    for (const line of lines) {
      // If line starts with "Row", it's a row marker
      const rowMatch = line.match(/^Row\s+(\d+)\s+([\w\s]+)/i);
      
      if (rowMatch) {
        // Save previous row if exists
        if (currentRow) {
          parsedRows.push(currentRow);
        }
        
        // Start new row
        currentRow = {
          rowNum: rowMatch[1],
          color: rowMatch[2].trim(),
          pattern: '',
          codes: []
        };
      } else if (currentRow) {
        // This is pattern content for the current row
        const stitches = line.split(',').map(s => s.trim());
        currentRow.pattern += (currentRow.pattern ? ', ' : '') + line.trim();
        currentRow.codes.push(...stitches);
      }
    }
    
    // Add the last row if exists
    if (currentRow) {
      parsedRows.push(currentRow);
    }
    
    return parsedRows.reverse(); // Reverse for bottom-to-top display
  } catch (error) {
    return [];
  }
};

// Manual parsing function to be called from button click
const tryManualParsing = () => {
  if (!props.pattern?.content) {
    return;
  }
  
  parsePatternContent(props.pattern.content);
};

// Get currently selected row and stitch
const selectedRow = computed(() => {
  if (selectedRowIndex.value === null) return null;
  return processedRows.value[selectedRowIndex.value];
});

const selectedStitch = computed(() => {
  if (!selectedRow.value || selectedStitchIndex.value === null) return null;
  const expandedStitches = expandRowStitches(selectedRow.value);
  return expandedStitches[selectedStitchIndex.value];
});

// Methods to toggle row direction settings
const toggleAlternateRows = () => {
  alternateRows.value = !alternateRows.value;
};

const toggleFirstRowDirection = () => {
  firstRowRightToLeft.value = !firstRowRightToLeft.value;
};

// Determine if a specific row should be right-to-left
const isRowRightToLeft = (rowIndex) => {
  if (!alternateRows.value) {
    return firstRowRightToLeft.value;
  }
  
  // For alternating rows
  const isEvenRow = (processedRows.value.length - 1 - rowIndex) % 2 === 0;
  return isEvenRow ? firstRowRightToLeft.value : !firstRowRightToLeft.value;
};

// Check if a row is completed
const isRowComplete = (row) => {
  if (!props.pattern?.completedRows || !row) return false;
  return !!props.pattern.completedRows[`row${row.rowNum}`];
};

// Toggle row completion status
const toggleRowComplete = async (row) => {
  if (!row) return;
  
  try {
    const patternId = props.pattern.id;
    const completionData = { ...(props.pattern.completedRows || {}) };
    completionData[`row${row.rowNum}`] = !completionData[`row${row.rowNum}`];
    
    await updateDoc(doc(db, 'patterns', patternId), {
      completedRows: completionData
    });
  } catch (error) {
    console.error('Error updating row completion:', error);
  }
};

// Stitch selection methods
const selectStitch = (rowIndex, stitchIndex) => {
  selectedRowIndex.value = rowIndex;
  selectedStitchIndex.value = stitchIndex;
};

const clearSelection = () => {
  selectedRowIndex.value = null;
  selectedStitchIndex.value = null;
};

const isCurrentStitch = (row, stitchIndex) => {
  if (selectedRowIndex.value === null || selectedStitchIndex.value === null) return false;
  
  const selectedRowNum = processedRows.value[selectedRowIndex.value]?.rowNum;
  return row.rowNum === selectedRowNum && stitchIndex === selectedStitchIndex.value;
};

// Zoom control methods
const increaseZoom = () => {
  if (zoomLevel.value < 2) {
    zoomLevel.value += 0.1;
  }
};

const decreaseZoom = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value -= 0.1;
  }
};

const handleMouseWheel = (event) => {
  // Prevent default to avoid page scrolling
  if (event.ctrlKey) {
    event.preventDefault();
    
    // Zoom in/out with the mouse wheel
    if (event.deltaY < 0) {
      increaseZoom();
    } else {
      decreaseZoom();
    }
  }
};

// Stitch utility methods
const expandRowStitches = (row) => {
  if (!row) {
    return [];
  }
  
  if (!row.codes || !Array.isArray(row.codes) || row.codes.length === 0) {
    // Try to parse from pattern string if available
    if (row.pattern) {
      const stitches = row.pattern.split(',').map(s => s.trim());
      return processRowStitches(stitches, true); // Always expand repeats in chart view
    }
    
    return [];
  }
  
  // Always fully expand all stitches, including repeats
  const result = processRowStitches(row.codes, true); // Force true to always expand repeats
  
  // Additional check to ensure that if any repeat notation still exists in the result,
  // we expand it according to the TextStitches approach
  for (let i = 0; i < result.length; i++) {
    const stitch = result[i];
    if (typeof stitch === 'string' && stitch.includes('(') && stitch.includes(')') && stitch.includes('x')) {
      // Remove this stitch
      result.splice(i, 1);
      
      // Get the parts
      const repeatMatch = stitch.match(/\(([^)]+)\)\s*x(\d+)/);
      if (repeatMatch) {
        const repeatedContent = repeatMatch[1];
        const repeatCount = parseInt(repeatMatch[2], 10);
        
        // Split repeats and fully expand
        const expandedStitches = [];
        const stitches = repeatedContent.split(',').map(s => s.trim());
        
        for (let j = 0; j < repeatCount; j++) {
          for (const s of stitches) {
            const match = s.match(/^(\d+)([a-zA-Z]+)/);
            if (match) {
              const count = parseInt(match[1]);
              const type = match[2];
              for (let k = 0; k < count; k++) {
                expandedStitches.push(`1${type}`);
              }
            } else if (s.match(/^[a-zA-Z]+$/)) {
              expandedStitches.push(`1${s}`);
            } else {
              expandedStitches.push(s);
            }
          }
        }
        
        // Insert the expanded stitches at this position
        result.splice(i, 0, ...expandedStitches);
        
        // Adjust index to account for the newly added stitches
        i += expandedStitches.length - 1;
      }
    }
  }
  
  return result;
};

// Process stitches based on display mode - matching TextStitches/SymbolStitches
function processRowStitches(codes, expandRepeated) {
  if (!codes || !Array.isArray(codes)) return [];
  
  if (!expandRepeated) {
    // Just return the codes as is when not expanding
    return codes;
  } else {
    // Expand repeated stitches (e.g., "3sc" becomes ["sc", "sc", "sc"])
    const expandedStitches = [];
    
    for (let i = 0; i < codes.length; i++) {
      const stitch = codes[i];
      if (!stitch) continue;
      
      // Convert to string and trim
      const stitchStr = String(stitch).trim();
      
      // Handle repeat patterns like "(1sc, 1inc) x6"
      if (stitchStr.includes('(') && stitchStr.includes(')') && stitchStr.includes('x')) {
        // Extract the repeat pattern components
        const repeatMatch = stitchStr.match(/\(([^)]+)\)\s*x(\d+)/);
        if (repeatMatch) {
          const repeatedContent = repeatMatch[1];
          const repeatCount = parseInt(repeatMatch[2], 10);
          
          // Split the repeated content by commas
          const stitches = repeatedContent.split(',').map(s => s.trim());
          
          // Repeat the pattern
          for (let j = 0; j < repeatCount; j++) {
            for (let k = 0; k < stitches.length; k++) {
              const s = stitches[k];
              const match = s.match(/^(\d+)([a-zA-Z]+)/);
              if (match) {
                // Has a count prefix like "3sc"
                const count = parseInt(match[1]);
                const type = match[2];
                
                // Expand each count into individual stitches
                for (let l = 0; l < count; l++) {
                  expandedStitches.push(`1${type}`);
                }
              } else if (s.match(/^[a-zA-Z]+$/)) {
                // Single stitch without count like "sc"
                expandedStitches.push(`1${s}`);
              } else {
                // Unknown format, add as is
                expandedStitches.push(s);
              }
            }
          }
        } else {
          // Failed to parse repeat pattern, add as is
          expandedStitches.push(stitchStr);
        }
      } 
      // Handle the case where part of a repeat pattern might be split across items
      else if (stitchStr.includes('(') && !stitchStr.includes(')')) {
        // This could be the start of a repeat pattern split across multiple items
        // Collect all parts of the pattern
        let fullPattern = stitchStr;
        let j = i + 1;
        
        // Look ahead until we have a complete pattern or run out of items
        while (j < codes.length) {
          const nextPart = String(codes[j]).trim();
          fullPattern += ', ' + nextPart;
          j++;
          
          // Check if we have a complete pattern now
          if (nextPart.includes(')') && fullPattern.includes('x')) {
            break;
          }
        }
        
        // If we assembled a complete pattern, parse it
        if (fullPattern.includes('(') && fullPattern.includes(')') && fullPattern.includes('x')) {
          const repeatMatch = fullPattern.match(/\(([^)]+)\)\s*x(\d+)/);
          if (repeatMatch) {
            const repeatedContent = repeatMatch[1];
            const repeatCount = parseInt(repeatMatch[2], 10);
            
            // Split the repeated content by commas
            const stitches = repeatedContent.split(',').map(s => s.trim());
            
            // Repeat the pattern
            for (let j = 0; j < repeatCount; j++) {
              for (let k = 0; k < stitches.length; k++) {
                const s = stitches[k];
                const match = s.match(/^(\d+)([a-zA-Z]+)/);
                if (match) {
                  const count = parseInt(match[1]);
                  const type = match[2];
                  
                  for (let l = 0; l < count; l++) {
                    expandedStitches.push(`1${type}`);
                  }
                } else if (s.match(/^[a-zA-Z]+$/)) {
                  expandedStitches.push(`1${s}`);
                } else {
                  expandedStitches.push(s);
                }
              }
            }
            
            // Skip over the items we consumed
            i = j - 1;
          } else {
            // Failed to parse assembled pattern, add original stitch
            expandedStitches.push(stitchStr);
          }
        } else {
          // Not a complete pattern after all, add original stitch
          expandedStitches.push(stitchStr);
        }
      } else {
        // Normal stitch code handling
        const match = stitchStr.match(/^(\d+)([a-zA-Z]+)/);
        if (match) {
          const count = parseInt(match[1]);
          const type = match[2];
          
          // Expand count into individual stitches
          for (let j = 0; j < count; j++) {
            expandedStitches.push(`1${type}`);
          }
        } else if (stitchStr.match(/^[a-zA-Z]+$/)) {
          // If it's just a stitch type without a count (e.g., "sc")
          expandedStitches.push(`1${stitchStr}`);
        } else {
          // If no match, just add the stitch as is
          expandedStitches.push(stitchStr);
        }
      }
    }
    
    return expandedStitches;
  }
}

// Normalize stitch code to format "1sc", "1dc", etc.
const normalizeStitchCode = (code) => {
  if (!code) return '';
  
  // Clean the code
  const cleanCode = code.trim();
  
  // Handle space between number and stitch type (e.g., "1 sc" -> "1sc")
  const spaceMatch = cleanCode.match(/^(\d+)\s+([a-z]+)$/i);
  if (spaceMatch) {
    return `${spaceMatch[1]}${spaceMatch[2]}`;
  }
  
  // Handle single-letter codes (e.g., "sc" -> "1sc")
  const singleCodeMatch = cleanCode.match(/^([a-z]+)$/i);
  if (singleCodeMatch) {
    return `1${singleCodeMatch[1]}`;
  }
  
  return cleanCode;
};

// Get stitch type without count (e.g., "3sc" -> "sc")
const getStitchType = (stitch) => {
  if (!stitch) return '';
  
  const match = stitch.match(/^\d+([a-z]+)$/i);
  return match ? match[1] : stitch;
};

// Get stitch count (e.g., "3sc" -> 3)
const getStitchCount = (stitch) => {
  if (!stitch) return 1;
  
  const match = stitch.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

// Check if a symbol exists for this stitch
const checkSymbolExists = (stitch) => {
  if (!stitch) return false;
  return hasStitchSymbol(getStitchType(stitch));
};

// Get the symbol path for a stitch
const getSymbolPath = (stitch) => {
  if (!stitch) return '';
  return getStitchSymbolPath(getStitchType(stitch));
};

// Get stitch class for additional styling
const getStitchClass = (stitch) => {
  const type = getStitchType(stitch)?.toLowerCase();
  
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
    'ns': 'stitch-ns',
  };
  
  return stitchClasses[type] || '';
};

// Initialize event listeners
onMounted(() => {
  // Prevent zooming with Ctrl+wheel on the whole chart container
  if (chartContainer.value) {
    chartContainer.value.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }, { passive: false });
  }
  
  // Attempt to parse the pattern directly during mount
  if (props.pattern?.content && (!props.pattern.parsedRows || props.pattern.parsedRows.length === 0)) {
    const parsedContent = parsePatternContent(props.pattern.content);
    
    // If we have rows and the component is showing an empty state, force refresh
    if (parsedContent.length > 0 && processedRows.value.length === 0) {
      isDebugMode.value = false;
      nextTick(() => {
        isDebugMode.value = true;
      });
    }
  }
  
  // Verify that displayRepeatedStitchesSeparately is always true in chart view
  // This ensures that repeat patterns like "(1sc, 1inc) x6" are fully expanded
  if (!displayRepeatedStitchesSeparately.value) {
    displayRepeatedStitchesSeparately.value = true;
  }
});
</script>

<style scoped>
.chart-pattern-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  padding: 1.5rem;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.chart-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.row-direction-controls {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.toggle-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-label {
  font-weight: 500;
  color: var(--text-primary);
}

.toggle-button {
  padding: 0.5rem 1rem;
  background-color: var(--accent-color);
  border: 1px solid var(--accent-color);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button.active {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.toggle-button:hover {
  opacity: 0.9;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.zoom-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
}

.zoom-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-level {
  font-weight: 500;
  min-width: 3.5rem;
  text-align: center;
}

.chart-container {
  height: 400px;
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  position: relative;
  background-color: var(--card-bg);
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.empty-chart-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  gap: 0.5rem;
}

.empty-chart-message p {
  margin: 0;
}

.chart-grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 1rem;
  transform-origin: top left;
  min-width: max-content;
  height: max-content;
}

.chart-row {
  display: flex;
  gap: 1px;
  align-items: flex-start;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
  width: max-content;
}

.row-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0 1rem;
  min-width: 80px;
  position: sticky;
  left: 0;
  background-color: var(--card-bg);
  z-index: 5;
  border-right: 1px solid var(--border-color);
}

.row-number {
  font-weight: bold;
  color: var(--text-primary);
}

.row-color {
  font-size: 0.8rem;
  color: var(--accent-color);
}

.complete-toggle {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1.1rem;
}

.complete-toggle.completed {
  color: var(--accent-color);
}

.chart-stitches {
  display: flex;
  gap: 2px;
  padding: 0 1rem;
}

.chart-stitches.reverse {
  flex-direction: row-reverse;
}

.chart-stitch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--button-bg);
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.chart-stitch:hover {
  box-shadow: 0 0 0 2px var(--accent-color);
  z-index: 10;
  transform: scale(1.1);
}

.chart-stitch.current-stitch {
  border: 2px solid var(--accent-color, #42b883);
  box-shadow: 0 0 8px rgba(66, 184, 131, 0.4);
  z-index: 10;
}

.stitch-symbol-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stitch-svg {
  max-width: 70%;
  max-height: 70%;
  filter: var(--symbol-filter, invert(1));
}

.fallback-stitch {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Row completion styling */
.completed-row {
  background-color: rgba(66, 184, 131, 0.05);
}

.completed-row .chart-stitch {
  opacity: 0.7;
}

.stitch-info {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--card-bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stitch-details h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.stitch-details p {
  margin: 0.25rem 0;
  color: var(--text-secondary);
}

.clear-button {
  padding: 0.5rem 1rem;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stitch-key {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--card-bg);
}

.stitch-key h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.key-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.key-symbol {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--button-bg);
}

.key-svg {
  max-width: 70%;
  max-height: 70%;
  filter: var(--symbol-filter, invert(1));
}

.key-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* Stitch type styling */
.chart-stitch.stitch-sc {
  background-color: rgba(233, 30, 99, 0.2);
  border-color: rgba(233, 30, 99, 0.5);
}

.chart-stitch.stitch-dc {
  background-color: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.5);
}

.chart-stitch.stitch-hdc {
  background-color: rgba(255, 152, 0, 0.2);
  border-color: rgba(255, 152, 0, 0.5);
}

.chart-stitch.stitch-tr {
  background-color: rgba(33, 150, 243, 0.2);
  border-color: rgba(33, 150, 243, 0.5);
}

.chart-stitch.stitch-dtr {
  background-color: rgba(156, 39, 176, 0.2);
  border-color: rgba(156, 39, 176, 0.5);
}

.chart-stitch.stitch-ch {
  background-color: rgba(96, 125, 139, 0.2);
  border-color: rgba(96, 125, 139, 0.5);
}

.chart-stitch.stitch-sl {
  background-color: rgba(121, 85, 72, 0.2);
  border-color: rgba(121, 85, 72, 0.5);
}

.chart-stitch.stitch-inc,
.chart-stitch.stitch-dec {
  background-color: rgba(255, 193, 7, 0.2);
  border-color: rgba(255, 193, 7, 0.5);
}

/* Light mode adjustments for stitch colors */
:root.light .chart-stitch.stitch-sc {
  background-color: rgba(233, 30, 99, 0.1);
  border-color: rgba(233, 30, 99, 0.7);
}

:root.light .chart-stitch.stitch-dc {
  background-color: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.7);
}

:root.light .chart-stitch.stitch-hdc {
  background-color: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.7);
}

:root.light .chart-stitch.stitch-tr {
  background-color: rgba(33, 150, 243, 0.1);
  border-color: rgba(33, 150, 243, 0.7);
}

:root.light .chart-stitch.stitch-dtr {
  background-color: rgba(156, 39, 176, 0.1);
  border-color: rgba(156, 39, 176, 0.7);
}

:root.light .chart-stitch.stitch-ch {
  background-color: rgba(96, 125, 139, 0.1);
  border-color: rgba(96, 125, 139, 0.7);
}

:root.light .chart-stitch.stitch-sl {
  background-color: rgba(121, 85, 72, 0.1);
  border-color: rgba(121, 85, 72, 0.7);
}

:root.light .chart-stitch.stitch-inc,
:root.light .chart-stitch.stitch-dec {
  background-color: rgba(255, 193, 7, 0.1);
  border-color: rgba(255, 193, 7, 0.7);
}

/* Responsive styling */
@media (max-width: 767px) {
  .chart-pattern-view {
    padding: 1rem;
  }
  
  .chart-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .row-direction-controls {
    width: 100%;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .zoom-controls {
    width: 100%;
    justify-content: space-between;
  }
  
  .chart-container {
    height: 300px;
  }
  
  .row-label {
    min-width: 60px;
    padding: 0 0.5rem;
  }
  
  .chart-stitches {
    padding: 0 0.5rem;
  }
  
  .chart-stitch {
    width: 34px;
    height: 34px;
  }
  
  .key-items {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

/* Dark mode adjustments */
:root.light .stitch-svg,
:root.light .key-svg {
  filter: brightness(0);
}

.pattern-fallback {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 1rem;
  overflow: auto;
}

.pattern-fallback h4 {
  margin-top: 0;
  color: var(--text-primary);
}

.pattern-fallback pre {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.75rem;
  border-radius: 4px;
  overflow: auto;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.fallback-button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  background-color: var(--accent-color, #42b883);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: opacity 0.2s;
}

.fallback-button:hover {
  opacity: 0.9;
}

/* Example stitch (testing purposes) */
.stitch-example {
  display: inline-block;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--button-bg);
  margin: 2px;
}

/* Style for debug info */
.debug-info {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 8px;
  background-color: rgba(255, 193, 7, 0.05);
}

.debug-info h5 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #ff9800;
}

.debug-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}

.sample-stitch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style> 