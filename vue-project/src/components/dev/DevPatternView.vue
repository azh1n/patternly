<!-- Dev Pattern view component with experimental features -->
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
        <div class="row-info">
          <div class="row-title">
            <!-- Desktop view -->
            <div class="desktop-only">
              <h2>Row {{ currentRow?.rowNum }}</h2>
              <span class="row-color">Color {{ currentRow?.color }}</span>
            </div>
            <!-- Mobile view -->
            <div class="mobile-only stacked-info">
              <h2>{{ currentRow?.rowNum }}</h2>
              <div class="row-color">Color {{ currentRow?.color }}</div>
            </div>
          </div>
          <button 
            @click="toggleRowComplete"
            :class="['complete-button', { 'completed': isRowComplete }]"
          >
            <font-awesome-icon :icon="isRowComplete ? 'check-circle' : 'circle'" />
            <span class="desktop-only">{{ isRowComplete ? 'Completed' : 'Mark Complete' }}</span>
            <span class="mobile-only button-text">{{ isRowComplete ? 'Done' : 'Complete' }}</span>
          </button>
        </div>
        
        <!-- Stitches per view control -->
        <div class="stitch-control">
          <label for="stitchesPerView">Stitches per view:</label>
          <div class="number-control">
            <button 
              @click="decreaseStitches" 
              class="control-button"
              :disabled="stitchesPerView <= 1"
            >
              −
            </button>
            <input 
              type="number" 
              id="stitchesPerView" 
              v-model="stitchesPerView" 
              min="1"
              :max="totalStitches"
              class="number-input"
            />
            <button 
              @click="increaseStitches" 
              class="control-button"
              :disabled="stitchesPerView >= totalStitches"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <!-- Pattern card with stitch navigation -->
      <div class="pattern-card">
        <div class="stitch-navigation">
          <button 
            @click="previousStitches" 
            class="nav-button"
            :disabled="currentStitchIndex === 0"
          >
            <font-awesome-icon icon="chevron-left" />
          </button>
          
          <!-- Current stitches display -->
          <div class="stitch-content">
            <div class="current-stitches">
              <span 
                v-for="(stitch, index) in currentStitches" 
                :key="index"
                :class="[
                  { 'completed-stitch': stitch.isCompleted },
                  { 'repeat-pattern': stitch.isRepeatPattern },
                  getStitchClass(stitch.code)
                ]"
              >
                {{ stitch.code }}
              </span>
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
            <font-awesome-icon icon="chevron-right" />
          </button>
        </div>

        <!-- Full row preview section -->
        <div class="full-row-preview">
          <h3>Full Row Preview</h3>
          <div class="preview-content" :class="{ 'row-completed': isRowComplete }">
            <template v-if="windowWidth < 768">
              <span 
                v-for="(item, index) in mobilePreviewStitches" 
                :key="index"
                :class="[
                  'preview-stitch',
                  { 'completed-stitch': item.status === 'completed' },
                  { 'current-stitch': item.status === 'current' },
                  { 'next-stitch': item.status === 'next' },
                  { 'border-stitch': item.code.endsWith('bs') },
                  { 'repeat-pattern': item.isRepeatPattern },
                  getStitchClass(item.code)
                ]"
              >
                {{ item.code }}
              </span>
            </template>
            <template v-else>
              <span 
                v-for="(item, index) in getCompletedCodes" 
                :key="index"
                :class="[
                  'preview-stitch',
                  { 'completed-stitch': item.isCompleted },
                  { 'current-stitch': index >= currentStitchIndex && index < currentStitchIndex + stitchesPerView },
                  { 'border-stitch': item.code.endsWith('bs') },
                  { 'repeat-pattern': item.isRepeatPattern },
                  getStitchClass(item.code)
                ]"
              >
                {{ item.code }}
              </span>
            </template>
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
              <template v-if="windowWidth >= 768">
                {{ row.rowNum }} ({{ row.color }})
              </template>
              <template v-else>
                Row {{ row.rowNum }} ({{ row.color }})
              </template>
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
      
      <!-- DEV: Experimental features section -->
      <div class="experimental-features">
        <h3>Experimental Features</h3>
        <div class="feature-section">
          <button class="feature-button" @click="showRawPattern = !showRawPattern">
            <font-awesome-icon icon="code" />
            {{ showRawPattern ? 'Hide Raw Pattern' : 'View Raw Pattern' }}
          </button>
          <button class="feature-button">
            <font-awesome-icon icon="magic" />
            Pattern Analysis
          </button>
          <button class="feature-button">
            <font-awesome-icon icon="history" />
            Version History
          </button>
          <button class="feature-button">
            <font-awesome-icon icon="chart-line" />
            Progress Stats
          </button>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase'

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
const currentStitchIndex = ref(0)  // Current stitch index in the row
const currentRowIndex = ref(0)  // Current row index in the pattern
const isSwiping = ref(false)  // Touch swipe state
const startX = ref(0)  // Touch start position
const currentX = ref(0)  // Current touch position
const windowWidth = ref(window.innerWidth)  // Current window width
const showRawPattern = ref(false)  // New state for showing raw pattern

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

