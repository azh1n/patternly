<template>
  <div class="app-layout">
    <SideNavigation ref="sideNav" v-model:expanded="sidebarExpanded" />
    
    <div class="main-container" :class="{ 'sidebar-expanded': sidebarExpanded }">
      <!-- Mobile header with menu button -->
      <div class="mobile-header">
        <button class="menu-btn" @click="toggleSidebar">
          <font-awesome-icon icon="bars" />
        </button>
        <h1 class="mobile-title">Patternly</h1>
        <div class="spacer"></div>
      </div>

      <main class="main-content">
        <div v-if="!selectedPattern" class="home-view">
          
          <!-- Add the Firebase Test component when no pattern is selected -->
          <FirebaseTest class="firebase-test-wrapper" />
          
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
    </div>

    <AddPatternModal
      v-model:modelValue="showAddPattern"
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
import PatternView from '@/views/PatternView.vue'
import PatternGrid from '@/components/PatternGrid.vue'
import AddPatternModal from '@/components/AddPatternModal.vue'
import SideNavigation from '@/components/SideNavigation.vue'
import FirebaseTest from '@/components/FirebaseTest.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { experimentalFeatures } = useUserSettings()

const savedTexts = ref([])
const isLoading = ref(false)
const currentTextIndex = ref(0)
const selectedPattern = ref(null)
const showAddPattern = ref(false)
const sidebarExpanded = ref(window.innerWidth >= 768)
const sideNav = ref(null)

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

// Modified handlePatternAdded function with better error handling and validation
const handlePatternAdded = async (newPattern) => {
  if (!user.value?.uid) {
    console.error('User not authenticated');
    return;
  }

  try {
    isLoading.value = true;
    
    // Validate the pattern data
    if (!newPattern || !newPattern.name || !newPattern.content) {
      console.error('Invalid pattern data', newPattern);
      alert('Invalid pattern data. Please ensure pattern has a name and content.');
      isLoading.value = false;
      return;
    }
    
    // Use the working addPattern function that's already tested
    const patternId = await addPattern({
      name: newPattern.name,
      content: newPattern.content
    });
    
    if (patternId) {
      // Find the newly added pattern
      const newlyAddedPattern = savedTexts.value.find(p => p.id === patternId);
      
      if (newlyAddedPattern) {
        // Close modal and select the new pattern
        showAddPattern.value = false;
        selectPattern(newlyAddedPattern, savedTexts.value.indexOf(newlyAddedPattern));
      } else {
        // Refresh patterns if not found
        await fetchPatterns();
        showAddPattern.value = false;
      }
    } else {
      console.error('Failed to save pattern');
      alert('Failed to save pattern. Please try again.');
    }
  } catch (error) {
    // Log detailed error information
    console.error('Error adding pattern:', error);
    alert(`Failed to save pattern: ${error.message || 'Unknown error'}`);
  } finally {
    isLoading.value = false;
  }
};

// Add a direct test function to save a pattern to Firestore
const testDirectSave = async () => {
  try {
    if (!user.value?.uid) {
      console.error('User not authenticated');
      return;
    }
    
    const testPatternData = {
      name: "Test Pattern " + new Date().toISOString(),
      content: "Row: 1, Color: A, Stitches: 5sc, 2dc, 1sc",
      userId: user.value.uid,
      timestamp: new Date(),
      completedRows: {}
    };
    
    const patternsRef = collection(db, 'patterns');
    const docRef = await addDoc(patternsRef, testPatternData);
    
    // Verify by fetching
    const addedDoc = await getDoc(docRef);
    if (addedDoc.exists()) {
      return true;
    } else {
      console.error('Test pattern not found after saving');
      return false;
    }
  } catch (error) {
    console.error('Error in direct test save:', error);
    console.error('Error details:', JSON.stringify(error));
    return false;
  }
}

const handlePatternDeleted = async () => {
  await fetchPatterns()
  selectedPattern.value = null
  currentTextIndex.value = 0
}

// Toggle sidebar expanded state
const toggleSidebar = () => {
  if (sideNav.value) {
    // Call the navigation component's method directly
    sideNav.value.toggleNavigation()
  } else {
    // Fallback to the reactive property if ref isn't available
    sidebarExpanded.value = !sidebarExpanded.value
  }
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
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--main-bg);
  color: var(--text-primary);
  position: relative;
}

.main-container {
  flex: 1;
  padding-left: 60px; /* Width of collapsed sidebar */
  transition: padding-left 0.3s ease;
  width: 100%;
  padding-bottom: 60px; /* Space for ad banner */
}

.main-container.sidebar-expanded {
  padding-left: 220px; /* Width of expanded sidebar */
}

.mobile-header {
  display: none;
  align-items: center;
  padding: 1rem;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-title {
  margin: 0 1rem;
  font-size: 1.25rem;
  color: var(--accent-color);
}

.spacer {
  flex: 1;
}

.firebase-test-wrapper {
  margin-bottom: 2rem;
}

.main-content {
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

/* Mobile styles */
@media (max-width: 767px) {
  .main-container {
    padding-left: 0;
  }
  
  .main-container.sidebar-expanded {
    padding-left: 0;
  }
  
  .mobile-header {
    display: flex;
  }
}
</style> 