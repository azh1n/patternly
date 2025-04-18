<template>
  <div class="pattern-view">
    <div class="swipe-container">
      <div 
        class="swipe-content"
        :style="{ transform: transformStyle }"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div class="text-card" :class="{ 'completed': isRowComplete }">
          <div class="pattern-header">
            <h1>{{ pattern.name }}</h1>
            <div class="pattern-controls">
              <button 
                @click="confirmDelete"
                class="delete-button"
              >
                Delete
              </button>
            </div>
          </div>
          <div class="text-header">
            <div class="row-info">
              <h2>Row {{ currentRow?.rowNum }} {{ currentRow?.color }}</h2>
              <button 
                @click="toggleRowComplete"
                :class="['complete-button', { 'completed': isRowComplete }]"
              >
                {{ isRowComplete ? 'Mark Incomplete' : 'Mark Complete' }}
              </button>
            </div>
          </div>

          <div class="stitch-control-wrapper">
            <div class="stitch-control">
              <label for="stitchesPerView">Stitches per view:</label>
              <input 
                type="number" 
                id="stitchesPerView" 
                v-model="stitchesPerView" 
                min="1"
                :max="totalStitches"
                class="number-input"
              />
            </div>
          </div>

          <div class="stitch-navigation">
            <button 
              @click="previousStitches" 
              class="nav-button"
              :disabled="currentStitchIndex === 0"
            >←</button>
            <div class="stitch-content">
              <p class="pattern-text">{{ visibleStitches }}</p>
              <p class="full-row">Full Row: 
                <span 
                  v-for="(item, index) in getCompletedCodes" 
                  :key="index"
                  :class="{ 'completed-stitch': item.isCompleted }"
                >
                  {{ item.code }}{{ index < getCompletedCodes.length - 1 ? ' ' : '' }}
                </span>
              </p>
            </div>
            <button 
              @click="nextStitches" 
              class="nav-button"
              :disabled="currentStitchIndex + stitchesPerView >= totalStitches"
            >→</button>
          </div>

          <div class="row-navigation">
            <button 
              @click="previousRow" 
              class="nav-button"
              :disabled="currentRowIndex === 0"
            >Previous Row</button>
            <button 
              @click="nextRow" 
              class="nav-button"
              :disabled="currentRowIndex === parsedRows.length - 1"
            >Next Row</button>
          </div>
        </div>
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
  display: flex;
  flex-direction: column;
  align-items: center;
}

.swipe-container {
  width: 100%;
  position: relative;
  min-height: 40vh;
  overflow: hidden;
}

.text-card {
  width: 100%;
  max-width: none;
  margin: 1rem 0;
  padding: 2rem;
  background-color: #2a2a2a;
  border-radius: 12px;
  border: 1px solid #333;
}

.text-card.completed {
  background-color: #1e392a;
  border: 1px solid #4CAF50;
}

.text-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.row-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  text-align: left;
}

.row-info h2 {
  margin: 0;
  font-size: clamp(1.2rem, 3vw, 1.6rem);
}

.pattern-text {
  font-size: clamp(1.4rem, 3vw, 2rem);
  color: #fff;
  font-family: monospace;
}

.full-row {
  font-size: 0.9rem;
  color: #888;
  font-family: monospace;
  margin-top: 1rem;
  word-break: break-word;
  line-height: 1.6;
}

.row-navigation {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
}

.nav-button {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.nav-button:hover:not(:disabled) {
  opacity: 1;
}

.nav-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stitch-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin: 2rem 0;
}

.stitch-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.pattern-controls {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.stitch-control-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.stitch-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #fff;
  padding: 0.3rem 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 0.9rem;
}

.number-input {
  padding: 0.3rem;
  border: 1px solid #444;
  border-radius: 4px;
  background: #2a2a2a;
  color: #fff;
  width: 60px;
  text-align: center;
  font-size: 0.9rem;
}

.delete-button {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  background-color: #f44336;
  color: white;
}

.complete-button {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  background-color: #4CAF50;
  color: white;
}

.complete-button.completed {
  background-color: #f44336;
}

.complete-button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.completed-stitch {
  color: #4CAF50;
  font-weight: 500;
}

.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #333;
}

.pattern-header h1 {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  color: #fff;
  font-weight: 500;
}

.pattern-controls {
  display: flex;
  gap: 1rem;
}

@media (min-width: 1024px) {
  .pattern-view {
    max-width: 80%;
    margin: 0 auto;
  }

  .text-card {
    padding: 3rem;
    border-radius: 20px;
  }

  .row-info h2 {
    font-size: 2rem;
  }

  .pattern-text {
    font-size: 2.2rem;
  }

  .full-row {
    font-size: 1.1rem;
    margin-top: 1.5rem;
  }

  .stitch-navigation {
    gap: 3rem;
    margin: 3rem 0;
  }

  .nav-button {
    font-size: 2rem;
    padding: 1rem;
  }

  .stitch-control {
    padding: 0.5rem;
    font-size: 1rem;
  }

  .number-input {
    padding: 0.5rem;
    width: 70px;
    font-size: 1rem;
  }

  .delete-button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    height: 36px;
  }
  
  .pattern-header h1 {
    font-size: 2.2rem;
  }

  .complete-button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    height: 36px;
  }
}
</style> 