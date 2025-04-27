<!-- Pattern view component for displaying and interacting with knitting patterns -->
<template>
  <!-- Main pattern view container -->
  <div class="pattern-view">
    <!-- Pattern header with title, controls, and progress -->
    <div class="pattern-header">
      <div class="header-content">
        <h1>{{ pattern.name }}</h1>
        <div class="pattern-controls">
          <button @click="confirmDelete" class="delete-button">
            <font-awesome-icon icon="trash" />
            Delete Pattern
          </button>
        </div>
      </div>
      <!-- Progress bar showing completion status -->
      <div class="progress-bar">
        <div class="progress-track">
          <div 
            class="progress-fill"
            :style="{ width: `${completionPercentage}%` }"
          ></div>
        </div>
        <span class="progress-text">{{ completedRows }} of {{ totalRows }} rows completed</span>
      </div>
    </div>

    <!-- Main pattern content area -->
    <div class="pattern-content">
      <!-- Row header with current row info and controls -->
      <div class="row-header">
        <!-- Single unified view that works for both desktop and mobile -->
        <div class="row-info">
          <div class="row-info-left">
            <h2 class="row-number">Row {{ currentRow?.rowNum }}</h2>
            <div class="row-color-indicator">Color {{ currentRow?.color }}</div>
          </div>
          
          <div class="row-controls">
            <button 
              @click="toggleRowComplete"
              :class="['complete-button', { 'completed': isRowComplete }]"
            >
              <font-awesome-icon :icon="isRowComplete ? 'check-circle' : 'circle'" />
              <span class="desktop-only">{{ isRowComplete ? 'Completed' : 'Mark Complete' }}</span>
              <span class="mobile-only">{{ isRowComplete ? 'Done' : 'Complete' }}</span>
            </button>
            
            <button 
              v-show="!hasRowNotes && !showNotes"
              @click="showNotes = true"
              class="notes-button"
            >
              <font-awesome-icon icon="sticky-note" />
              <span class="desktop-only">Add Notes</span>
              <span class="mobile-only">Notes</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Row notes section -->
      <div v-show="showNotes || hasRowNotes" class="row-notes-section">
        <div class="notes-header">
          <font-awesome-icon icon="sticky-note" />
          <span>Row Notes</span>
          <span class="character-count" :class="{ 'limit-reached': currentRowNotes.length >= 500 }">
            {{ currentRowNotes.length }}/500
          </span>
          <button @click="saveNotes" class="save-notes-button" :class="{ 'unsaved': !notesSaved }" title="Save notes">
            <font-awesome-icon icon="save" />
          </button>
          <button @click="hideNotes" class="close-notes-button">
            <font-awesome-icon icon="times" />
          </button>
        </div>
        <textarea 
          v-model="currentRowNotes" 
          placeholder="Add your notes for this row here..."
          class="notes-textarea"
          maxlength="500"
          @input="markAsUnsaved"
          style="color: #ffffff !important;"
        ></textarea>
      </div>

      <!-- Pattern card with stitch navigation -->
      <div class="pattern-card">
        <div class="stitch-navigation" :class="{ 'component-mode': visualizationMode === 'text' || visualizationMode === 'symbols' }">
          <!-- Text visualization mode -->
          <TextStitches
            v-if="visualizationMode === 'text'"
            :currentRow="currentRow"
            :initialStitchesPerView="stitchesPerView"
            :maxStitchesPerView="totalStitches"
            class="visualization-component text-visualization"
          />
          
          <!-- Symbol visualization mode -->
          <SymbolStitches
            v-else-if="visualizationMode === 'symbols'"
            :currentRow="currentRow"
            :initialStitchesPerView="stitchesPerView"
            :maxStitchesPerView="totalStitches"
            class="visualization-component symbols-visualization"
          />
        </div>
      </div>

      <!-- Row navigation controls -->
      <div class="row-navigation">
        <button 
          @click="previousRow" 
          class="nav-button large"
          :disabled="currentRowIndex === 0"
        >
          <font-awesome-icon icon="arrow-left" />
        </button>
        <div class="row-selector">
          <span class="row-label desktop-only">Row</span>
          <select 
            v-model="currentRowIndex" 
            class="row-select"
          >
            <option 
              v-for="(row, index) in parsedRows" 
              :key="index" 
              :value="index"
            >
              {{ row.rowNum }} ({{ row.color }})
            </option>
          </select>
          <span class="row-counter desktop-only">of {{ parsedRows.length }}</span>
        </div>
        <button 
          @click="nextRow" 
          class="nav-button large"
          :disabled="currentRowIndex === parsedRows.length - 1"
        >
          <font-awesome-icon icon="arrow-right" />
        </button>
      </div>
      
      <!-- Experimental features section - visible only when experimental features are enabled -->
      <div v-if="experimentalFeatures" class="experimental-features">
        <h3>Experimental Features</h3>
        <div class="feature-section">
          <button class="feature-button" @click="showRawPattern = !showRawPattern">
            <font-awesome-icon icon="code" />
            {{ showRawPattern ? 'Hide Raw Pattern' : 'View Raw Pattern' }}
          </button>
          
          <!-- Add pattern chart view toggle button -->
          <button class="feature-button" @click="showChartView = !showChartView">
            <font-awesome-icon icon="chart-pie" />
            {{ showChartView ? 'Hide Chart View' : 'Show Chart View' }}
          </button>
          
          <!-- Add visualization mode toggle buttons -->
          <div class="toggle-container">
            <button 
              class="feature-button" 
              :class="{ 'active-toggle': visualizationMode === 'text' }"
              @click="visualizationMode = 'text'"
            >
              <font-awesome-icon icon="font" />
              Text
            </button>
            <button 
              class="feature-button" 
              :class="{ 'active-toggle': visualizationMode === 'symbols' }"
              @click="visualizationMode = 'symbols'"
            >
              <font-awesome-icon icon="shapes" />
              Symbols
            </button>
          </div>
        </div>
        
        <!-- Pattern Chart View (experimental) -->
        <div v-if="showChartView" class="chart-view-container">
          <div v-if="chartViewError" class="chart-view-error">
            <p>There was an error loading the chart view. Please try again.</p>
            <button class="retry-button" @click="retryChartView">Retry</button>
          </div>
          <PatternChartView 
            v-else
            :pattern="{ ...props.pattern, parsedRows }" 
            :experimental="true" 
            @error="handleChartViewError"
          />
        </div>
        
        <!-- Raw Pattern Display for Debugging -->
        <div v-if="showRawPattern" class="raw-pattern">
          <h4>Raw Pattern Data:</h4>
          <pre>{{ props.pattern.content }}</pre>
        </div>
      </div>
    </div>
  </div>