// Total stitches in current row
const totalStitches = computed(() => {
  if (!currentRow.value) return 0
  return currentRow.value.codes.length
})

// Get completion status for current row
const isRowComplete = computed(() => {
  if (!currentRow.value || !props.pattern?.completedRows) return false
  return props.pattern.completedRows[`row${currentRow.value.rowNum}`] || false
})

// Touch swipe transform style
const transformStyle = computed(() => {
  if (!isSwiping.value) return ''
  const diff = currentX.value - startX.value
  return `translateX(${diff}px)`
})

// Navigation methods
const nextStitches = () => {
  if (!currentRow.value) return
  const nextIndex = currentStitchIndex.value + stitchesPerView.value
  if (nextIndex < currentRow.value.codes.length) {
    currentStitchIndex.value = nextIndex
    updateScrollPosition()
  }
}

const previousStitches = () => {
  if (!currentRow.value || currentStitchIndex.value === 0) return
  const prevIndex = Math.max(0, currentStitchIndex.value - stitchesPerView.value)
  currentStitchIndex.value = prevIndex
  updateScrollPosition()
}

// Update stitch progress display
const stitchProgress = computed(() => {
  if (!currentRow.value) return ''
  
  // Calculate total stitches up to current position
  const currentStitchCount = currentRow.value.codes
    .slice(0, currentStitchIndex.value)
    .reduce((total, code) => {
      const match = code.match(/^(\d+)/)
      return total + (match ? parseInt(match[1]) : 1)
    }, 0)
  
  // Calculate stitches in current view
  const viewStitches = currentRow.value.codes
    .slice(currentStitchIndex.value, currentStitchIndex.value + stitchesPerView.value)
    .reduce((total, code) => {
      const match = code.match(/^(\d+)/)
      return total + (match ? parseInt(match[1]) : 1)
    }, 0)
  
  return `${currentStitchCount + 1}-${currentStitchCount + viewStitches} of ${totalStitches.value} stitches`
})

// Row navigation with completion tracking
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
    currentStitchIndex.value = 0
    // Update scroll position after changing row
    setTimeout(updateScrollPosition, 50)
  }
}

