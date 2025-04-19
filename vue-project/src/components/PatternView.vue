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
            <h2>Row {{ currentRow?.rowNum }}</h2>
            <span class="row-color">{{ currentRow?.color }}</span>
          </div>
          <button 
            @click="toggleRowComplete"
            :class="['complete-button', { 'completed': isRowComplete }]"
          >
            <font-awesome-icon :icon="isRowComplete ? 'check-circle' : 'circle'" />
            {{ isRowComplete ? 'Completed' : 'Mark Complete' }}
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
                v-for="(stitch, index) in visibleStitches.split(' ')" 
                :key="index"
                :class="{ 'completed-stitch': index < currentStitchIndex }"
              >
                {{ stitch }}
              </span>
            </div>
            <div class="stitch-progress">
              {{ currentStitchIndex + 1 }}-{{ Math.min(currentStitchIndex + stitchesPerView, totalStitches) }} 
              of {{ totalStitches }} stitches
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
                v-for="(stitch, index) in mobilePreviewStitches" 
                :key="index"
                :class="[
                  'preview-stitch',
                  {
                    'completed-stitch': stitch.status === 'completed',
                    'current-stitch': stitch.status === 'current',
                    'next-stitch': stitch.status === 'next'
                  }
                ]"
              >
                {{ stitch.code }}
              </span>
            </template>
            <template v-else>
              <span 
                v-for="(item, index) in currentRow.codes" 
                :key="index"
                :class="[
                  'preview-stitch',
                  { 'completed-stitch': index < currentStitchIndex },
                  { 'current-stitch': index >= currentStitchIndex && index < currentStitchIndex + stitchesPerView }
                ]"
              >
                {{ item }}
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
          <font-awesome-icon icon="chevron-left" />
          <span class="button-text">Previous</span>
        </button>
        <div class="row-selector">
          <select 
            v-model="currentRowIndex" 
            class="row-select"
          >
            <option 
              v-for="(row, index) in parsedRows" 
              :key="index" 
              :value="index"
            >
              Row {{ row.rowNum }}
            </option>
          </select>
        </div>
        <button 
          @click="nextRow" 
          class="nav-button large"
          :disabled="currentRowIndex === parsedRows.length - 1"
        >
          <span class="button-text">Next</span>
          <font-awesome-icon icon="chevron-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
const windowWidth = ref(window.innerWidth)

// Parse pattern rows into structured data
const parsedRows = computed(() => {
  if (!props.pattern) return []
  
  const content = props.pattern.content
  const rows = content.split('\n').filter(row => row.trim())
  const parsedRows = []
  
  let currentRow = []
  let currentRowNum = null
  let currentColor = null
  
  // Process pattern codes into structured format
  const processPattern = (pattern) => {
    const parts = pattern.split(/,(?![^(]*\))/).map(p => p.trim())
    return parts.filter(code => 
      code.match(/^\d+[a-z]+$/) || 
      code.match(/^\([^)]+\)x\d+$/)
    )
  }
  
  // Parse each row of the pattern
  rows.forEach(row => {
    const rowMatch = row.match(/Row (\d+): With (Color [A-Z])/)
    if (rowMatch) {
      if (currentRow.length > 0) {
        parsedRows.push({
          rowNum: currentRowNum,
          color: currentColor,
          codes: currentRow,
          fullRow: currentRow.join(' ')
        })
      }
      
      currentRowNum = rowMatch[1]
      currentColor = rowMatch[2]
      currentRow = []
      
      let pattern = row.split(currentColor)[1]
      const codes = processPattern(pattern)
      currentRow.push(...codes)
    } else {
      let pattern = row
      if (pattern.includes('FO.')) {
        pattern = pattern.split('FO.')[0]
      }
      if (pattern.includes('(Stitch Count')) {
        pattern = pattern.split('(Stitch Count')[0]
      }
      
      const codes = processPattern(pattern)
      currentRow.push(...codes)
    }
  })
  
  if (currentRow.length > 0) {
    parsedRows.push({
      rowNum: currentRowNum,
      color: currentColor,
      codes: currentRow,
      fullRow: currentRow.join(' ')
    })
  }
  
  return parsedRows
})

// Computed properties for current state
const currentRow = computed(() => {
  return parsedRows.value[currentRowIndex.value]
})

const visibleStitches = computed(() => {
  if (!currentRow.value) return ''
  const start = currentStitchIndex.value
  const end = start + stitchesPerView.value
  return currentRow.value.codes.slice(start, end).join(' ')
})