</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import PatternChartView from './pattern/PatternChartView.vue'
// Import components for visualization modes
import SymbolStitches from './pattern/stitches/SymbolStitches.vue'
import TextStitches from './pattern/stitches/TextStitches.vue'
// Import user settings to check experimental features status
import { useUserSettings } from '@/services/userSettings'

// Component props
const props = defineProps({
  pattern: {
    type: Object,
    required: true  // Pattern object containing name, content, and completion data
  },
  patterns: {
    type: Array,
    required: true  // Array of all patterns
  },
  currentTextIndex: {
    type: Number,
    required: true  // Current text index for navigation
  }
})

// Event emitters and router
const emit = defineEmits(['update:currentTextIndex', 'pattern-deleted'])
const router = useRouter()

// Reactive state
const stitchesPerView = ref(5)  // Number of stitches to display at once
const currentRowIndex = ref(0)  // Current row index in the pattern
const isSwiping = ref(false)  // Touch swipe state
const startX = ref(0)  // Touch start position
const currentX = ref(0)  // Current touch position
const windowWidth = ref(window.innerWidth)  // Current window width
const showRawPattern = ref(false)  // State for showing raw pattern
const showChartView = ref(false)   // State for showing chart view
const visualizationMode = ref('text')  // State for visualization mode

// Notes feature state
const currentRowNotes = ref('')  // Current row notes content
const saveNotesTimeout = ref(null)  // For debouncing notes save
const showNotes = ref(false)  // Control visibility of notes section
const notesSaved = ref(true)  // Track if notes have been saved

// Error handling for chart view
const chartViewError = ref(false);

// Get experimental features state
const { experimentalFeatures } = useUserSettings()

// Handle errors from the chart view component
const handleChartViewError = (error) => {
  console.error('Chart view error:', error);
  chartViewError.value = true;
};

// Reset error state and retry loading chart view
const retryChartView = () => {
  chartViewError.value = false;
};

// Capture errors that occur in the chart view component
onErrorCaptured((error, instance, info) => {
  if (instance?.$options?.name === 'PatternChartView') {
    console.error('Captured error in chart view:', error, info);
    chartViewError.value = true;
    return true; // Prevent the error from propagating further
  }
  return false; // Let other errors propagate
});

// Parse pattern rows into structured data
const parsedRows = computed(() => {
  if (!props.pattern?.content) return []
  
  try {
    const content = props.pattern.content;
    
    // Check if this is a new format from DevAddPatternModal (comma-separated "Row: X, Color: Y, Stitches: Z" format)
    if (content.includes('Row:') && content.includes('Color:') && content.includes('Stitches:')) {
      return parseFormattedPattern(content);
    }
    
    // Legacy format parsing (for backward compatibility)
    const rows = content.split('\n').filter(row => row?.trim())
    const parsedRows = []
    
    let currentRow = []
    let currentRowNum = null
    let currentColor = null
    let currentPattern = ''
    
    for (const row of rows) {
      const trimmed = row.trim()
      
      // Check if this is a row marker line (Row X Color)
      const rowMatch = trimmed.match(/^Row\s+(\d+)\s+([\w\s]+)$/i)
      
      if (rowMatch) {
        // If we have collected pattern data from previous row, save it
        if (currentRowNum && currentPattern) {
          parsedRows.push({
            rowNum: String(currentRowNum), // Ensure rowNum is a string
            color: currentColor || 'No color',
            pattern: currentPattern,
            codes: currentRow
          })
        }
        
        // Start a new row
        currentRowNum = rowMatch[1]
        currentColor = rowMatch[2].trim()
        currentPattern = ''
        currentRow = []
      } else if (currentRowNum) {
        // This is pattern data for the current row
        if (currentPattern) currentPattern += ' '
        currentPattern += trimmed
        
        // Process the pattern data into individual codes
        const codes = processPattern(trimmed)
        currentRow = [...currentRow, ...codes]
      }
    }
    
    // Save the last row if there's data
    if (currentRowNum && currentPattern) {
      parsedRows.push({
        rowNum: String(currentRowNum), // Ensure rowNum is a string
        color: currentColor || 'No color',
        pattern: currentPattern,
        codes: currentRow
      })
    }
    
    return parsedRows
  } catch (error) {
    console.error('Error parsing pattern:', error)
    return []
  }
})

