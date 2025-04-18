<template>
  <div class="pattern-view">
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

    <div class="pattern-content">
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

      <div class="pattern-card">
        <div class="stitch-navigation">
          <button 
            @click="previousStitches" 
            class="nav-button"
            :disabled="currentStitchIndex === 0"
          >
            <font-awesome-icon icon="chevron-left" />
          </button>
          
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
                {{ currentStitchIndex + 1 }}-{{ Math.min(currentStitchIndex + stitchesPerView, totalStitches) }} 
                of {{ totalStitches }} stitches
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

        <div class="full-row-preview">
          <h3>Full Row Preview</h3>
          <div class="preview-content">
            <span 
              v-for="(item, index) in getCompletedCodes" 
              :key="index"
              :class="{ 'completed-stitch': item.isCompleted }"
            >
              {{ item.code }}
            </span>
          </div>
        </div>
      </div>

      <div class="row-navigation">
        <button 
          @click="previousRow" 
          class="nav-button large"
          :disabled="currentRowIndex === 0"
        >
          <font-awesome-icon icon="arrow-left" />
          Previous Row
        </button>
        <span class="row-counter">{{ currentRowIndex + 1 }} / {{ parsedRows.length }}</span>
        <button 
          @click="nextRow" 
          class="nav-button large"
          :disabled="currentRowIndex === parsedRows.length - 1"
        >
          Next Row
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

