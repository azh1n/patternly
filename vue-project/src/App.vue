<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { db } from './firebase'
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore'
import PatternCard from './components/PatternCard.vue'
import PatternGrid from './components/PatternGrid.vue'
import SearchBar from './components/SearchBar.vue'
import AddPatternModal from './components/AddPatternModal.vue'

const showModal = ref(false)
const text = ref('')
const patternName = ref('')
const searchQuery = ref('')
const MAX_CHARS = 100000
const PATTERNS_PER_PAGE = 6
const currentPage = ref(1)
const stitchesPerView = ref(5)
const currentStitchIndex = ref(0)
const savedTexts = ref([])
const isLoading = ref(false)
const currentRowIndex = ref(0)
const currentTextIndex = ref(0)
const isSwiping = ref(false)
const startX = ref(0)
const currentX = ref(0)
const showPatternView = ref(false)

// Initialize by fetching patterns
onMounted(async () => {
  try {
    isLoading.value = true
    await fetchSavedTexts()
  } catch (error) {
    console.error('Error fetching patterns:', error)
  } finally {
    isLoading.value = false
  }
})

const parsedRows = computed(() => {
  if (!savedTexts.value[currentTextIndex.value]) return []
  
  const content = savedTexts.value[currentTextIndex.value].content
  const rows = content.split('\n').filter(row => row.trim())
  const parsedRows = []
  
  let currentRow = []
  let currentRowNum = null
  let currentColor = null
  
  const processPattern = (pattern) => {
    // Split by commas but preserve parenthetical groups
    const parts = pattern.split(/,(?![^(]*\))/).map(p => p.trim())
    
    // Filter valid patterns including repeat patterns
    return parts.filter(code => 
      code.match(/^\d+[a-z]+$/) || // normal pattern
      code.match(/^\([^)]+\)x\d+$/) // repeat pattern like (1dc, 1sc)x2
    )
  }
  
  rows.forEach(row => {
    const rowMatch = row.match(/Row (\d+): With (Color [A-Z])/)
    if (rowMatch) {
      // If we have a previous row stored, push it
      if (currentRow.length > 0) {
        parsedRows.push({
          rowNum: currentRowNum,
          color: currentColor,
          codes: currentRow,
          fullRow: currentRow.join(' ')
        })
      }
      
      // Start new row
      currentRowNum = rowMatch[1]
      currentColor = rowMatch[2]
      currentRow = []
      
      // Get the pattern after the color
      let pattern = row.split(currentColor)[1]
      // Add any stitches from this line
      const codes = processPattern(pattern)
      currentRow.push(...codes)
    } else {
      // This is a continuation line - process until FO. or end of line
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
  
  // Push the last row if we have one
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
  // Count expanded stitches for repeat patterns
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
    currentStitchIndex.value = 0 // Reset stitch index when changing rows
  }
}

const previousRow = () => {
  if (currentRowIndex.value > 0) {
    currentRowIndex.value--
    currentStitchIndex.value = 0 // Reset stitch index when changing rows
  }
}

const toggleRowComplete = async () => {
  if (!currentRow.value) return
  
  try {
    const textId = savedTexts.value[currentTextIndex.value].id
    
    // Get existing completion data or initialize empty object
    const completionData = savedTexts.value[currentTextIndex.value].completedRows || {}
    completionData[`row${currentRow.value.rowNum}`] = !completionData[`row${currentRow.value.rowNum}`]
    
    await updateDoc(doc(db, 'texts', textId), {
      completedRows: completionData
    })
    
    // Update local state
    const updatedTexts = [...savedTexts.value]
    updatedTexts[currentTextIndex.value] = {
      ...updatedTexts[currentTextIndex.value],
      completedRows: completionData
    }
    savedTexts.value = updatedTexts
  } catch (error) {
    console.error('Error updating row completion:', error)
  }
}

const isRowComplete = computed(() => {
  if (!currentRow.value || !savedTexts.value[currentTextIndex.value]?.completedRows) return false
  return savedTexts.value[currentTextIndex.value].completedRows[`row${currentRow.value.rowNum}`] || false
})

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
  if (Math.abs(diff) > 100) { // Swipe threshold
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

const saveText = async () => {
  if (!text.value || !patternName.value) return
  
  try {
    isLoading.value = true
    const docRef = await addDoc(collection(db, 'texts'), {
      name: patternName.value,
      content: text.value,
      timestamp: new Date(),
      completedRows: {}
    })
    console.log('Document written with ID: ', docRef.id)
    await fetchSavedTexts()
    closeModal()
    currentRowIndex.value = 0
    currentTextIndex.value = 0
  } catch (error) {
    console.error('Error adding document: ', error)
  } finally {
    isLoading.value = false
  }
}

const fetchSavedTexts = async () => {
  try {
    isLoading.value = true
    const q = query(collection(db, 'texts'), orderBy('timestamp', 'desc'))
    const querySnapshot = await getDocs(q)
    savedTexts.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching documents: ', error)
  } finally {
    isLoading.value = false
  }
}

const openModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  text.value = ''
  patternName.value = ''
}

const handleInput = (event) => {
  if (event.target.value.length <= MAX_CHARS) {
    text.value = event.target.value
  }
}

const transformStyle = computed(() => {
  if (!isSwiping.value) return ''
  const diff = currentX.value - startX.value
  return `translateX(${diff}px)`
})

const getCompletedCodes = computed(() => {
  if (!currentRow.value) return []
  const completedIndex = currentStitchIndex.value + stitchesPerView.value
  return currentRow.value.codes.map((code, index) => ({
    code,
    isCompleted: index < completedIndex
  }))
})

const goToHome = () => {
  showPatternView.value = false
  currentRowIndex.value = 0
  currentStitchIndex.value = 0
}

const viewPattern = () => {
  showPatternView.value = true
}

// Filter patterns based on search query
const filteredPatterns = computed(() => {
  if (!searchQuery.value) return savedTexts.value
  const query = searchQuery.value.toLowerCase()
  return savedTexts.value.filter(pattern => 
    pattern.name.toLowerCase().includes(query) ||
    pattern.content.toLowerCase().includes(query)
  )
})

// Calculate total pages
const totalPages = computed(() => {
  return Math.ceil(filteredPatterns.value.length / PATTERNS_PER_PAGE)
})

// Get patterns for current page
const paginatedPatterns = computed(() => {
  const start = (currentPage.value - 1) * PATTERNS_PER_PAGE
  const end = start + PATTERNS_PER_PAGE
  return filteredPatterns.value.slice(start, end)
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

// Reset to first page when search changes
watch(searchQuery, () => {
  currentPage.value = 1
})

const selectPattern = (pattern) => {
  currentTextIndex.value = savedTexts.value.indexOf(pattern)
  showPatternView.value = true
  currentRowIndex.value = 0
  currentStitchIndex.value = 0
}
</script>

<template>
  <div class="container">
    <div class="header">
      <div class="header-content">
        <h1>Pattern Parser</h1>
        <button v-if="showPatternView" @click="goToHome" class="home-button">
          <span class="home-icon">🏠</span> Home
        </button>
      </div>
    </div>

    <div class="app-container">
      <div v-if="!showPatternView" class="home-page">
        <div class="controls-section">
          <SearchBar v-model="searchQuery" />
          <button @click="openModal" class="add-button">
            <span class="plus-icon">+</span>
            Add Pattern
          </button>
        </div>
        
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading your patterns...</p>
        </div>
        
        <div v-else-if="savedTexts.length > 0" class="patterns-section">
          <h2>Your Patterns <span class="pattern-count">({{ filteredPatterns.length }} total)</span></h2>
          <div class="pattern-cards">
            <div 
              v-for="pattern in paginatedPatterns" 
              :key="pattern.id"
              class="pattern-card"
              @click="currentTextIndex = savedTexts.indexOf(pattern); viewPattern()"
            >
              <div class="pattern-header">
                <h3>{{ pattern.name }}</h3>
                <span class="pattern-date">
                  {{ new Date(pattern.timestamp.seconds * 1000).toLocaleDateString() }}
                </span>
              </div>
              <div class="pattern-preview">
                {{ pattern.content.split('\n')[0] }}
              </div>
              <div class="pattern-footer">
                <span class="view-pattern">View Pattern →</span>
              </div>
            </div>
          </div>

          <div v-if="totalPages > 1" class="pagination">
            <button 
              @click="previousPage" 
              :disabled="currentPage === 1"
              class="pagination-button"
            >
              ← Previous
            </button>
            <div class="page-numbers">
              <button 
                v-for="page in totalPages" 
                :key="page"
                @click="currentPage = page"
                :class="['page-number', { active: currentPage === page }]"
              >
                {{ page }}
              </button>
            </div>
            <button 
              @click="nextPage" 
              :disabled="currentPage === totalPages"
              class="pagination-button"
            >
              Next →
            </button>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <div class="empty-icon">📋</div>
          <h2>No Patterns Yet</h2>
          <p>Start by adding your first pattern!</p>
          <button @click="openModal" class="add-button-large">
            <span class="plus-icon">+</span>
            Add Your First Pattern
          </button>
        </div>
      </div>

      <div v-else class="pattern-view">
        <div v-if="savedTexts.length > 0" class="swipe-container">
          <div 
            class="swipe-content"
            :style="{ transform: transformStyle }"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
          >
            <div class="text-card" :class="{ 'completed': isRowComplete }">
              <div class="text-header">
                <div class="row-info">
                  <h2>Row {{ currentRow?.rowNum }} {{ currentRow?.color }}</h2>
                  <span class="pattern-count">Pattern {{ currentTextIndex + 1 }}/{{ savedTexts.length }}</span>
                  <span class="completion-status">
                    {{ isRowComplete ? 'Completed' : 'In Progress' }}
                  </span>
                </div>
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
                <button 
                  @click="toggleRowComplete"
                  :class="['complete-button', { 'completed': isRowComplete }]"
                >
                  {{ isRowComplete ? 'Mark Incomplete' : 'Mark Complete' }}
                </button>
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

              <div class="progress-bar">
                <div 
                  class="progress"
                  :style="{ width: `${((currentRowIndex + 1) / parsedRows.length) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <AddPatternModal
      v-model="showModal"
      :is-loading="isLoading"
      @save="saveText"
    />
  </div>
</template>

<style scoped>
.container {
  width: 100%;
  min-height: 100vh;
  background-color: #1a1a1a;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  width: 100%;
  background-color: #2a2a2a;
  padding: 1.5rem 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
}

.app-container {
  width: 100%;
  max-width: 400px;
  padding: 0 1rem;
}

.header-content {
  width: 100%;
  max-width: 400px;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 1.8rem;
  background: linear-gradient(45deg, #4CAF50, #81C784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.controls-section {
  width: 100%;
  margin: 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-bar {
  width: 100%;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid #333;
  border-radius: 12px;
  background-color: #2a2a2a;
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #4CAF50;
  background-color: #333;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-button:hover {
  background-color: #45a049;
  transform: translateY(-1px);
}

.plus-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

.patterns-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.patterns-section h2 {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pattern-count {
  font-size: 1rem;
  color: #666;
  font-weight: normal;
}

.pattern-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 1024px) {
  .app-container {
    max-width: 1400px;
    padding: 0 4rem;
  }

  .header-content {
    max-width: 1400px;
    padding: 0 4rem;
  }

  .header h1 {
    font-size: 2.5rem;
  }

  .patterns-section {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0;
  }

  .pattern-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    width: 100%;
  }

  .pattern-card {
    width: 100%;
    min-height: 200px;
    background-color: #2a2a2a;
    border-radius: 16px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid #333;
  }

  .controls-section {
    flex-direction: row;
    align-items: center;
    gap: 2rem;
    margin: 3rem 0;
  }

  .search-bar {
    flex: 1;
  }

  .add-button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    min-width: 200px;
  }

  .search-input {
    font-size: 1.1rem;
    padding: 1.2rem 1.2rem 1.2rem 3.5rem;
  }

  .search-icon {
    font-size: 1.3rem;
    left: 1.2rem;
  }

  .pattern-preview {
    font-size: 1rem;
    margin: 1.5rem 0;
  }

  .pattern-header h3 {
    font-size: 1.4rem;
  }

  /* Pattern View Desktop Styles */
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
    padding: 1rem;
    font-size: 1.1rem;
  }

  .number-input {
    padding: 0.8rem;
    width: 100px;
    font-size: 1.1rem;
  }

  /* Modal Desktop Styles */
  .modal {
    max-width: 800px;
    margin: 2rem;
  }

  .modal-header {
    padding: 2rem;
  }

  .modal-header h2 {
    font-size: 2rem;
  }

  .modal-content {
    padding: 2rem;
  }

  .pattern-name-input,
  .text-area {
    font-size: 1.1rem;
    padding: 1.2rem;
  }

  .text-area {
    min-height: 300px;
  }

  .modal-actions {
    margin-top: 3rem;
  }

  .cancel-button,
  .save-button {
    padding: 1rem 2.5rem;
    font-size: 1.1rem;
  }

  /* Pagination Desktop Styles */
  .pagination {
    margin: 3rem 0;
  }

  .pagination-button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }

  .page-number {
    width: 50px;
    height: 50px;
    font-size: 1.1rem;
  }
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  margin: 0 0 0.5rem 0;
  color: #fff;
}

.empty-state p {
  color: #888;
  margin-bottom: 2rem;
}

.add-button-large {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  width: 100%;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-button-large:hover {
  background-color: #45a049;
  transform: translateY(-2px);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 400px;
  background-color: #2a2a2a;
  border-radius: 16px;
  overflow-y: auto;
  max-height: 90vh;
  margin: 1rem;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.close-button {
  background: none;
  border: none;
  color: #666;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.close-button:hover {
  color: #fff;
}

.modal-content {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #fff;
  font-weight: 500;
}

.pattern-name-input {
  width: 100%;
  padding: 1rem;
  border: 2px solid #333;
  border-radius: 12px;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.pattern-name-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.text-area {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 2px solid #333;
  border-radius: 12px;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 1rem;
  resize: vertical;
  transition: all 0.3s ease;
}

.text-area:focus {
  outline: none;
  border-color: #4CAF50;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-button {
  padding: 0.8rem 1.5rem;
  background-color: transparent;
  color: #fff;
  border: 1px solid #333;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background-color: #333;
}

.save-button {
  padding: 0.8rem 1.5rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.save-button:hover:not(:disabled) {
  background-color: #45a049;
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Pattern view specific styles */
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
}

.text-card.completed {
  background-color: #1e392a;
  border: 1px solid #4CAF50;
}

.text-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.row-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
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

.nav-button:hover {
  opacity: 1;
}

.nav-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: #444;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 1rem;
}

.progress {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
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

.complete-button {
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.complete-button.completed {
  background-color: #f44336;
}

.complete-button:hover {
  opacity: 0.9;
}

.text-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem 1rem;
  min-height: 200px;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.stitch-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #fff;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.number-input {
  padding: 0.5rem;
  border: 1px solid #444;
  border-radius: 4px;
  background: #2a2a2a;
  color: #fff;
  width: 80px;
  text-align: center;
}

.completed-stitch {
  color: #4CAF50;
  font-weight: 500;
}

.home-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #2a2a2a;
  color: white;
  border: 1px solid #444;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.home-button:hover {
  background-color: #3a3a3a;
}

.home-icon {
  font-size: 1.2rem;
}
</style>