// Helper to expand repeated sections in pattern string
const expandRepeatedSections = (pattern) => {
  if (!pattern) return '';
  
  // Look for patterns like "(1sc, 1inc) x6"
  const repeatRegex = /\(([^)]+)\)\s*x(\d+)/g;
  let expandedPattern = pattern;
  let match;
  
  // Keep track of matches to avoid infinite loops with global regex
  const matches = [];
  while ((match = repeatRegex.exec(pattern)) !== null) {
    matches.push({
      fullMatch: match[0],
      repeatedContent: match[1],
      repeatCount: parseInt(match[2]),
      index: match.index
    });
  }
  
  // Process matches in reverse order to avoid affecting positions
  for (let i = matches.length - 1; i >= 0; i--) {
    const { fullMatch, repeatedContent, repeatCount } = matches[i];
    const repeatedItems = repeatedContent.split(',').map(item => item.trim());
    
    // Create the expanded content
    let expandedContent = '';
    for (let j = 0; j < repeatCount; j++) {
      if (j > 0) expandedContent += ', ';
      expandedContent += repeatedItems.join(', ');
    }
    
    // Replace the repeated section with the expanded content
    expandedPattern = expandedPattern.replace(fullMatch, expandedContent);
  }
  
  return expandedPattern;
}

// Process pattern text into individual stitch codes
const processPattern = (pattern) => {
  if (!pattern) return [];
  
  // Expand any repeated sections like "(1sc, 1inc) x6"
  const expandedPattern = expandRepeatedSections(pattern);
  
  // Split the pattern by commas
  const parts = expandedPattern.split(',').map(part => part.trim());
  
  // Process each part into a standardized stitch code
  return parts.map(part => {
    // Handle space between number and stitch type (e.g., "1 sc" -> "1sc")
    const spaceMatch = part.match(/^(\d+)\s+([a-z]+)$/i);
    if (spaceMatch) {
      return `${spaceMatch[1]}${spaceMatch[2]}`;
    }
    
    // Handle single-letter codes (e.g., "sc" -> "1sc")
    const singleCodeMatch = part.match(/^([a-z]{1,3})$/i);
    if (singleCodeMatch) {
      return `1${singleCodeMatch[1]}`;
    }
    
    // Remove trailing periods if any
    return part.replace(/\.$/, '');
  }).filter(Boolean); // Remove any empty entries
}

// Process pattern with repeats preserved for newer format parsing
const processPatternWithRepeats = (pattern) => {
  if (!pattern) return [];
  
  // We use a different approach when we want to preserve repeat patterns
  return processPatternPreservingRepeats(pattern);
}

// For debugging parsed patterns
const logPattern = (pattern) => {
  console.log('Pattern:', pattern);
  console.log('Expanded:', expandRepeatedSections(pattern));
  const codes = processPatternWithRepeats(pattern);
  console.log('Codes:', codes);
  return pattern;
}

// Parse the new formatted pattern from DevAddPatternModal
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
      
      // Extract row number - special handling for first entry since "Row:" was removed
      let rowNum;
      if (index === 0) {
        // First entry special handling - format should be "53, Color: A, Stitches: ..."
        const firstRowMatch = fullEntry.match(/^(\d+)/);
        rowNum = firstRowMatch ? String(firstRowMatch[1]) : '0';
      } else {
        // Other entries should have "Row:" which was added back
        const rowMatch = fullEntry.match(/Row:\s*(\d+)/);
        rowNum = rowMatch ? String(rowMatch[1]) : '0';
      }
      
      // Extract color
      const colorMatch = fullEntry.match(/Color:\s*([^,]*)/);
      const color = colorMatch ? colorMatch[1].trim() : 'No color';
      
      // Extract stitches section
      const stitchesMatch = fullEntry.match(/Stitches:\s*(.*?)(?:$|,\s*Row:)/);
      const stitchesText = stitchesMatch ? stitchesMatch[1].trim() : '';
      
      // Process pattern text to extract individual stitch codes
      // We now want to preserve the repeat patterns, not expand them
      const codes = processPatternPreservingRepeats(stitchesText);
      
      return {
        rowNum,
        color,
        pattern: stitchesText,
        codes
      };
    });
    
    return parsedRows;
  } catch (error) {
    console.error('Error parsing formatted pattern:', error);
    return [];
  }
}

// Process pattern while preserving repeat patterns
const processPatternPreservingRepeats = (pattern) => {
  if (!pattern) return [];
  
  // Clean up the pattern string
  pattern = pattern.replace(/\s+/g, ' ').trim();
  
  // Split the pattern by commas, preserving repeat sections
  const parts = splitByCommas(pattern);
  
  // Process each part
  return parts.map(part => {
    const trimmedPart = part.trim();
    
    // Check if this is a repeat pattern like "(1sc, 1inc) x6"
    const repeatMatch = trimmedPart.match(/^\(([^)]+)\)\s*x(\d+)$/);
    if (repeatMatch) {
      // Keep the repeat pattern as is
      return trimmedPart;
    }
    
    // Otherwise normalize the individual stitch codes
    return normalizeStitchCode(trimmedPart);
  }).filter(Boolean); // Remove any empty or undefined entries
}

