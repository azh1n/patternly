<template>
  <div class="home">
    <AppHeader :show-nav="true" />

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
import { collection, addDoc, getDocs, query, orderBy, where, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/services/auth'
import PatternView from '@/components/PatternView.vue'
import PatternGrid from '@/components/PatternGrid.vue'
import AddPatternModal from '@/components/AddPatternModal.vue'
import AppHeader from '@/components/AppHeader.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

const savedTexts = ref([])
const isLoading = ref(false)
const currentTextIndex = ref(0)
const selectedPattern = ref(null)
const showAddPattern = ref(false)

onMounted(async () => {
  try {
    await fetchPatterns()
    
    // If pattern ID is in URL, select it
    if (route.params.id) {
      const pattern = savedTexts.value.find(p => p.id === route.params.id)
      if (pattern) {
        selectedPattern.value = pattern
      }
    }
  } catch (error) {
    console.error('Error in onMounted:', error)
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

// Fetch patterns from Firestore
async function fetchPatterns() {
  if (!user.value) return

  try {
    const patternsRef = collection(db, 'patterns')
    const q = query(patternsRef, where('userId', '==', user.value.uid))
    const querySnapshot = await getDocs(q)
    
    savedTexts.value = querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data
      }
    })
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.error('Permission denied. Check security rules.')
    } else {
      console.error('Error fetching documents:', error)
    }
  }
}

const selectPattern = (pattern, index) => {
  selectedPattern.value = pattern
  currentTextIndex.value = index
  router.push(`/pattern/${pattern.id}`)
}

// Add new pattern
async function addPattern(patternData) {
  if (!user.value) return

  try {
    const patternsRef = collection(db, 'patterns')
    const docRef = await addDoc(patternsRef, {
      ...patternData,
      userId: user.value.uid,
      timestamp: serverTimestamp()
    })

    // Verify pattern was saved
    const addedDoc = await getDoc(docRef)
    if (addedDoc.exists()) {
      const newPattern = {
        id: docRef.id,
        ...addedDoc.data()
      }
      savedTexts.value.push(newPattern)
      return docRef.id
    } else {
      console.error('Pattern was not saved successfully')
      return null
    }
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.error('Permission denied. Check security rules.')
    } else {
      console.error('Error adding pattern:', error)
    }
    return null
  }
}

const handlePatternAdded = async (newPattern) => {
  if (!user.value?.uid) return

  try {
    isLoading.value = true
    const patternData = {
      ...newPattern,
      userId: user.value.uid,
      timestamp: new Date(),
      completedRows: {}
    }
    
    const patternsRef = collection(db, 'patterns')
    const docRef = await addDoc(patternsRef, patternData)

    // Verify the pattern was added by fetching it
    const addedDoc = await getDoc(docRef)
    if (addedDoc.exists()) {
      // Update local state
      const newPatternWithId = { 
        id: docRef.id, 
        ...patternData 
      }
      savedTexts.value = [newPatternWithId, ...savedTexts.value]
      
      showAddPattern.value = false
      selectPattern(newPatternWithId, 0)
    } else {
      console.error('Pattern was not saved successfully')
    }
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.error('Permission denied. Check security rules.')
    } else {
      console.error('Error adding pattern:', error)
    }
    alert('Failed to add pattern. Please try again.')
  } finally {
    isLoading.value = false
  }
}

const handlePatternDeleted = async () => {
  await fetchPatterns()
  selectedPattern.value = null
  currentTextIndex.value = 0
}

// Watch for user changes
watch(() => user.value?.uid, async (newUserId) => {
  if (newUserId) {
    await fetchPatterns()
  } else {
    savedTexts.value = []
  }
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--main-bg);
  color: var(--text-primary);
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  padding-bottom: 60px; /* Space for ad banner */
}

.main-content {
  flex: 1;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 3rem;
  position: relative;
}

/* Tablet styles */
@media (max-width: 1023px) {
  .main-content {
    max-width: 100%;
    padding: 1.5rem 2rem;
  }
}

/* Mobile styles */
@media (max-width: 767px) {
  .main-content {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 8px 4px;
    -webkit-overflow-scrolling: touch;
  }
}
</style> 