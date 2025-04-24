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
        <div class="row-info">
          <div class="row-title">
            <!-- Desktop view -->
            <div class="desktop-only">
              <h2>Row {{ currentRow?.rowNum }}</h2>
              <span class="row-color">{{ currentRow?.color }}</span>
            </div>
            <!-- Mobile view -->
            <div class="mobile-only stacked-info">
              <h2>{{ currentRow?.rowNum }}</h2>
              <div class="row-color">{{ currentRow?.color }}</div>
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
                :class="{ 'completed-stitch': stitch.isCompleted }"
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
          <div class="preview-content">
            <template v-if="windowWidth < 768">
              <span 
                v-for="(item, index) in mobilePreviewStitches" 
                :key="index"
                :class="[
                  'preview-stitch',
                  { 'completed-stitch': item.status === 'completed' },
                  { 'current-stitch': item.status === 'current' },
                  { 'next-stitch': item.status === 'next' },
                  { 'border-stitch': item.code.endsWith('bs') }
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
                  { 'border-stitch': item.code.endsWith('bs') }
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'

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

// Parse pattern rows into structured data
const parsedRows = computed(() => {
  if (!props.pattern?.content) return []
  
  try {
    const content = props.pattern.content
    const rows = content.split('\n').filter(row => row?.trim())
    const parsedRows = []
    
    let currentRow = []
    let currentRowNum = null
    let currentColor = null
    let currentPattern = ''
    
    // Parse each row of the pattern
    rows.forEach(row => {
      try {
        const rowMatch = row.match(/Row (\d+): With (Color [A-Z])/)
        if (rowMatch) {
          // Process previous row if exists
          if (currentPattern) {
            // Clean up the pattern before processing
            currentPattern = currentPattern.replace(/\s+/g, ' ').trim()
            // Find the last stitch before FO. or Stitch Count
            if (currentPattern.includes(' FO.')) {
              currentPattern = currentPattern.substring(0, currentPattern.indexOf(' FO.'))
            }
            if (currentPattern.includes(' (Stitch Count')) {
              currentPattern = currentPattern.substring(0, currentPattern.indexOf(' (Stitch Count'))
            }
            
            const codes = processPattern(currentPattern)
            if (codes.length > 0) {
              currentRow.push(...codes)
            }
          }
          
          if (currentRow.length > 0) {
            parsedRows.push({
              rowNum: currentRowNum || '0',
              color: currentColor || 'Color A',
              codes: currentRow,
              fullRow: currentRow.join(' ')
            })
          }
          
          // Start new row
          currentRowNum = rowMatch[1]
          currentColor = rowMatch[2]
          currentRow = []
          currentPattern = row.split(currentColor)[1]?.trim() || ''
        } else {
          // Just append the raw line
          currentPattern += ' ' + row.trim()
        }
      } catch (e) {
        // Silent error handling
      }
    })
    
    // Process the last row
    if (currentPattern) {
      // Clean up the pattern before processing
      currentPattern = currentPattern.replace(/\s+/g, ' ').trim()
      // Find the last stitch before FO. or Stitch Count
      if (currentPattern.includes(' FO.')) {
        currentPattern = currentPattern.substring(0, currentPattern.indexOf(' FO.'))
      }
      if (currentPattern.includes(' (Stitch Count')) {
        currentPattern = currentPattern.substring(0, currentPattern.indexOf(' (Stitch Count'))
      }
      
      const codes = processPattern(currentPattern)
      if (codes.length > 0) {
        currentRow.push(...codes)
      }
    }
    
    if (currentRow.length > 0) {
      parsedRows.push({
        rowNum: currentRowNum || '0',
        color: currentColor || 'Color A',
        codes: currentRow,
        fullRow: currentRow.join(' ')
      })
    }
    
    return parsedRows
  } catch (e) {
    return []
  }
})