// Normalize a single stitch code
const normalizeStitchCode = (code) => {
  if (!code) return '';
  
  // Clean the code
  const cleanCode = code.replace(/\.$/, '').trim();
  
  // Handle space between number and stitch type (e.g., "1 sc" -> "1sc")
  const spaceMatch = cleanCode.match(/^(\d+)\s+([a-z]+)$/);
  if (spaceMatch) {
    return `${spaceMatch[1]}${spaceMatch[2]}`;
  }
  
  // Handle single-letter codes (e.g., "sc" -> "1sc")
  const singleCodeMatch = cleanCode.match(/^([a-z]{1,3})$/);
  if (singleCodeMatch) {
    return `1${singleCodeMatch[1]}`;
  }
  
  return cleanCode;
}

// Helper to split a pattern string by commas, preserving parentheses content
const splitByCommas = (pattern) => {
  const parts = []
  let currentPart = ''
  let inParentheses = 0
  
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === '(') inParentheses++
    if (char === ')') inParentheses--
    
    if (char === ',' && inParentheses === 0) {
      if (currentPart.trim()) {
        parts.push(currentPart.trim())
      }
      currentPart = ''
    } else {
      currentPart += char
    }
  }
  
  // Add the last part if it exists
  if (currentPart.trim()) {
    parts.push(currentPart.trim())
  }
  
  return parts;
}

// Current row data based on index
const currentRow = computed(() => {
  const row = parsedRows.value[currentRowIndex.value] || null;
  return row;
})

// Helper function to calculate total stitches correctly
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

// Total stitches in current row - corrected version
const totalStitches = computed(() => {
  if (!currentRow.value) return 0;
  return calculateTotalStitches(currentRow.value.codes);
})

// Get completion status for current row
const isRowComplete = computed(() => {
  if (!currentRow.value || !props.pattern?.completedRows) return false
  return props.pattern.completedRows[`row${currentRow.value.rowNum}`] || false
})

// Check if current row has notes
const hasRowNotes = computed(() => {
  if (!currentRow.value || !props.pattern?.rowNotes) return false
  const rowKey = `row${currentRow.value.rowNum}`
  return !!props.pattern.rowNotes[rowKey] && props.pattern.rowNotes[rowKey].trim() !== ''
})

// Touch swipe transform style
const transformStyle = computed(() => {
  if (!isSwiping.value) return ''
  const diff = currentX.value - startX.value
  return `translateX(${diff}px)`
})

// Navigation methods
const nextRow = async () => {
  if (currentRowIndex.value < parsedRows.value.length - 1) {
    // Mark current row as complete
    if (currentRow.value && !isRowComplete.value) {
      try {
        const textId = props.pattern.id
        const completionData = props.pattern.completedRows || {}
        completionData[`row${currentRow.value.rowNum}`] = true
        
        await updateDoc(doc(db, 'patterns', textId), {
          completedRows: completionData
        })
      } catch (error) {
        console.error('Error updating row completion:', error)
      }
    }
    
    // Move to next row
    currentRowIndex.value++
    
    // Reset stitch index
    if (visualizationMode.value === 'text') {
      // The TextStitches component handles this internally
    }
  }
}

const previousRow = () => {
  if (currentRowIndex.value > 0) {
    currentRowIndex.value--
    
    // Reset stitch index
    if (visualizationMode.value === 'text') {
      // The TextStitches component handles this internally
    }
  }
}

// Toggle row completion status
const toggleRowComplete = async () => {
  if (!currentRow.value) return
  
  try {
    const textId = props.pattern.id
    const completionData = props.pattern.completedRows || {}
    completionData[`row${currentRow.value.rowNum}`] = !completionData[`row${currentRow.value.rowNum}`]
    
    await updateDoc(doc(db, 'patterns', textId), {
      completedRows: completionData
    })
  } catch (error) {
    console.error('Error updating row completion:', error)
  }
}

// Notes functions
const loadRowNotes = () => {
  if (!currentRow.value) return
  
  // Load existing notes for this row if any
  if (props.pattern?.rowNotes && props.pattern.rowNotes[`row${currentRow.value.rowNum}`]) {
    currentRowNotes.value = props.pattern.rowNotes[`row${currentRow.value.rowNum}`]
  } else {
    currentRowNotes.value = ''
  }
}

const hideNotes = () => {
  showNotes.value = false
  // If there are unsaved changes, ask user if they want to save
  if (!notesSaved.value && currentRowNotes.value.trim()) {
    if (confirm('You have unsaved notes. Would you like to save them before closing?')) {
      saveNotes()
    }
  } else if (!currentRowNotes.value.trim()) {
    // If there are no notes, remove them from storage
    saveNotes()
  }
}

