<!-- Dev Pattern view component with experimental features -->
<template>
  <!-- Main pattern view container -->
  <div class="pattern-view">
    <!-- Pattern header with title, controls, and progress -->
    <div class="pattern-header">
      <div class="experimental-badge">EXPERIMENTAL</div>
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
      
      <!-- DEV: Experimental features section -->
      <div class="experimental-features">
        <h3>Experimental Features</h3>
        <div class="feature-section">
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
    
    for (const row of rows) {
      const trimmed = row.trim()
      
      // Check if this is a row marker line (Row X Color)
      const rowMatch = trimmed.match(/^Row\s+(\d+)\s+([\w\s]+)$/i)
      
      if (rowMatch) {
        // If we have collected pattern data from previous row, save it
        if (currentRowNum && currentPattern) {
          parsedRows.push({
            rowNum: currentRowNum,
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
        rowNum: currentRowNum,
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

// Process pattern string into stitch codes
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
  const expandedParts = []
  for (const part of filteredParts) {
    const repeatMatch = part.match(/^\(([^)]+)\)x(\d+)$/)
    if (repeatMatch) {
      const [_, pattern, count] = repeatMatch
      const subParts = pattern.split(',').map(p => p.trim()).filter(Boolean)
      for (let i = 0; i < parseInt(count); i++) {
        expandedParts.push(...subParts)
      }
    } else {
      expandedParts.push(part)
    }
  }
  
  return expandedParts
}

// Current row data based on index
const currentRow = computed(() => {
  return parsedRows.value[currentRowIndex.value] || null
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

// Update scroll position helper
const updateScrollPosition = () => {
  try {
    const container = document.querySelector('.preview-content')
    if (container) {
      const activeStitch = container.querySelector('.current-stitch')
      if (activeStitch) {
        activeStitch.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
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

// Mobile preview stitch display
const mobilePreviewStitches = computed(() => {
  if (!currentRow.value) return []
  
  return currentRow.value.codes.map((code, index) => {
    let status = 'pending'
    if (index < currentStitchIndex.value) {
      status = 'completed'
    } else if (index >= currentStitchIndex.value && index < currentStitchIndex.value + stitchesPerView.value) {
      status = 'current'
    } else if (index >= currentStitchIndex.value + stitchesPerView.value && 
               index < currentStitchIndex.value + stitchesPerView.value + 2) {
      status = 'next'
    }
    
    return { code, status }
  })
})

// Completed codes for display in full row preview
const getCompletedCodes = computed(() => {
  if (!currentRow.value) return []
  
  return currentRow.value.codes.map((code, index) => ({
    code,
    isCompleted: index < currentStitchIndex.value
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
  background-color: var(--button-bg);
  color: var(--text-danger);
  border: 1px solid var(--button-border);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-button:hover {
  background-color: var(--button-hover-bg);
  border-color: var(--text-danger);
}

.progress-bar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-track {
  width: 100%;
  height: 8px;
  background-color: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-align: right;
}

.pattern-content {
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 1rem;
}

.row-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.complete-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--button-bg);
  color: var(--text-primary);
  border: 1px solid var(--button-border);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.complete-button:hover {
  background-color: var(--button-hover-bg);
}

.complete-button.completed {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.stitch-control {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.number-control {
  display: flex;
  align-items: center;
}

.control-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-bg);
  border: 1px solid var(--button-border);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
  transition: all 0.2s ease;
}

.control-button:first-child {
  border-radius: 6px 0 0 6px;
}

.control-button:last-child {
  border-radius: 0 6px 6px 0;
}

.control-button:hover:not(:disabled) {
  background-color: var(--button-hover-bg);
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.number-input {
  width: 60px;
  height: 32px;
  border: 1px solid var(--button-border);
  border-left: none;
  border-right: none;
  background-color: var(--button-bg);
  color: var(--text-primary);
  text-align: center;
  font-size: 1rem;
  padding: 0;
}

.number-input:focus {
  outline: none;
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
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.nav-button:hover:not(:disabled) {
  background-color: var(--button-hover-bg);
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
  border-radius: 8px;
  overflow-x: auto;
}

.preview-stitch {
  font-family: monospace;
  font-size: 1.2rem;
  color: var(--text-primary);
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-light);
}

.current-stitch {
  border: 2px solid var(--accent-color);
  position: relative;
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
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 1rem;
}

.row-select:focus {
  outline: none;
  border-color: var(--accent-color);
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
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feature-button:hover {
  background-color: var(--button-hover-bg);
  border-color: var(--accent-color);
  color: var(--accent-color);
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
    gap: 0.25rem;
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
    width: 100%;
    justify-content: space-between;
  }
  
  .stitch-control {
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
</style> 