const previousRow = () => {
  if (currentRowIndex.value > 0) {
    currentRowIndex.value--
    currentStitchIndex.value = 0
    // Update scroll position after changing row
    setTimeout(updateScrollPosition, 50)
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

// Update scroll position helper
const updateScrollPosition = () => {
  try {
    // Wait for DOM to update
    setTimeout(() => {
      const container = document.querySelector('.preview-content')
      if (container) {
        const activeStitches = container.querySelectorAll('.current-stitch')
        if (activeStitches.length > 0) {
          const firstActiveStitch = activeStitches[0]
          const containerWidth = container.offsetWidth
          const scrollPosition = firstActiveStitch.offsetLeft - (containerWidth / 2) + (firstActiveStitch.offsetWidth * stitchesPerView.value / 2)
          
          container.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: 'smooth'
          })
        }
      }
    }, 50) // Small delay to ensure DOM has updated
  } catch (error) {
    console.error('Error updating scroll position:', error)
  }
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
    router.push('/dev')
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

// Current stitches display
const currentStitches = computed(() => {
  if (!currentRow.value) return [];
  const start = currentStitchIndex.value;
  const end = start + stitchesPerView.value;
  
  return currentRow.value.codes.slice(start, end).map((code, index) => {
    // Check if this is a repeat pattern
    const isRepeatPattern = code.includes('(') && code.includes(')') && code.includes('x');
    
    return {
      code,
      isCompleted: index < stitchesPerView.value && (isRowComplete.value || start > 0),
      isRepeatPattern
    };
  });
})

// Mobile preview stitch display
const mobilePreviewStitches = computed(() => {
  if (!currentRow.value) return [];
  
  return currentRow.value.codes.map((code, index) => {
    let status = 'pending';
    if (index < currentStitchIndex.value || isRowComplete.value) {
      status = 'completed';
    } else if (index >= currentStitchIndex.value && index < currentStitchIndex.value + stitchesPerView.value) {
      status = 'current';
    } else if (index >= currentStitchIndex.value + stitchesPerView.value && 
               index < currentStitchIndex.value + stitchesPerView.value + 2) {
      status = 'next';
    }
    
    const isRepeatPattern = code.includes('(') && code.includes(')') && code.includes('x');
    
    return { 
      code, 
      status,
      isRepeatPattern
    };
  });
})

// Completed codes for display in full row preview
const getCompletedCodes = computed(() => {
  if (!currentRow.value) return [];
  
  return currentRow.value.codes.map((code, index) => {
    const isRepeatPattern = code.includes('(') && code.includes(')') && code.includes('x');
    
    return {
      code,
      isCompleted: index < currentStitchIndex.value || isRowComplete.value,
      isRepeatPattern
    };
  });
})

// Stitch view controls
const decreaseStitches = () => {
  if (stitchesPerView.value > 1) {
    stitchesPerView.value--
  }
}

const increaseStitches = () => {
  if (stitchesPerView.value < totalStitches.value) {
    stitchesPerView.value++
  }
}

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
  
  // Initialize scroll position after component mounts
  setTimeout(updateScrollPosition, 300)
  
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
  // Make sure to update scroll position when row changes
  setTimeout(updateScrollPosition, 50)
})

// Watch for changes in currentStitchIndex
watch(currentStitchIndex, (newIndex, oldIndex) => {
  // Update scroll position when stitch index changes
  setTimeout(updateScrollPosition, 50)
})