// Process pattern codes into structured format
const processPattern = (pattern) => {
  if (!pattern) return []
  
  // Clean up the pattern string
  pattern = pattern.replace(/\s+/g, ' ').trim()
  
  // Split by commas, but preserve parentheses content
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
  
  // Filter and clean the parts
  const filteredParts = parts.filter(code => {
    if (!code) return false
    // Clean the code by removing any trailing period
    const cleanCode = code.replace(/\.$/, '').trim()
    
    // Match standard stitch codes (e.g., "1bs", "22dc")
    const isStandardCode = cleanCode.match(/^\d+[a-z]+$/)
    // Match repeated patterns in parentheses (e.g., "(1dc, 2ch)x3")
    const isRepeatedPattern = cleanCode.match(/^\([^)]+\)x\d+$/)
    // Match border stitches specifically
    const isBorderStitch = cleanCode.match(/^\d+bs$/)
    
    const keep = isStandardCode || isRepeatedPattern || isBorderStitch
    return keep ? cleanCode : null
  }).filter(Boolean)
  
  // Handle any repeated patterns by expanding them
  const result = filteredParts.reduce((acc, code) => {
    if (code.includes('x')) {
      try {
        // It's a repeated pattern
        const [pattern, countStr] = code.slice(1, -1).split(')x')
        const repeats = parseInt(countStr)
        if (isNaN(repeats) || repeats < 0 || repeats > 1000) return acc // Safety check
        
        const subCodes = pattern.split(',')
          .map(p => p.trim().replace(/\.$/, '')) // Remove trailing periods from sub-codes
          .filter(p => p && p.match(/^\d+[a-z]+$/)) // Only include valid stitch codes
        
        if (subCodes.length === 0) return acc
        return [...acc, ...Array.from({ length: repeats }, () => subCodes).flat()]
      } catch (e) {
        return acc
      }
    }
    return [...acc, code.replace(/\.$/, '')] // Remove trailing period from single stitches
  }, [])
  
  return result
}

// Computed properties for current state
const currentRow = computed(() => {
  return parsedRows.value[currentRowIndex.value]
})

const visibleStitches = computed(() => {
  if (!currentRow.value) return ''
  const start = currentStitchIndex.value
  const end = Math.min(start + stitchesPerView.value, currentRow.value.codes.length)
  return currentRow.value.codes.slice(start, end).join(' ')
})

// Calculate total stitches in current row
const totalStitches = computed(() => {
  if (!currentRow.value) return 0
  return currentRow.value.codes.reduce((total, code) => {
    // Extract the number from the stitch code (e.g., "22dc" -> 22)
    const match = code.match(/^(\d+)/)
    return total + (match ? parseInt(match[1]) : 1)
  }, 0)
})

// Get completed codes for full row preview
const getCompletedCodes = computed(() => {
  if (!currentRow.value) return []
  const completedIndex = currentStitchIndex.value + stitchesPerView.value
  return currentRow.value.codes.map((code, index) => ({
    code,
    isCompleted: index < completedIndex
  }))
})

// Check if current row is marked as complete
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
  }
}

const previousRow = () => {
  if (currentRowIndex.value > 0) {
    currentRowIndex.value--
    currentStitchIndex.value = 0
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
      console.log(`Updated row count to ${totalRows.value} for pattern ${props.pattern.name}`)
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
  if (!currentRow.value) return []
  const start = currentStitchIndex.value
  const end = start + stitchesPerView.value
  return currentRow.value.codes.slice(start, end).map((code, index) => ({
    code,
    isCompleted: index < stitchesPerView.value
  }))
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

// Separate function for scroll position update
const updateScrollPosition = () => {
  // Wait for DOM to update
  setTimeout(() => {
    const previewContent = document.querySelector('.preview-content')
    if (!previewContent || !currentRow.value) return

    // Center the current stitches
    const currentStitches = previewContent.querySelectorAll('.current-stitch')
    if (currentStitches.length === 0) return

    const firstCurrentStitch = currentStitches[0]
    const containerWidth = previewContent.offsetWidth
    const scrollPosition = firstCurrentStitch.offsetLeft - (containerWidth / 2) + (firstCurrentStitch.offsetWidth * stitchesPerView.value / 2)
    
    previewContent.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth'
    })
  }, 0)
}

// Watch for window resize
onMounted(() => {
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
})

// New computed property for mobile preview stitches
const mobilePreviewStitches = computed(() => {
  if (!currentRow.value) return []
  
  const allStitches = currentRow.value.codes
  return allStitches.map((code, index) => ({
    code,
    status: index < currentStitchIndex.value ? 'completed' 
           : (index >= currentStitchIndex.value && index < currentStitchIndex.value + stitchesPerView.value) ? 'current'
           : 'next'
  }))
})

// Component initialization
onMounted(() => {
  // Find the first incomplete row
  const firstIncompleteRowIndex = parsedRows.value.findIndex(row => {
    return !props.pattern?.completedRows?.[`row${row.rowNum}`]
  })
  
  // If an incomplete row is found, navigate to it
  if (firstIncompleteRowIndex !== -1) {
    currentRowIndex.value = firstIncompleteRowIndex
  }
  
  // Save the row count when component mounts
  saveRowCount()
})
</script>

<style scoped>
/* Main container styles */
.pattern-view {
  width: 100%;
  padding: 0.75rem;
  position: relative;
}

/* Header section styles */
.pattern-header {
  margin-bottom: 2rem;
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
  color: white;
}

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
  padding: 2rem;
  background-color: var(--card-bg);
}