const props = defineProps({
  pattern: {
    type: Object,
    required: true
  },
  patterns: {
    type: Array,
    required: true
  },
  currentTextIndex: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:currentTextIndex', 'pattern-deleted'])
const router = useRouter()

const stitchesPerView = ref(5)
const currentStitchIndex = ref(0)
const currentRowIndex = ref(0)
const isSwiping = ref(false)
const startX = ref(0)
const currentX = ref(0)

const parsedRows = computed(() => {
  if (!props.pattern) return []
  
  const content = props.pattern.content
  const rows = content.split('\n').filter(row => row.trim())
  const parsedRows = []
  
  let currentRow = []
  let currentRowNum = null
  let currentColor = null
  
  const processPattern = (pattern) => {
    const parts = pattern.split(/,(?![^(]*\))/).map(p => p.trim())
    return parts.filter(code => 
      code.match(/^\d+[a-z]+$/) || 
      code.match(/^\([^)]+\)x\d+$/)
    )
  }
  
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

const currentRow = computed(() => {
  return parsedRows.value[currentRowIndex.value]
})

const visibleStitches = computed(() => {
  if (!currentRow.value) return ''
  const start = currentStitchIndex.value
  const end = start + stitchesPerView.value
  return currentRow.value.codes.slice(start, end).join(' ')
})

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

const getCompletedCodes = computed(() => {
  if (!currentRow.value) return []
  const completedIndex = currentStitchIndex.value + stitchesPerView.value
  return currentRow.value.codes.map((code, index) => ({
    code,
    isCompleted: index < completedIndex
  }))
})

const isRowComplete = computed(() => {
  if (!currentRow.value || !props.pattern?.completedRows) return false
  return props.pattern.completedRows[`row${currentRow.value.rowNum}`] || false
})

const transformStyle = computed(() => {
  if (!isSwiping.value) return ''
  const diff = currentX.value - startX.value
  return `translateX(${diff}px)`
})

const nextStitches = () => {
  if (currentStitchIndex.value + stitchesPerView.value < totalStitches.value) {
    currentStitchIndex.value += stitchesPerView.value
  }
}

const previousStitches = () => {
  if (currentStitchIndex.value > 0) {
    currentStitchIndex.value = Math.max(0, currentStitchIndex.value - stitchesPerView.value)
  }
}

const nextRow = () => {
  if (currentRowIndex.value < parsedRows.value.length - 1) {
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

const toggleRowComplete = async () => {
  if (!currentRow.value) return
  
  try {
    const textId = props.pattern.id
    const completionData = props.pattern.completedRows || {}
    completionData[`row${currentRow.value.rowNum}`] = !completionData[`row${currentRow.value.rowNum}`]
    
    await updateDoc(doc(db, 'texts', textId), {
      completedRows: completionData
    })
  } catch (error) {
    console.error('Error updating row completion:', error)
  }
}

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

const confirmDelete = () => {
  if (confirm('Are you sure you want to delete this pattern? This action cannot be undone.')) {
    deletePattern()
  }
}

const deletePattern = async () => {
  try {
    await deleteDoc(doc(db, 'texts', props.pattern.id))
    emit('pattern-deleted')
    router.push('/')
  } catch (error) {
    console.error('Error deleting pattern:', error)
    alert('Failed to delete pattern. Please try again.')
  }
}

const completedRows = computed(() => {
  if (!props.pattern?.completedRows) return 0
  return Object.values(props.pattern.completedRows).filter(Boolean).length
})

const totalRows = computed(() => parsedRows.value.length)

const completionPercentage = computed(() => {
  if (totalRows.value === 0) return 0
  return Math.round((completedRows.value / totalRows.value) * 100)
})

const currentStitches = computed(() => {
  if (!currentRow.value) return []
  const start = currentStitchIndex.value
  const end = start + stitchesPerView.value
  return currentRow.value.codes.slice(start, end).map((code, index) => ({
    code,
    isCompleted: index < stitchesPerView.value
  }))
})

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

onMounted(() => {
  // Find the first incomplete row
  const firstIncompleteRowIndex = parsedRows.value.findIndex(row => {
    return !props.pattern?.completedRows?.[`row${row.rowNum}`]
  })
  
  // If an incomplete row is found, navigate to it
  if (firstIncompleteRowIndex !== -1) {
    currentRowIndex.value = firstIncompleteRowIndex
  }
})
</script>

<style scoped>
.pattern-view {
  width: 100%;
  max-width: var(--max-content-width, 1200px);
  margin: 0 auto;
  padding: 2rem 1rem;
}

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
  font-size: 2rem;
  margin: 0;
  color: #fff;
}

.progress-bar {
  margin-top: 1rem;
}

.progress-track {
  width: 100%;
  height: 8px;
  background-color: #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.progress-text {
  display: block;
  margin-top: 0.5rem;
  color: #888;
  font-size: 0.9rem;
}

.pattern-content {
  background-color: #2a2a2a;
  border-radius: 16px;
  border: 1px solid #333;
  overflow: hidden;
}

.row-header {
  padding: 1.5rem;
  border-bottom: 1px solid #333;
  background-color: rgba(0, 0, 0, 0.2);
}

.row-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.row-title h2 {
  margin: 0;
  font-size: 1.5rem;
}

.row-color {
  color: #4CAF50;
  font-weight: 500;
}

.complete-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  background: transparent;
  color: #4CAF50;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.complete-button:hover {
  background-color: rgba(76, 175, 80, 0.1);
}

.complete-button.completed {
  background-color: #4CAF50;
  color: white;
}

.stitch-control {
  display: flex;
  align-items: center;
  gap: 1rem;
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
  border: 1px solid #444;
  border-radius: 4px;
  background: #1a1a1a;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:hover:not(:disabled) {
  background: #333;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.number-input {
  width: 60px;
  padding: 0.5rem;
  border: 1px solid #444;
  border-radius: 4px;
  background: #1a1a1a;
  color: #fff;
  text-align: center;
  font-size: 1rem;
  -moz-appearance: textfield;
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.pattern-card {
  padding: 2rem;
}

.stitch-navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.nav-button {
  padding: 0.8rem;
  border: 1px solid #444;
  border-radius: 8px;
  background: #1a1a1a;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-button:hover:not(:disabled) {
  background: #333;
  border-color: #4CAF50;
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-button.large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

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
}

.stitch-progress {
  color: #888;
  font-size: 0.9rem;
}

.full-row-preview {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #333;
}

.full-row-preview h3 {
  margin: 0 0 1rem 0;
  color: #888;
  font-size: 1rem;
  font-weight: normal;
}

.preview-content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-family: monospace;
  line-height: 1.6;
}

.completed-stitch {
  color: #4CAF50;
}

.row-navigation {
  padding: 1.5rem;
  border-top: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.2);
}

.row-counter {
  color: #888;
}

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

@media (min-width: 1024px) {
  .pattern-view {
    padding: 3rem 2rem;
  }

  .header-content h1 {
    font-size: 2.5rem;
  }

  .current-stitches {
    font-size: 2.2rem;
  }

  .pattern-card {
    padding: 3rem;
  }
}
</style> 