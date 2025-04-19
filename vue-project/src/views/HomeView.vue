<!--
  HomeView.vue
  Main view component that displays either the pattern grid or a selected pattern.
  
  Features:
  - Pattern grid display with search and filtering
  - Individual pattern view with navigation
  - Add new pattern functionality
  - Responsive layout
-->
<template>
  <div class="home">
    <!-- Header Section -->
    <AppHeader :show-nav="true" />

    <!-- Main Content -->
    <main class="main-content">
      <!-- Pattern Grid or Pattern View -->
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

    <!-- Add Pattern Modal -->
    <AddPatternModal
      v-model="showAddPattern"
      :is-loading="isLoading"
      @pattern-added="handlePatternAdded"
    />
  </div>
</template>

<script setup>
/**
 * Imports
 */
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  getDoc 
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/services/auth'

// Components
import PatternView from '@/components/PatternView.vue'
import PatternGrid from '@/components/PatternGrid.vue'
import AddPatternModal from '@/components/AddPatternModal.vue'
import AppHeader from '@/components/AppHeader.vue'

/**
 * Component Setup
 */
const route = useRoute()
const router = useRouter()
const { user } = useAuth()

/**
 * State Management
 */
const savedTexts = ref([])
const isLoading = ref(false)
const currentTextIndex = ref(0)
const selectedPattern = ref(null)
const showAddPattern = ref(false)

/**
 * Lifecycle Hooks
 */
onMounted(async () => {
  try {
    isLoading.value = true
    console.log('Component mounted, fetching patterns')
    await fetchSavedTexts()
    
    // Handle pattern ID from URL
    if (route.params.id) {
      console.log('Found pattern ID in URL:', route.params.id)
      const pattern = savedTexts.value.find(p => p.id === route.params.id)
      if (pattern) {
        console.log('Selecting pattern:', pattern)
        selectPattern(pattern, savedTexts.value.indexOf(pattern))
      }
    }
  } catch (error) {
    console.error('Error in onMounted:', error)
  } finally {
    isLoading.value = false
  }
})

/**
 * Watchers
 */
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

// Watch for user auth state changes
watch(() => user.value?.uid, (newUserId) => {
  console.log('User ID changed:', newUserId)
  if (newUserId) {
    fetchSavedTexts()
  } else {
    savedTexts.value = []
    selectedPattern.value = null
  }
})

/**
 * Methods
 */

/**
 * Fetches saved patterns for the current user
 */
const fetchSavedTexts = async () => {
  if (!user.value?.uid) {
    console.log('No user logged in')
    return
  }
  
  try {
    console.log('Fetching patterns for user:', user.value.uid)
    const patternsRef = collection(db, 'patterns')
    
    const q = query(
      patternsRef,
      where('userId', '==', user.value.uid),
      orderBy('timestamp', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    console.log('Query snapshot size:', querySnapshot.size)
    
    savedTexts.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    console.log('Total patterns loaded:', savedTexts.value.length)
  } catch (error) {
    console.error('Error fetching documents:', error)
    if (error.code === 'permission-denied') {
      console.error('Permission denied. Check security rules.')
    }
  }
}

/**
 * Selects a pattern and updates the route
 * @param {Object} pattern - The pattern to select
 * @param {number} index - The index of the pattern in the list
 */
const selectPattern = (pattern, index) => {
  selectedPattern.value = pattern
  currentTextIndex.value = index
  router.push(`/pattern/${pattern.id}`)
}

/**
 * Handles adding a new pattern
 * @param {Object} newPattern - The pattern to add
 */
const handlePatternAdded = async (newPattern) => {
  if (!user.value?.uid) {
    console.log('No user logged in')
    return
  }
  
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
    
    // Verify the pattern was added
    const addedDoc = await getDoc(docRef)
    if (addedDoc.exists()) {
      console.log('Verified pattern exists:', addedDoc.data())
      
      // Update local state
      const newPatternWithId = { 
        id: docRef.id, 
        ...patternData 
      }
      savedTexts.value = [newPatternWithId, ...savedTexts.value]
      
      showAddPattern.value = false
      selectPattern(newPatternWithId, 0)
    } else {
      throw new Error('Pattern was not saved successfully')
    }
  } catch (error) {
    console.error('Error adding pattern:', error)
    if (error.code === 'permission-denied') {
      console.error('Permission denied. Check security rules.')
    }
    alert('Failed to add pattern. Please try again.')
  } finally {
    isLoading.value = false
  }
}

/**
 * Handles pattern deletion
 */
const handlePatternDeleted = async () => {
  await fetchSavedTexts()
  selectedPattern.value = null
  currentTextIndex.value = 0
}
</script>

<style scoped>
/* ===== Layout Styles ===== */
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  min-width: var(--max-content-width);
}

.main-content {
  flex: 1;
  padding: var(--spacing-xl);
  width: var(--max-content-width);
  margin: 0 auto;
  min-width: var(--max-content-width);
}

.home-view {
  height: 100%;
}

/* ===== Responsive Styles ===== */
@media (max-width: 768px) {
  .main-content {
    padding: var(--spacing-md);
  }
}
</style> 