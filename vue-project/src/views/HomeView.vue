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
import { collection, addDoc, getDocs, query, orderBy, where, getDoc } from 'firebase/firestore'
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
    isLoading.value = true
    console.log('Component mounted, fetching patterns')
    await fetchSavedTexts()
    
    // Check if we have a pattern ID in the URL
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
  if (!user.value?.uid) {
    console.log('No user logged in')
    return
  }
  
  try {
    console.log('Fetching patterns for user:', user.value.uid)
    const patternsRef = collection(db, 'patterns')
    console.log('Using collection:', patternsRef.path)
    
    const q = query(
      patternsRef,
      where('userId', '==', user.value.uid),
      orderBy('timestamp', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    console.log('Query snapshot size:', querySnapshot.size)
    console.log('Query snapshot empty:', querySnapshot.empty)
    
    savedTexts.value = querySnapshot.docs.map(doc => {
      const data = doc.data()
      console.log('Pattern document:', doc.id, data)
      return {
        id: doc.id,
        ...data
      }
    })
    
    console.log('Total patterns loaded:', savedTexts.value.length)
  } catch (error) {
    console.error('Error fetching documents:', error)
    if (error.code === 'permission-denied') {
      console.error('Permission denied. Check security rules.')
    }
  }
}

const selectPattern = (pattern, index) => {
  selectedPattern.value = pattern
  currentTextIndex.value = index
  router.push(`/pattern/${pattern.id}`)
}

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
    console.log('Adding pattern with data:', patternData)
    
    const patternsRef = collection(db, 'patterns')
    console.log('Using collection for add:', patternsRef.path)
    
    const docRef = await addDoc(patternsRef, patternData)
    console.log('Successfully added pattern with ID:', docRef.id)
    
    // Verify the pattern was added by fetching it
    const addedDoc = await getDoc(docRef)
    if (addedDoc.exists()) {
      console.log('Verified pattern exists:', addedDoc.data())
    } else {
      console.error('Pattern was not saved successfully')
    }
    
    // Update local state
    const newPatternWithId = { 
      id: docRef.id, 
      ...patternData 
    }
    savedTexts.value = [newPatternWithId, ...savedTexts.value]
    
    showAddPattern.value = false
    selectPattern(newPatternWithId, 0)
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

const handlePatternDeleted = async () => {
  await fetchSavedTexts()
  selectedPattern.value = null
  currentTextIndex.value = 0
}

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
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--main-bg);
  color: var(--text-primary);
  min-width: 1200px;
}

.main-content {
  flex: 1;
  width: 1200px;
  margin: 0 auto;
  padding: 2rem 3rem;
}

/* Only apply these styles when the screen is actually small */
@media (max-width: 1023px) and (max-device-width: 1023px) {
  .home {
    min-width: unset;
  }
  
  .main-content {
    max-width: 90%;
    padding: 1.5rem 2rem;
  }
}

/* Only apply these styles when the screen is very small AND it's a mobile device */
@media (max-width: 767px) and (max-device-width: 767px) {
  .main-content {
    padding: 1rem;
    max-width: 100%;
  }
}
</style> 