const saveNotes = async () => {
  if (!currentRow.value) return
  
  // Add the click animation class
  const saveButton = document.querySelector('.save-notes-button')
  if (saveButton) {
    saveButton.classList.add('clicked')
    
    // Remove the class after animation completes
    setTimeout(() => {
      saveButton.classList.remove('clicked')
    }, 500)
  }
  
  try {
    const textId = props.pattern.id
    const notesData = props.pattern.rowNotes || {}
    
    // Only save if there's content, otherwise remove the note
    if (currentRowNotes.value.trim()) {
      notesData[`row${currentRow.value.rowNum}`] = currentRowNotes.value.trim()
    } else {
      delete notesData[`row${currentRow.value.rowNum}`]
    }
    
    await updateDoc(doc(db, 'patterns', textId), {
      rowNotes: notesData
    })
    
    // Mark notes as saved after successful save
    notesSaved.value = true
  } catch (error) {
    console.error('Error saving row notes:', error)
  }
}

// Mark notes as unsaved when the user types
const markAsUnsaved = () => {
  notesSaved.value = false
}

// Touch event handlers
const handleTouchStart = (e) => {
  isSwiping.value = true
  startX.value = e.touches[0].clientX
  currentX.value = startX.value
}

const handleTouchMove = (e) => {
  if (!isSwiping.value) return
  currentX.value = e.touches[0].clientX
}

const handleTouchEnd = () => {
  if (!isSwiping.value) return
  
  const diff = startX.value - currentX.value
  if (Math.abs(diff) > 100) {
    if (diff > 0) {
      nextRow()
    } else {
      previousRow()
    }
  }
  
  isSwiping.value = false
  startX.value = 0
  currentX.value = 0
}

// Pattern deletion
const confirmDelete = () => {
  if (confirm('Are you sure you want to delete this pattern? This action cannot be undone.')) {
    deletePattern()
  }
}

const deletePattern = async () => {
  try {
    await deleteDoc(doc(db, 'patterns', props.pattern.id))
    emit('pattern-deleted')
    router.push('/')
  } catch (error) {
    console.error('Error deleting pattern:', error)
    alert('Failed to delete pattern. Please try again.')
  }
}

// Completion tracking
const completedRows = computed(() => {
  if (!props.pattern?.completedRows) return 0
  return Object.values(props.pattern.completedRows).filter(Boolean).length
})

const totalRows = computed(() => parsedRows.value.length)

const completionPercentage = computed(() => {
  if (totalRows.value === 0) return 0
  return Math.round((completedRows.value / totalRows.value) * 100)
})

// Save the total row count to the pattern object in Firestore
const saveRowCount = async () => {
  if (!props.pattern?.id || totalRows.value === 0) return
  
  try {
    // Only update if the row count has changed or doesn't exist
    if (props.pattern.totalRows !== totalRows.value) {
      await updateDoc(doc(db, 'patterns', props.pattern.id), {
        totalRows: totalRows.value
      })
    }
  } catch (error) {
    console.error('Error updating row count:', error)
  }
}

// Watch for changes in row count and update the database
watch(totalRows, (newCount) => {
  if (newCount > 0) {
    saveRowCount()
  }
})

// Set up window resize listener and touch events for mobile swipe
onMounted(() => {
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
  
  const patternCard = document.querySelector('.pattern-card')
  if (patternCard) {
    patternCard.addEventListener('touchstart', handleTouchStart)
    patternCard.addEventListener('touchmove', handleTouchMove)
    patternCard.addEventListener('touchend', handleTouchEnd)
  }
  
  // Save the row count when component mounts
  saveRowCount()
  
  // Load notes for the initial row
  loadRowNotes()
  
  // Clean up event listeners
  return () => {
    window.removeEventListener('resize', () => {})
    if (patternCard) {
      patternCard.removeEventListener('touchstart', handleTouchStart)
      patternCard.removeEventListener('touchmove', handleTouchMove)
      patternCard.removeEventListener('touchend', handleTouchEnd)
    }
  }
})

// Watch for changes in currentRowIndex
watch(currentRowIndex, (newIndex, oldIndex) => {
  // Load notes for the new row
  loadRowNotes()
  
  // Update notes visibility based on whether there are notes
  nextTick(() => {
    const hasNotes = currentRowNotes.value.trim() !== ''
    showNotes.value = hasNotes
  })
})

// Get stitch class based on code for styling
const getStitchClass = (code) => {
  if (!code) return '';
  
  // Extract the stitch type from the code
  const type = code.match(/[a-z]+$/i);
  const stitchType = type ? type[0].toLowerCase() : '';
  
  // Return appropriate CSS class based on stitch type
  if (stitchType.includes('sc')) return 'stitch-sc';
  if (stitchType.includes('dc')) return 'stitch-dc';
  if (stitchType.includes('hdc')) return 'stitch-hdc';
  if (stitchType.includes('tr')) return 'stitch-tr';
  if (stitchType.includes('dtr')) return 'stitch-dtr';
  if (stitchType.includes('ch')) return 'stitch-ch';
  if (stitchType.includes('sl')) return 'stitch-sl';
  if (stitchType === 'inc') return 'stitch-inc';
  if (stitchType === 'dec') return 'stitch-dec';
  if (stitchType.includes('bs')) return 'stitch-bs';
  if (stitchType.includes('ns')) return 'stitch-ns';
  
  return '';
}

// Expose some methods/properties to parent
defineExpose({
  stitchesPerView
});
</script>