/* Stitch navigation styles */
.stitch-navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
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
}

.current-stitches {
  font-size: 1.8rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  color: var(--accent-color);
}

.stitch-progress {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Full row preview styles */
.full-row-preview {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.preview-content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  -webkit-overflow-scrolling: touch;
}

.preview-stitch {
  font-size: 1rem;
  color: var(--text-primary);
  position: relative;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.preview-stitch.completed-stitch {
  color: var(--accent-color);
}

.preview-stitch.current-stitch {
  font-weight: bold;
  color: var(--text-primary);
  background-color: rgba(76, 175, 80, 0.1);
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

@media (max-width: 767px) {
  .pattern-view {
    padding: 0.5rem;
  }

  .pattern-content {
    border-radius: 0;
    border-left: none;
    border-right: none;
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

  .row-number {
    font-weight: 600;
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

  .number-input {
    width: 80px;
  }

  .pattern-card {
    padding: 0.75rem;
  }

  .stitch-navigation {
    margin-bottom: 1rem;
  }

  .nav-button {
    padding: 0.5rem;
  }

  .nav-button.large {
    width: 48px;
    height: 48px;
    padding: 0;
    justify-content: center;
  }

  .nav-button.large span {
    display: none;
  }

  .current-stitches {
    font-size: 1.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .full-row-preview {
    margin-top: 1rem;
    padding-top: 1rem;
  }

  .preview-content {
    flex-wrap: nowrap;
    justify-content: flex-start;
    padding: 0.5rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-padding: 1rem;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  
  .preview-stitch {
    flex-shrink: 0;
    font-size: 0.85rem;
    padding: 0.25rem;
    white-space: nowrap;
  }

  .row-navigation {
    padding: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .row-selector {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .row-select {
    flex: 1;
    max-width: none;
    min-width: 0;
    padding: 0.5rem;
    -webkit-appearance: none;
    appearance: none;
    background-color: var(--button-bg);
    border: 1px solid var(--button-border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 1rem;
    text-align: center;
    background-image: none;
  }

  /* Target mobile Safari specifically */
  @supports (-webkit-touch-callout: none) {
    .row-select {
      -webkit-appearance: menulist;
      appearance: menulist;
      background: var(--button-bg);
    }
  }

  /* Target Android devices */
  @supports not (-webkit-touch-callout: none) {
    .row-select {
      -webkit-appearance: menulist;
      appearance: menulist;
      background: var(--button-bg);
    }
  }

  .nav-button.large {
    width: 40px;
    height: 40px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Update the template section for mobile view */
  @media (max-width: 767px) {
    .row-title h2::before {
      content: "Row ";
    }
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
}

/* Row navigation styles */
.row-navigation {
  padding: 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

/* Row selector styles */
.row-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.row-counter {
  color: var(--text-secondary);
}

/* Mobile-specific styles */
@media (max-width: 767px) {
  .row-navigation {
    padding: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .row-selector {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .row-select {
    flex: 1;
    max-width: none;
    min-width: 0;
    padding: 0.5rem;
    -webkit-appearance: none;
    appearance: none;
    background-color: var(--button-bg);
    border: 1px solid var(--button-border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 1rem;
    text-align: center;
    background-image: none;
  }

  /* Target mobile Safari specifically */
  @supports (-webkit-touch-callout: none) {
    .row-select {
      -webkit-appearance: menulist;
      appearance: menulist;
      background: var(--button-bg);
    }
  }

  /* Target Android devices */
  @supports not (-webkit-touch-callout: none) {
    .row-select {
      -webkit-appearance: menulist;
      appearance: menulist;
      background: var(--button-bg);
    }
  }
}

/* Desktop-specific styles */
@media (min-width: 768px) {
  .row-selector {
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .row-label {
    font-weight: 500;
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

  .row-select:hover {
    border-color: var(--accent-color);
    background-color: var(--button-hover-bg);
  }

  .row-select:focus {
    outline: none;
    border-color: var(--accent-color);
    background-color: var(--hover-bg);
  }

  .row-select::-ms-expand {
    display: none;
  }

  .row-navigation {
    padding: 1rem 1.5rem;
  }
}

/* Responsive styles */
@media (min-width: 1024px) {
  .pattern-view {
    padding: 1rem;
  }

  .header-content h1 {
    font-size: 2.5rem;
  }

  .row-title h2 {
    font-size: 1.8rem;
  }

  .current-stitches {
    font-size: 2rem;
  }
}

/* Desktop-specific styles */
@media (min-width: 768px) {
  .mobile-only {
    display: none;
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
    font-size: 1rem;
  }
}

/* Mobile-specific styles */
@media (max-width: 767px) {
  .desktop-only {
    display: none;
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
}
</style> 