// Calculate total stitches in current row
const totalStitches = computed(() => {
  if (!currentRow.value) return 0
  return currentRow.value.codes.reduce((total, code) => {
    if (code.includes('x')) {
      const match = code.match(/\(([^)]+)\)x(\d+)/)
      if (match) {
        const [, group, repeat] = match
        const stitchCount = group.split(',').length
        return total + (stitchCount * parseInt(repeat))
      }
    }
    return total + 1
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
  if (currentStitchIndex.value + stitchesPerView.value < totalStitches.value) {
    currentStitchIndex.value += stitchesPerView.value
    updateScrollPosition()
  }
}

const previousStitches = () => {
  if (currentStitchIndex.value > 0) {
    currentStitchIndex.value = Math.max(0, currentStitchIndex.value - stitchesPerView.value)
    updateScrollPosition()
  }
}

// Separate function for scroll position update
const updateScrollPosition = () => {
  // Wait for DOM to update
  setTimeout(() => {
    const previewContent = document.querySelector('.preview-content')
    if (!previewContent || !currentRow.value) return

    if (windowWidth.value < 768) {
      // For mobile view, ensure we show at least one upcoming stitch
      const currentStitches = previewContent.querySelectorAll('.current-stitch')
      const nextStitches = previewContent.querySelectorAll('.next-stitch')
      
      if (currentStitches.length > 0) {
        const lastCurrentStitch = currentStitches[currentStitches.length - 1]
        const containerWidth = previewContent.offsetWidth
        
        // Calculate scroll position to show last current stitch and ensure space for next stitch
        const targetPosition = Math.max(0, lastCurrentStitch.offsetLeft - (containerWidth * 0.7))
        
        previewContent.scrollTo({
          left: targetPosition,
          behavior: 'smooth'
        })
      }
    } else {
      // Desktop view - center the current stitches
      const currentStitches = previewContent.querySelectorAll('.current-stitch')
      if (currentStitches.length === 0) return

      const firstCurrentStitch = currentStitches[0]
      const containerWidth = previewContent.offsetWidth
      const scrollPosition = firstCurrentStitch.offsetLeft - (containerWidth / 2) + (firstCurrentStitch.offsetWidth * stitchesPerView.value / 2)
      
      previewContent.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      })
    }
  }, 0)
}

// Watch for changes that should trigger scroll position update
watch([currentStitchIndex, stitchesPerView], () => {
  updateScrollPosition()
})

// Update scroll position when window is resized
watch(windowWidth, () => {
  updateScrollPosition()
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

// Component initialization
onMounted(() => {
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
  
  // Find the first incomplete row
  const firstIncompleteRowIndex = parsedRows.value.findIndex(row => {
    return !props.pattern?.completedRows?.[`row${row.rowNum}`]
  })
  
  // If an incomplete row is found, navigate to it
  if (firstIncompleteRowIndex !== -1) {
    currentRowIndex.value = firstIncompleteRowIndex
  }
})

// Clean up event listener
onUnmounted(() => {
  window.removeEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
})

// New computed property for mobile preview stitches
const mobilePreviewStitches = computed(() => {
  if (!currentRow.value) return []
  
  const allStitches = currentRow.value.codes
  const result = []
  
  // Add all completed stitches
  for (let i = 0; i < currentStitchIndex.value; i++) {
    result.push({ code: allStitches[i], status: 'completed' })
  }
  
  // Add current visible stitches
  for (let i = currentStitchIndex.value; i < currentStitchIndex.value + stitchesPerView.value; i++) {
    if (i < allStitches.length) {
      result.push({ code: allStitches[i], status: 'current' })
    }
  }
  
  // Add next 3 incomplete stitches
  let nextCount = 0
  for (let i = currentStitchIndex.value + stitchesPerView.value; i < allStitches.length && nextCount < 3; i++) {
    result.push({ code: allStitches[i], status: 'next' })
    nextCount++
  }
  
  return result
})
</script>

<style scoped>
/* Mobile-first styles */
.pattern-view {
  padding: 0.5rem;
  color: var(--text-primary);
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
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.row-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
}

.row-title h2 {
  margin: 0;
  font-size: 1.2rem;
}

.row-color {
  color: var(--accent-color);
  font-weight: 500;
}

/* Complete button styles */
.complete-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border: 1.5px solid var(--accent-color);
  border-radius: 6px;
  background: transparent;
  color: var(--accent-color);
  font-size: 0.9rem;
  font-weight: 500;
  width: auto;
  min-width: 120px;
}

/* Stitch control styles */
.stitch-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-size: 0.9rem;
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
  padding: 0.75rem;
  background-color: var(--card-bg);
}