<style scoped>
/* 
 * Responsive utility classes
 * 
 * desktop-only: Only visible on screens larger than 768px
 * mobile-only: Only visible on screens smaller than 768px
 */
.desktop-only {
  display: inline-block;
}

.mobile-only {
  display: none;
}

@media (max-width: 767px) {
  .desktop-only {
    display: none !important;
  }
  
  .mobile-only {
    display: inline-block !important;
  }
}

/* Main container styles */
.pattern-view {
  width: 100%;
  padding: 0.75rem;
  position: relative;
}

/* Header section styles */
.pattern-header {
  margin-bottom: 2rem;
  position: relative;
}

.experimental-badge {
  position: absolute;
  top: -12px;
  right: 0;
  background-color: var(--accent-color);
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 1;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-content h1 {
  margin: 0;
  font-size: 2rem;
  color: var(--text-primary);
}

/* Delete button styles */
.delete-button {
  padding: 0.8rem 1.5rem;
  border: 1px solid #ff4444;
  border-radius: 8px;
  background: transparent;
  color: #ff4444;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.delete-button:hover {
  background-color: rgba(255, 68, 68, 0.1);
}

/* Progress bar styles */
.progress-bar {
  margin-top: 1rem;
}

.progress-track {
  width: 100%;
  height: 4px;
  background-color: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent-color);
  transition: width 0.3s ease;
}

