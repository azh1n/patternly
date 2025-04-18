<template>
  <div class="container">
    <header class="header">
      <div class="header-content">
        <h1 
          :class="{ clickable: selectedPattern }"
          @click="selectedPattern && router.push('/')"
        >
          Pattern Tracker
        </h1>
      </div>
    </header>

    <main class="main-content">
      <div v-if="!selectedPattern" class="home-view">
        <PatternGrid
          :patterns="savedTexts"
          :is-loading="isLoading"
          @select-pattern="selectPattern"
          @add-pattern="showAddPattern = true"
        />
      </div>

      <PatternView
        v-else
        :pattern="selectedPattern"
        :patterns="savedTexts"
        :current-text-index="currentTextIndex"
        @update:current-text-index="currentTextIndex = $event"
        @pattern-deleted="handlePatternDeleted"
      />
    </main>

    <AddPatternModal
      v-model="showAddPattern"
      :is-loading="isLoading"
      @pattern-added="handlePatternAdded"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from './firebase'
import PatternView from './components/PatternView.vue'
import PatternGrid from './components/PatternGrid.vue'
import AddPatternModal from './components/AddPatternModal.vue'

const route = useRoute()
const router = useRouter()
const savedTexts = ref([])
const isLoading = ref(false)
const currentTextIndex = ref(0)
const selectedPattern = ref(null)
const showAddPattern = ref(false)

onMounted(async () => {
  try {
    isLoading.value = true
    await fetchSavedTexts()
    // Check if we have a pattern ID in the URL
    if (route.params.id) {
      const pattern = savedTexts.value.find(p => p.id === route.params.id)
      if (pattern) {
        selectPattern(pattern, savedTexts.value.indexOf(pattern))
      }
    }
  } catch (error) {
    console.error('Error fetching patterns:', error)
  } finally {
    isLoading.value = false
  }
})

// Watch for route changes
watch(() => route.params.id, async (newId) => {
  if (newId) {
    const pattern = savedTexts.value.find(p => p.id === newId)
    if (pattern) {
      selectPattern(pattern, savedTexts.value.indexOf(pattern))
    }
  } else {
    selectedPattern.value = null
  }
})

const fetchSavedTexts = async () => {
  try {
    const q = query(collection(db, 'texts'), orderBy('timestamp', 'desc'))
    const querySnapshot = await getDocs(q)
    savedTexts.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching documents:', error)
  }
}

const selectPattern = (pattern, index) => {
  selectedPattern.value = pattern
  currentTextIndex.value = index
  router.push(`/pattern/${pattern.id}`)
}

const handlePatternAdded = async (newPattern) => {
  try {
    isLoading.value = true
    const docRef = await addDoc(collection(db, 'texts'), {
      ...newPattern,
      timestamp: new Date(),
      completedRows: {}
    })
    await fetchSavedTexts()
    showAddPattern.value = false
    // Navigate to the new pattern
    selectPattern({ id: docRef.id, ...newPattern }, 0)
  } catch (error) {
    console.error('Error adding pattern:', error)
  } finally {
    isLoading.value = false
  }
}

const handlePatternDeleted = async () => {
  await fetchSavedTexts()
  selectedPattern.value = null
  currentTextIndex.value = 0
}
</script>

<style>
:root {
  --header-height: 60px;
  --max-content-width: 1200px;
  --header-bg: #1a1a1a;
  --main-bg: #121212;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --accent-color: #4CAF50;
  --border-color: #333333;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--main-bg);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.container {
  width: 100%;
  min-height: 100vh;
  background-color: var(--main-bg);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}

.header {
  background-color: var(--header-bg);
  height: var(--header-height);
  width: 100%;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: 0 1rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header h1 {
  margin: 0;
  font-size: 1.8rem;
  background: linear-gradient(45deg, var(--accent-color), #81C784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: all 0.2s ease;
  position: relative;
  padding: 0.5rem;
}

.header h1.clickable {
  cursor: pointer;
}

.header h1.clickable:hover {
  transform: translateY(-1px);
  text-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
}

.header h1.clickable::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(45deg, var(--accent-color), #81C784);
  transform: scaleX(0);
  transition: transform 0.2s ease;
  opacity: 0;
}

.header h1.clickable:hover::after {
  transform: scaleX(1);
  opacity: 1;
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

.main-content {
  flex: 1;
  width: 100%;
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: 2rem 1rem;
}

@media (min-width: 1024px) {
  .header-content {
    padding: 0 2rem;
  }

  .header h1 {
    font-size: 2.2rem;
  }

  .main-content {
    padding: 3rem 2rem;
  }
}
</style>
