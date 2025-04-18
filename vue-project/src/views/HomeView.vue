<template>
  <div class="home">
    <header class="header">
      <h1 
        :class="{ clickable: selectedPattern }"
        @click="selectedPattern && router.push('/')"
      >
        Pattern Tracker
      </h1>
      <nav>
        <router-link to="/profile" class="profile-link">Profile</router-link>
      </nav>
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
import { collection, addDoc, getDocs, query, orderBy, where, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/services/auth'
import PatternView from '@/components/PatternView.vue'
import PatternGrid from '@/components/PatternGrid.vue'
import AddPatternModal from '@/components/AddPatternModal.vue'

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
}

.header {
  background-color: var(--header-bg);
  height: var(--header-height);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

.header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.5rem;
  background: linear-gradient(45deg, var(--accent-color), #81C784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: all 0.2s;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header nav {
  margin-left: auto;
}

.header h1.clickable {
  cursor: pointer;
}

.header h1.clickable:hover {
  transform: translateX(-50%) translateY(-1px);
  text-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
}

.profile-link {
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s;
  background-color: #2a2a2a;
  border: 1px solid #444;
}

.profile-link:hover {
  background-color: #3a3a3a;
}

.main-content {
  flex: 1;
  width: 100%;
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: 1rem;
}

@media (min-width: 768px) {
  .header {
    padding: 1rem 4rem;
  }

  .header h1 {
    font-size: 1.8rem;
  }

  .main-content {
    padding: 1.5rem 2rem;
  }
}

@media (min-width: 1024px) {
  .header h1 {
    font-size: 2.2rem;
  }

  .main-content {
    padding: 2rem 3rem;
  }
}
</style> 