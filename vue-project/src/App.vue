<script setup>
import { ref, computed } from 'vue'
import { db } from './firebase'
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore'

const showModal = ref(false)
const text = ref('')
const MAX_CHARS = 100000
const wordsPerSegment = ref(5)
const savedTexts = ref([])
const isLoading = ref(false)
const currentIndex = ref(0)
const currentSegmentIndex = ref(0)
const isSwiping = ref(false)
const startX = ref(0)
const currentX = ref(0)

const segments = computed(() => {
  if (!savedTexts.value[currentIndex.value]) return []
  const words = savedTexts.value[currentIndex.value].content.split(' ').filter(word => word.trim())
  const segments = []
  for (let i = 0; i < words.length; i += wordsPerSegment.value) {
    segments.push(words.slice(i, i + wordsPerSegment.value).join(' '))
  }
  return segments
})

const currentSegment = computed(() => {
  if (segments.value.length === 0) return ''
  return segments.value[currentSegmentIndex.value] || ''
})

const totalSegments = computed(() => segments.value.length)

const handleInput = (event) => {
  if (event.target.value.length <= MAX_CHARS) {
    text.value = event.target.value
  }
}

const nextSegment = () => {
  if (currentSegmentIndex.value < totalSegments.value - 1) {
    currentSegmentIndex.value++
  }
}

const previousSegment = () => {
  if (currentSegmentIndex.value > 0) {
    currentSegmentIndex.value--
  }
}

const openModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  text.value = ''
  wordsPerSegment.value = 5
}

