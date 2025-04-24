<template>
  <div class="home">
    <AppHeader :show-nav="true" :is-dev-mode="false" />

    <main class="main-content">
      <div v-if="!selectedPattern" class="home-view">
        <div v-if="experimentalFeatures" class="experimental-banner">
          <span>Try our experimental features!</span>
          <router-link to="/dev" class="experimental-link">
            <font-awesome-icon icon="flask" /> Go to experimental version
          </router-link>
        </div>
        
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
import { useUserSettings } from '@/services/userSettings'
import PatternView from '@/components/PatternView.vue'
import PatternGrid from '@/components/PatternGrid.vue'
import AddPatternModal from '@/components/AddPatternModal.vue'
import AppHeader from '@/components/AppHeader.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { experimentalFeatures } = useUserSettings()

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
    } else {
      await fetchPatterns()
      const refetchedPattern = savedTexts.value.find(p => p.id === newId)
      if (refetchedPattern) {
        selectPattern(refetchedPattern, savedTexts.value.indexOf(refetchedPattern))
      } else {
        console.error('Pattern not found after refetch')
      }
    }
  } else {
    selectedPattern.value = null
  }
})

// Fetch patterns from Firestore
const fetchPatterns = async () => {
  if (!user.value) return
  
  try {
    isLoading.value = true
    
    const patternsRef = collection(db, 'patterns')
    const q = query(patternsRef, where('userId', '==', user.value.uid))
    const querySnapshot = await getDocs(q)
    
    const patterns = []
    querySnapshot.forEach((doc) => {
      patterns.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    savedTexts.value = patterns
  } catch (error) {
    console.error('Error fetching patterns:', error)
    if (error.code === 'permission-denied') {
      console.error('Permission denied. Check security rules.')
    }
  } finally {
    isLoading.value = false
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
  position: relative;
  padding-bottom: 60px; /* Space for ad banner */
}

.main-content {
  flex: 1;
  width: 100%;
  padding: 1.5rem;
  position: relative;
}

.experimental-banner {
  background-color: var(--card-bg);
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.experimental-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--accent-color);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.experimental-link:hover {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

/* Tablet styles */
@media (max-width: 1023px) {
  .main-content {
    padding: 1.5rem;
  }
}

/* Mobile styles */
@media (max-width: 767px) {
  .main-content {
    padding: 8px;
    -webkit-overflow-scrolling: touch;
  }
  
  .experimental-banner {
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
  }
  
  .experimental-link {
    width: 100%;
    justify-content: center;
  }
}
</style> 