.progress-text {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Pattern content styles */
.pattern-content {
  background-color: var(--card-bg);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  position: relative;
}

/* Row header styles */
.row-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.row-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.row-info-left {
  margin-bottom: 0.75rem;
}

.row-number {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.row-color-indicator {
  color: var(--accent-color);
  font-weight: 500;
}

.row-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

/* Complete button styles */
.complete-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  background: transparent;
  color: var(--accent-color);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.complete-button:hover {
  background-color: rgba(76, 175, 80, 0.1);
}

.complete-button.completed {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

/* Notes button styles */
.notes-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 0.5rem;
}

.notes-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.notes-button.has-notes {
  background-color: rgba(255, 193, 7, 0.1);
  border-color: #ffc107;
  color: #ffc107;
}

.notes-button.has-notes:hover {
  background-color: rgba(255, 193, 7, 0.2);
}

/* Row notes section styles */
.row-notes-section {
  margin: 1rem ;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  animation: fadeIn 0.3s ease;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
}

.save-notes-button,
.close-notes-button {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.25rem;
  margin-left: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 24px;
  height: 24px;
}

.save-notes-button:hover,
.close-notes-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.save-notes-button {
  color: var(--accent-color);
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

.save-notes-button.clicked {
  animation: click-feedback 0.5s ease-in-out;
}

@keyframes click-feedback {
  0% { transform: scale(1); background-color: transparent; }
  50% { transform: scale(0.85); background-color: var(--accent-color); color: white; }
  100% { transform: scale(1); background-color: transparent; }
}

.character-count {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.character-count.limit-reached {
  color: #f44336;
  font-weight: bold;
}

.notes-textarea {
  width: 100%;
  height: 80px;
  padding: 0.75rem 1rem;
  border: none;
  background-color: var(--background-color);
  color: #ffffff !important;
  font-family: inherit;
  resize: none;
  outline: none;
  -webkit-text-fill-color: #ffffff !important;
}

.notes-textarea::placeholder {
  color: rgba(200, 200, 200, 0.6) !important;
  -webkit-text-fill-color: rgba(200, 200, 200, 0.6) !important;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Row color indicator */
/* Stitch control styles */
.stitch-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  color: var(--text-primary);
}

.number-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Control button styles */
.control-button {
  padding: 0.5rem;
  width: 32px;
  height: 32px;
  border: 1px solid var(--button-border);
  border-radius: 6px;
  background: var(--button-bg);
  color: var(--button-text);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.control-button:hover:not(:disabled) {
  background: var(--button-hover-bg);
  border-color: var(--accent-color);
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Number input styles */
.number-input {
  width: 60px;
  padding: 0.5rem;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  text-align: center;
  font-size: 1rem;
  -moz-appearance: textfield;
}

.number-input:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Pattern card styles */
.pattern-card {
  padding: 0 2rem;
  background-color: var(--card-bg);
  display: flex;
  flex-direction: column;
}

/* Stitch navigation */
.stitch-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  width: 100%;
  padding: 0.5rem;
}

/* When in component mode (symbols or text), center the content */
.stitch-navigation.component-mode {
  justify-content: center;
}

/* Navigation button styles */
.nav-button {
  padding: 0.8rem;
  border: 1px solid var(--button-border);
  border-radius: 8px;
  background: var(--button-bg);
  color: var(--button-text);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.nav-button:hover:not(:disabled) {
  background: var(--button-hover-bg);
  border-color: var(--accent-color);
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-button.large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

/* Stitch content styles */
.stitch-content {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 90px;
}

.current-stitches {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  color: var(--accent-color);
  width: 100%;
  min-height: 50px;
}

.current-stitches span {
  border-radius: 8px;
  padding: 0.2rem 0.5rem;
  transition: all 0.2s ease;
  display: inline-block;
}

/* Remove the completed styling for current stitches section but keep color */
.current-stitches span.completed-stitch {
  color: var(--accent-color);
}

/* Apply stitch-type-specific styling to current stitches */
.current-stitches .stitch-sc,
.current-stitches .stitch-dc,
.current-stitches .stitch-hdc,
.current-stitches .stitch-tr,
.current-stitches .stitch-dtr,
.current-stitches .stitch-ch,
.current-stitches .stitch-sl,
.current-stitches .stitch-inc,
.current-stitches .stitch-dec,
.current-stitches .stitch-bs,
.current-stitches .stitch-ns {
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

/* Keep the completed styling only for the preview section */
.preview-stitch.completed-stitch {
  background-color: #9e9e9e !important;
  color: white !important;
  border-color: #8e8e8e !important;
  position: relative;
}

.stitch-progress {
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: center;
  width: 100%;
}

/* Full row preview styles */
.full-row-preview {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.full-row-preview h3 {
  text-align: center;
  margin-bottom: 0.75rem;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.preview-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 50px));
  gap: 8px;
  margin-top: 1rem;
  padding: 0.5rem;
  overflow-x: auto;
  justify-content: start;
}

.preview-stitch {
  font-size: 0.9rem;
  color: var(--text-primary);
  position: relative;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin: 0;
  width: 50px;
  height: 35px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Add scaling for wider stitch codes */
.preview-stitch[class*="dc"],
.preview-stitch[class*="bs"],
.preview-stitch[class*="inc"],
.preview-stitch[class*="dec"] {
  font-size: 0.85rem;
}

/* Further scale down text for 2-digit numbers */
.preview-stitch:is([class*="10"][class*="dc"], [class*="11"][class*="dc"], [class*="20"][class*="dc"], [class*="22"][class*="dc"]) {
  font-size: 0.8rem;
}

/* Even smaller for 3-digit numbers */
.preview-stitch:is([class*="30"][class*="dc"]) {
  font-size: 0.75rem;
}

.preview-stitch.repeat-pattern {
  grid-column: span 2; /* Make repeat patterns take 2 cells */
  width: auto;
  font-size: 0.8rem;
  white-space: normal;
  line-height: 1.2;
}

/* Current stitch */
.preview-stitch.current-stitch {
  border: 2px solid var(--accent-color, #42b883);
  position: relative;
  background-color: rgba(76, 175, 80, 0.15);
  font-weight: bold;
  border-radius: 4px !important;
  box-shadow: 0 0 6px rgba(66, 184, 131, 0.5);
  transform: translateY(-1px);
}

.preview-stitch.next-stitch {
  color: var(--text-secondary);
}

.preview-stitch.border-stitch {
  color: var(--accent-color);
  font-weight: 600;
  background-color: rgba(76, 175, 80, 0.1);
  border: 1px solid var(--accent-color);
}

.row-navigation {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.row-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex: 1;
  max-width: 400px;
}

.row-label {
  font-weight: 500;
}

.row-counter {
  color: var(--text-secondary);
}

.row-select {
  padding: 0.75rem 1rem;
  border: 1px solid var(--button-border);
  border-radius: 8px;
  background-color: var(--button-bg);
  color: var(--text-primary);
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

/* Keep dark mode arrow on mobile */
:root:not(.light) .row-select {
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
}

.row-select:hover {
  border-color: var(--accent-color);
  background-color: var(--button-hover-bg);
}

.row-select:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

.experimental-features {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  color: var(--text-primary);
}

.experimental-features h3 {
  color: var(--accent-color);
  margin-top: 0;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.feature-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.toggle-container {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
  width: 100%;
}

.active-toggle {
  background-color: var(--accent-color) !important;
  color: white !important;
  border-color: var(--accent-color) !important;
  box-shadow: 0 2px 6px rgba(66, 184, 131, 0.3);
}

.feature-button {
  padding: 0.6rem 1.2rem;
  background-color: var(--button-bg);
  color: var(--text-primary);
  border: 1px solid var(--button-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

.feature-button:hover {
  background-color: var(--hover-bg);
  border-color: var(--accent-color);
}

.raw-pattern {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--code-bg);
  border-radius: 8px;
  overflow-x: auto;
}

.raw-pattern pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--code-text);
}

.raw-pattern h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 1rem;
}

.completed-stitch {
  color: var(--accent-color) !important;
}

.repeat-pattern {
  background: rgba(76, 175, 80, 0.08);
  border: 1px solid var(--accent-color);
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  color: var(--accent-color);
}

.preview-stitch.repeat-pattern {
  padding: 0.25rem 0.5rem;
}

.current-stitches .repeat-pattern {
  color: var(--accent-color);
}

/* Light theme overrides for repeat patterns */
:root.light .repeat-pattern {
  background: rgba(41, 121, 255, 0.15) !important;
  border: 1px solid #2979ff !important;
  color: #333 !important;
}

:root.light .current-stitches .repeat-pattern {
  color: #2979ff !important;
}

/* Dark theme text overrides for stitch colors to ensure visibility */
:root:not(.light) .stitch-sc,
:root:not(.light) .stitch-dc,
:root:not(.light) .stitch-hdc,
:root:not(.light) .stitch-tr,
:root:not(.light) .stitch-dtr,
:root:not(.light) .stitch-ch,
:root:not(.light) .stitch-sl,
:root:not(.light) .stitch-inc,
:root:not(.light) .stitch-dec,
:root:not(.light) .stitch-bs,
:root:not(.light) .stitch-ns {
  text-shadow: 0px 1px 1px rgba(0,0,0,0.2);
}

/* Add style for completed row stitches */
.row-completed .preview-stitch {
  background-color: #b6b6b6 !important;
  color: #fff !important;
  border-color: #8e8e8e !important;
  position: relative;
}

.row-completed .preview-stitch::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  color: #ffffff;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.4);
}

.current-stitch {
  border: 3px solid var(--accent-color, #42b883);
  position: relative;
  background-color: rgba(76, 175, 80, 0.15);
  font-weight: bold;
  border-radius: 8px !important;
  box-shadow: 0 0 10px rgba(66, 184, 131, 0.5);
  outline: 2px solid rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.chart-view-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
  margin-top: 1rem;
}

.chart-view-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: #fff8f8;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
  color: #d32f2f;
}

.chart-view-error p {
  margin-bottom: 1rem;
  font-weight: 500;
}

.chart-view-error .retry-button {
  padding: 0.5rem 1rem;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.chart-view-error .retry-button:hover {
  background-color: #d32f2f;
}

.toggle-container {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
  width: 100%;
}

.active-toggle {
  background-color: var(--accent-color) !important;
  color: white !important;
  border-color: var(--accent-color) !important;
  box-shadow: 0 2px 6px rgba(66, 184, 131, 0.3);
}

/* Style for visualization components */
.visualization-component {
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  background-color: transparent;
  border-radius: 0;
  padding: 0;
  border: none;
  overflow: visible;
}

.visualization-component :deep(.stitch-visualization) {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
}

.symbols-visualization {
  min-height: 200px;
  margin-bottom: 1rem;
  overflow-y: auto;
  position: relative;
}

.symbols-visualization :deep(.stitch-symbol img) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.symbols-visualization :deep(.stitch-wrapper) {
  margin: 0.25rem;
}

.text-visualization {
  min-height: 200px;
  margin-bottom: 1rem;
  width: 100%;
}

.text-visualization :deep(.stitch-wrapper) {
  margin: 0.25rem;
}

@media (max-width: 767px) {
  .symbols-visualization {
    min-height: 150px;
  }
}

/* Add the stitch-grid styling */
.stitch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
  width: 100%;
  gap: 1rem;
  margin-bottom: 1rem;
  justify-items: center;
}

.stitch-grid span {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  min-width: 65px;
  min-height: 65px;
  position: relative;
}

/* Mobile styles */
@media (max-width: 767px) {
  .pattern-view {
    padding: 0.5rem;
  }

  .pattern-content {
    border-radius: 8px;
  }

  .experimental-badge {
    top: -8px;
    font-size: 0.6rem;
    padding: 1px 4px;
  }

  .pattern-header {
    margin-bottom: 1rem;
  }

  .header-content {
    margin-bottom: 0.5rem;
  }

  .header-content h1 {
    font-size: 1.5rem;
  }

  .delete-button {
    padding: 0.5rem 0.8rem;
    font-size: 0.9rem;
  }

  .row-header {
    padding: 1rem;
  }

  .row-number {
    font-size: 1.2rem;
  }

  .row-color-indicator {
    font-size: 0.9rem;
  }

  .row-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .row-info-left {
    width: 100%;
    margin-bottom: 0.75rem;
  }
  
  .row-controls {
    width: 100%;
    justify-content: space-between;
    gap: 0.5rem;
  }
  
  .complete-button,
  .notes-button {
    flex: 1;
    justify-content: center;
    padding: 0.4rem 0.5rem;
    font-size: 0.9rem;
  }

  .stitch-control {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .number-control {
    width: 100%;
    justify-content: space-between;
  }

  .pattern-card {
    padding: 1rem;
  }

  .stitch-navigation {
    margin-bottom: 1rem;
  }

  .current-stitches {
    font-size: 1.5rem;
    gap: 0.5rem;
  }

  .preview-content {
    grid-template-columns: repeat(auto-fill, minmax(45px, 45px));
    gap: 6px;
    padding: 0.25rem;
  }

  .preview-stitch {
    font-size: 0.85rem;
    width: 45px;
    height: 32px;
  }
  
  /* Scale down text for mobile repeat patterns */
  .preview-stitch.repeat-pattern {
    font-size: 0.75rem;
  }
  
  /* Scale down text for digit numbers on mobile */
  .preview-stitch[class*="dc"],
  .preview-stitch[class*="bs"],
  .preview-stitch[class*="inc"],
  .preview-stitch[class*="dec"] {
    font-size: 0.8rem;
  }
  
  .preview-stitch:is([class*="10"][class*="dc"], [class*="11"][class*="dc"], [class*="20"][class*="dc"], [class*="22"][class*="dc"]) {
    font-size: 0.75rem;
  }
  
  .preview-stitch:is([class*="30"][class*="dc"]) {
    font-size: 0.7rem;
  }

  .row-navigation {
    padding: 0.75rem;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .row-selector {
    order: -1;
    width: 100%;
    margin-bottom: 0.5rem;
    max-width: none;
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
  
  /* Keep dark mode arrow on mobile */
  :root:not(.light) .row-select {
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  }

  .nav-button.large {
    flex: 1;
    max-width: 45%;
    font-size: 0.9rem;
    padding: 0.6rem 0.5rem;
  }
}
</style> 