// Watch for changes in parsedRows
watch(parsedRows, (newRows) => {
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
</script>

<style scoped>
.pattern-view {
  width: 100%;
  padding: 0.75rem;
  position: relative;
}

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
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-content h1 {
  font-size: 2rem;
  margin: 0;
  color: var(--text-primary);
}

.pattern-controls {
  display: flex;
  gap: 0.5rem;
}

.delete-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  border: 1px solid #ff4444;
  border-radius: 8px;
  background: transparent;
  color: #ff4444;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-button:hover {
  background-color: rgba(255, 68, 68, 0.1);
}

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

.pattern-content {
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.row-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.row-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.row-title h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.row-color {
  color: var(--accent-color);
  font-weight: 500;
}

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
  color: white;
}

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

.control-button:first-child {
  border-radius: 6px 0 0 6px;
}

.control-button:last-child {
  border-radius: 0 6px 6px 0;
}

.control-button:hover:not(:disabled) {
  background: var(--button-hover-bg);
  border-color: var(--accent-color);
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

.pattern-card {
  padding: 1.5rem;
  background-color: var(--card-bg);
}

.stitch-navigation {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
}

.nav-button {
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  color: var(--text-primary);
}

.nav-button:hover:not(:disabled) {
  background-color: var(--button-hover-bg);
  transform: translateY(-2px);
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-button.large {
  min-width: 48px;
  height: 48px;
  font-size: 1.1rem;
}

.stitch-content {
  flex: 1;
  margin: 0 1rem;
}

.current-stitches {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
  font-weight: 500;
  color: var(--text-primary);
  font-family: monospace;
}

.stitch-progress {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.completed-stitch {
  color: var(--accent-color);
  background-color: #9e9e9e !important;
  color: white !important;
}

.full-row-preview {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-light);
}

.full-row-preview h3 {
  margin: 0 0 1rem;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.preview-content {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--card-secondary-bg);
  border-radius: 10px;
  overflow-x: auto;
}

.preview-stitch {
  font-family: monospace;
  font-size: 1.2rem;
  color: var(--text-primary);
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-light);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.preview-stitch:hover {
  transform: translateY(-1px);
}

.preview-stitch.completed-stitch {
  background-color: #9e9e9e !important;
  color: white !important;
  border-color: #848484;
}

.current-stitch {
  border: 3px solid var(--accent-color, #42b883);
  position: relative;
  background-color: rgba(76, 175, 80, 0.15);
  font-weight: bold;
  border-radius: 8px !important;
  box-shadow: 0 0 10px rgba(66, 184, 131, 0.5);
  outline: 1px solid rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.row-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.row-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.row-select {
  padding: 0.75rem 1rem;
  background-color: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.row-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(79, 135, 255, 0.25);
}

/* Experimental features section */
.experimental-features {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--card-secondary-bg);
}

.experimental-features h3 {
  margin: 0 0 1rem;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.feature-section {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.feature-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--button-bg);
  color: var(--text-primary);
  border: 1px solid var(--button-border);
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feature-button:hover {
  background-color: var(--button-hover-bg);
  border-color: var(--accent-color);
  color: var(--accent-color);
  transform: translateY(-2px);
}

/* Mobile-specific styles */
.mobile-only {
  display: none;
}

/* Media queries for responsive design */
@media (min-width: 1024px) {
  .pattern-view {
    padding: 1rem;
  }
}

@media (max-width: 767px) {
  .pattern-view {
    padding: 0.5rem;
  }
  
  .desktop-only {
    display: none;
  }
  
  .mobile-only {
    display: block;
  }
  
  .stacked-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .stacked-info h2 {
    font-size: 1.1rem;
    margin: 0;
    font-weight: 600;
  }
  
  .stacked-info .row-color {
    color: var(--accent-color);
    font-size: 0.9rem;
  }
  
  .pattern-header {
    margin-bottom: 1rem;
  }
  
  .header-content h1 {
    font-size: 1.5rem;
  }
  
  .row-header {
    padding: 0.75rem;
  }
  
  .row-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .row-title h2 {
    font-size: 1.1rem;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .row-color {
    color: var(--accent-color);
  }
  
  .complete-button {
    padding: 0.35rem 0.75rem;
    font-size: 0.9rem;
    height: 32px;
    min-width: 32px;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  
  .button-text {
    display: inline-block;
    margin-left: 0.25rem;
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
    padding: 0.75rem;
  }
  
  .current-stitches {
    font-size: 1.5rem;
  }
  
  .experimental-features {
    padding: 1rem;
  }
  
  .feature-section {
    flex-direction: column;
  }
  
  .feature-button {
    width: 100%;
    justify-content: center;
  }
}

/* Raw pattern display */
.raw-pattern {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.raw-pattern h4 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: var(--text-primary);
}

.raw-pattern pre {
  margin: 0;
  padding: 1rem;
  background-color: var(--code-bg, #1a1a1a);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Light theme override */
:root.light .raw-pattern pre {
  background-color: #f0f0f0;
  color: #333;
}

/* Repeat pattern styles */
.repeat-pattern {
  background: var(--accent-color-light, rgba(79, 135, 255, 0.25)) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  color: var(--text-primary, #fff) !important;
  font-size: 1.2rem !important;
  padding: 0.35rem 0.5rem !important;
  white-space: nowrap;
  border-radius: 8px !important;
}

/* Only apply special styling for current stitches view */
.current-stitches .repeat-pattern {
  font-size: 1.6rem !important;
  margin: 0 0.5rem;
  color: var(--accent-color, #4f87ff) !important;
}

/* For a more prominent display in current stitches */
.current-stitches {
  flex-wrap: wrap;
  justify-content: center;
}

.preview-content .repeat-pattern {
  max-width: none;
  white-space: nowrap;
  overflow: visible;
  font-family: monospace;
  display: inline-block;
}

.current-stitches span {
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.current-stitches span:hover {
  transform: translateY(-2px);
}

/* Stitch type colors matching DevAddPatternModal.vue */
.stitch-sc {
  background-color: #8ed68e !important; /* Pastel green */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-dc {
  background-color: #92c4ff !important; /* Pastel blue */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-hdc {
  background-color: #c3aadb !important; /* Pastel purple */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-tr {
  background-color: #ffbe9d !important; /* Pastel orange */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-dtr {
  background-color: #ffabcf !important; /* Pastel pink */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-ch {
  background-color: #ffe6a2 !important; /* Pastel yellow */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-sl {
  background-color: #c0c0c0 !important; /* Pastel gray */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-inc {
  background-color: #c3e6a5 !important; /* Pastel light green */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-dec {
  background-color: #ffa7a7 !important; /* Pastel red */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-bs {
  background-color: #d0b9a2 !important; /* Pastel brown */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.stitch-ns {
  background-color: #adcbd6 !important; /* Pastel blue-gray */
  color: #333 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
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
</style> 