/* Stitch navigation styles */
.stitch-navigation {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.nav-button {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 8px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Current stitches display */
.stitch-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.current-stitches {
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem;
  min-height: 50px;
  align-items: center;
  width: 100%;
  text-align: center;
}

.current-stitches span {
  color: var(--accent-color);
  display: inline-flex;
  align-items: center;
  letter-spacing: 0.1rem;
}

.current-stitches span.completed-stitch {
  color: var(--text-secondary);
}

.stitch-progress {
  font-size: 0.8rem;
  text-align: center;
  color: var(--text-secondary);
}

/* Full row preview styles */
.full-row-preview {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.full-row-preview h3 {
  font-size: 0.85rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  text-align: center;
}

.preview-content {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.15rem;
  padding: 0.25rem;
  overflow-x: auto;
  justify-content: flex-start;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  position: relative;
  min-width: 100%;
}

.preview-content::-webkit-scrollbar {
  display: none;
}

.preview-stitch {
  font-size: 0.7rem;
  white-space: nowrap;
  color: var(--text-secondary);
  padding: 0.15rem 0.2rem;
  border-radius: 3px;
  position: relative;
  letter-spacing: 0.05rem;
  flex-shrink: 0;
}

.preview-stitch.completed-stitch {
  color: var(--accent-color);
}

.preview-stitch.current-stitch {
  color: var(--text-primary);
  font-weight: 500;
  background-color: rgba(76, 175, 80, 0.1);
}

.preview-stitch.current-stitch::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--accent-color);
}

.preview-stitch.next-stitch {
  color: var(--text-secondary);
  opacity: 0.6;
  font-style: italic;
}

/* Row navigation styles */
.row-navigation {
  padding: 0.75rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
  border-top: 1px solid var(--border-color);
}

.nav-button.large {
  padding: 0.5rem;
  font-size: 0.9rem;
  min-width: 40px;
  max-width: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-text {
  display: none;
}

.row-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.25rem;
}

.row-counter {
  display: none; /* Hide on mobile */
}

.row-select {
  padding: 0.4rem;
  font-size: 0.9rem;
  width: 100%;
  max-width: 200px;
  text-align: center;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  background-color: var(--input-bg);
  color: var(--text-primary);
}

.row-select:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

/* Desktop styles */
@media (min-width: 768px) {
  .pattern-view {
    padding: 1rem;
  }

  .row-header {
    padding: 1.5rem;
  }

  .row-info {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .row-title h2 {
    font-size: 1.5rem;
  }

  .complete-button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    width: auto;
  }

  .stitch-control {
    flex-direction: row;
    margin-top: 1rem;
    font-size: 1rem;
  }

  .pattern-card {
    padding: 1.5rem;
  }

  .stitch-navigation {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .nav-button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    min-width: auto;
    max-width: none;
  }

  .nav-button span {
    margin: 0 0.5rem;
  }

  .current-stitches {
    font-size: 1.8rem;
    margin-bottom: 1rem;
    min-height: auto;
    gap: 0.5rem;
    letter-spacing: 0.15rem;
  }

  .stitch-progress {
    font-size: 0.9rem;
  }

  .full-row-preview {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
  }

  .full-row-preview h3 {
    font-size: 1rem;
  }

  .preview-content {
    gap: 0.25rem;
    padding: 0.5rem;
  }

  .preview-stitch {
    font-size: 0.9rem;
    padding: 0.3rem 0.4rem;
    letter-spacing: 0.15rem;
    border-radius: 4px;
  }

  .nav-button.large {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    min-width: 120px;
    max-width: none;
    gap: 0.75rem;
    height: 44px;
  }

  .button-text {
    display: inline;
    white-space: nowrap;
  }

  .row-navigation {
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    gap: 2rem;
  }

  .row-selector {
    flex-direction: row;
    gap: 1rem;
  }

  .row-select {
    padding: 0.5rem;
    font-size: 1rem;
    width: auto;
    min-width: 150px;
  }
}

@media (min-width: 1024px) {
  .pattern-content {
    max-width: 1200px;
  }
}

@media (max-width: 767px) {
  .preview-content {
    justify-content: flex-start;
    padding: 0.25rem;
    gap: 0.15rem;
  }
  
  .preview-stitch {
    font-size: 0.7rem;
    padding: 0.15rem 0.2rem;
    letter-spacing: 0.05rem;
  }
  
  .preview-stitch.next-stitch::before {
    content: '→';
    display: inline-block;
    margin-right: 0.1rem;
    font-style: normal;
    opacity: 0.8;
  }
}
</style> 