const saveText = async () => {
  try {
    isLoading.value = true
    const docRef = await addDoc(collection(db, 'texts'), {
      content: text.value,
      wordsPerSegment: wordsPerSegment.value,
      timestamp: new Date(),
      completed: false
    })
    console.log('Document written with ID: ', docRef.id)
    await fetchSavedTexts()
    closeModal()
    currentSegmentIndex.value = 0
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

const markAsComplete = async (textId) => {
  try {
    await updateDoc(doc(db, 'texts', textId), {
      completed: true
    })
    await fetchSavedTexts()
  } catch (error) {
    console.error('Error updating document: ', error)
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
  if (Math.abs(diff) > 100) { // Swipe threshold
    if (diff > 0) {
      nextSegment()
    } else {
      previousSegment()
    }
  }
  
  isSwiping.value = false
  startX.value = 0
  currentX.value = 0
}

const transformStyle = computed(() => {
  if (!isSwiping.value) return ''
  const diff = currentX.value - startX.value
  return `translateX(${diff}px)`
})
</script>

<template>
  <div class="container">
    <h1>Text Parser</h1>
    
    <button @click="openModal" class="add-button">Add New Text</button>

    <div v-if="savedTexts.length > 0" class="swipe-container">
      <div 
        class="swipe-content"
        :style="{ transform: transformStyle }"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div class="text-card">
          <div class="text-header">
            <div class="counters">
              <span class="text-count">Text {{ currentIndex + 1 }}/{{ savedTexts.length }}</span>
              <span class="segment-count">Segment {{ currentSegmentIndex + 1 }}/{{ totalSegments }}</span>
            </div>
            <button 
              v-if="!savedTexts[currentIndex]?.completed"
              @click="markAsComplete(savedTexts[currentIndex].id)"
              class="complete-button"
            >
              Mark Complete
            </button>
          </div>
          <div class="text-content">
            <button 
              @click="previousSegment" 
              class="nav-button"
              :disabled="currentSegmentIndex === 0"
            >←</button>
            <p class="segment-text">{{ currentSegment }}</p>
            <button 
              @click="nextSegment" 
              class="nav-button"
              :disabled="currentSegmentIndex === totalSegments - 1"
            >→</button>
          </div>
          <div class="progress-bar">
            <div 
              class="progress"
              :style="{ width: `${((currentSegmentIndex + 1) / totalSegments) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>No texts added yet. Click "Add New Text" to get started!</p>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <h2>Add New Text</h2>
        <div class="modal-content">
          <div class="form-group">
            <label for="text">Text Content:</label>
            <textarea
              v-model="text"
              @input="handleInput"
              :maxlength="MAX_CHARS"
              placeholder="Enter your text here..."
              class="text-area"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="wordsPerSegment">Words per Segment:</label>
            <input 
              type="number" 
              id="wordsPerSegment" 
              v-model="wordsPerSegment" 
              min="1"
              class="number-input"
            />
          </div>

          <div class="modal-actions">
            <button @click="closeModal" class="cancel-button">Cancel</button>
            <button 
              @click="saveText" 
              :disabled="isLoading || !text"
              class="save-button"
            >
              {{ isLoading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reset default margins and set full height */
:root, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

.container {
  max-width: 90vw;
  width: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
  gap: 2rem;
  background-color: #1a1a1a;
}

h1 {
  text-align: center;
  margin: 0;
  width: 100%;
  font-size: clamp(1.5rem, 5vw, 2.5rem);
  color: #fff;
}

.add-button {
  display: block;
  padding: clamp(0.5rem, 2vw, 1rem) clamp(1rem, 4vw, 2rem);
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: clamp(0.9rem, 3vw, 1.2rem);
  width: fit-content;
  transition: all 0.2s ease;
}

.add-button:hover {
  transform: scale(1.05);
  background-color: #45a049;
}

.empty-state {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  width: 100%;
  font-size: clamp(1rem, 3vw, 1.2rem);
}

.swipe-container {
  position: relative;
  width: 100%;
  max-width: min(90vw, 800px);
  min-height: 40vh;
  overflow: hidden;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swipe-content {
  transition: transform 0.3s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-card {
  background-color: #2a2a2a;
  border-radius: 12px;
  padding: clamp(1rem, 4vw, 2rem);
  margin: 1rem auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  text-align: center;
  width: 100%;
  max-width: min(90vw, 700px);
  color: #fff;
}

.text-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.text-count {
  color: #666;
  font-size: clamp(0.8rem, 2vw, 1rem);
}

.complete-button {
  padding: clamp(0.3rem, 1.5vw, 0.5rem) clamp(0.5rem, 2vw, 1rem);
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: clamp(0.8rem, 2vw, 1rem);
}

.text-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1rem;
  min-height: 200px;
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

/* Modal Styles */
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
  padding: 1rem;
}

.modal {
  background-color: #2a2a2a;
  border-radius: 12px;
  padding: clamp(1rem, 4vw, 2rem);
  width: 100%;
  max-width: min(90vw, 600px);
  max-height: 90vh;
  overflow-y: auto;
  margin: 0 auto;
  box-sizing: border-box;
  color: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  text-align: center;
  font-size: clamp(1.2rem, 4vw, 1.8rem);
  color: #fff;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: center;
  width: 100%;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
}

.text-area {
  width: 100%;
  min-height: 20vh;
  padding: 1rem;
  border: 1px solid #444;
  border-radius: 8px;
  background-color: #1a1a1a;
  color: #fff;
  font-family: inherit;
  resize: vertical;
  margin: 0 auto;
  display: block;
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  box-sizing: border-box;
}

.number-input {
  padding: 0.5rem;
  border: 1px solid #444;
  border-radius: 8px;
  width: min(100px, 20vw);
  margin: 0 auto;
  display: block;
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  background-color: #1a1a1a;
  color: #fff;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.cancel-button, .save-button {
  padding: clamp(0.3rem, 1.5vw, 0.5rem) clamp(0.5rem, 2vw, 1rem);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  min-width: 100px;
  transition: all 0.2s ease;
}

.cancel-button {
  background-color: #f44336;
}

.cancel-button:hover {
  background-color: #d32f2f;
}

.save-button {
  background-color: #4CAF50;
}

.save-button:hover {
  background-color: #45a049;
}

.save-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.text-header .counters {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.segment-count {
  color: #888;
  font-size: 0.8rem;
}

.segment-text {
  font-size: clamp(1.5rem, 4vw, 2rem);
  line-height: 1.6;
  text-align: center;
  margin: 0 auto;
  max-width: min(90vw, 600px);
  word-break: break-word;
  color: #fff;
  padding: 2rem 0;
}

@media (max-width: 480px) {
  .container {
    padding: 1rem;
  }
  
  .text-header {
    flex-direction: column;
    align-items: center;
  }
  
  .modal-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .cancel-button, .save-button {
    width: 100%;
  }
}
</style>
