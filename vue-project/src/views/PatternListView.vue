<template>
  <div class="app-layout">
    <SideNavigation v-model:expanded="sidebarExpanded" />
    
    <div class="main-container" :class="{ 'sidebar-expanded': sidebarExpanded }">
      <!-- Mobile header with menu button -->
      <div class="mobile-header">
        <button class="menu-btn" @click="toggleSidebar">
          <font-awesome-icon icon="bars" />
        </button>
        <h1 class="mobile-title">Patternly</h1>
        <div class="spacer"></div>
      </div>
      
      <main class="pattern-list-content">
        <div class="page-header">
          <div class="header-left">
            <h1>Your Patterns</h1>
            <p class="subtitle">{{ patterns.length }} {{ patterns.length === 1 ? 'pattern' : 'patterns' }}</p>
          </div>
          
          <div class="header-actions">
            <button class="add-pattern-btn" @click="showAddPattern = true">
              <font-awesome-icon icon="plus" />
              <span>New Pattern</span>
            </button>
          </div>
        </div>
        
        <!-- Filters and Search Section -->
        <div class="filters-container">
          <div class="search-wrapper">
            <font-awesome-icon icon="search" class="search-icon" />
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search patterns..."
              class="search-input"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">
              <font-awesome-icon icon="times" />
            </button>
          </div>
          
          <div class="filters-group">
            <div class="filter-sort">
              <label for="sort-select">Sort:</label>
              <select id="sort-select" v-model="sortOption" class="sort-select">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
            
            <div class="view-toggle">
              <button 
                class="view-btn" 
                :class="{ 'active': viewMode === 'grid' }"
                @click="viewMode = 'grid'"
              >
                <font-awesome-icon icon="th-large" />
              </button>
              <button 
                class="view-btn" 
                :class="{ 'active': viewMode === 'list' }"
                @click="viewMode = 'list'"
              >
                <font-awesome-icon icon="list" />
              </button>
            </div>
          </div>
        </div>
        
        <!-- Loading Indicator -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading patterns...</p>
        </div>
        
        <!-- No Results Message -->
        <div v-else-if="filteredPatterns.length === 0" class="no-results">
          <font-awesome-icon icon="folder-open" size="3x" />
          <h3>{{ searchQuery ? 'No patterns match your search' : 'No patterns found' }}</h3>
          <p v-if="searchQuery">Try adjusting your search query</p>
          <p v-else>Get started by creating your first pattern</p>
          <button class="primary-btn" @click="showAddPattern = true">Create Pattern</button>
        </div>
        
        <!-- Grid View for Patterns -->
        <div 
          v-else-if="viewMode === 'grid'" 
          class="patterns-grid"
        >
          <div 
            v-for="pattern in filteredPatterns" 
            :key="pattern.id" 
            class="pattern-card"
            @click="viewPattern(pattern.id)"
          >
            <div class="pattern-preview">
              <!-- Pattern preview placeholder -->
              <div class="pattern-placeholder" :style="{ backgroundColor: getPatternColor(pattern) }">
                <font-awesome-icon icon="th" />
              </div>
            </div>
            <div class="pattern-info">
              <h3 class="pattern-name">{{ pattern.name }}</h3>
              <p class="pattern-meta">
                <span class="pattern-date">{{ formatDate(pattern.timestamp) }}</span>
                <span class="pattern-size" v-if="pattern.rows && pattern.stitches">
                  {{ pattern.rows }} × {{ pattern.stitches }}
                </span>
              </p>
            </div>
            
            <!-- Pattern Actions Menu -->
            <div class="pattern-actions">
              <button 
                class="action-btn" 
                @click.stop="confirmDeletePattern(pattern)"
                title="Delete Pattern"
              >
                <font-awesome-icon icon="trash-alt" />
              </button>
            </div>
          </div>
        </div>
        
        <!-- List View for Patterns -->
        <div 
          v-else 
          class="patterns-list"
        >
          <div 
            v-for="pattern in filteredPatterns" 
            :key="pattern.id" 
            class="pattern-list-item"
            @click="viewPattern(pattern.id)"
          >
            <div class="pattern-list-color" :style="{ backgroundColor: getPatternColor(pattern) }"></div>
            <div class="pattern-list-info">
              <h3 class="pattern-name">{{ pattern.name }}</h3>
              <div class="pattern-meta">
                <span class="pattern-date">
                  <font-awesome-icon icon="calendar-alt" />
                  {{ formatDate(pattern.timestamp) }}
                </span>
                <span class="pattern-size" v-if="pattern.rows && pattern.stitches">
                  <font-awesome-icon icon="th" />
                  {{ pattern.rows }} × {{ pattern.stitches }}
                </span>
              </div>
            </div>
            
            <!-- Pattern Actions Menu -->
            <div class="pattern-actions">
              <button 
                class="action-btn" 
                @click.stop="confirmDeletePattern(pattern)"
                title="Delete Pattern"
              >
                <font-awesome-icon icon="trash-alt" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
    
    <!-- Add Pattern Modal -->
    <AddPatternModal
      v-model:modelValue="showAddPattern"
      @pattern-added="handlePatternAdded"
    />
    
    <!-- Delete Confirmation Modal -->
    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-backdrop">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Delete Pattern</h3>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete "<strong>{{ patternToDelete?.name }}</strong>"?</p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button @click="showDeleteModal = false" class="cancel-btn">
              Cancel
            </button>
            <button @click="deletePattern" class="delete-btn">
              Delete
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'
import { 
  collection, query, where, orderBy, 
  getDocs, doc, deleteDoc, addDoc
} from 'firebase/firestore'
import { db } from '@/firebase'
import SideNavigation from '@/components/SideNavigation.vue'
import AddPatternModal from '@/components/AddPatternModal.vue'

const router = useRouter()
const { user } = useAuth()
const patterns = ref([])
const isLoading = ref(false)
const sidebarExpanded = ref(window.innerWidth >= 768)
const showAddPattern = ref(false)
const searchQuery = ref('')
const sortOption = ref('newest')
const viewMode = ref('grid')
const showDeleteModal = ref(false)
const patternToDelete = ref(null)

// Fetch patterns on component mount
onMounted(async () => {
  if (user.value) {
    await fetchPatterns()
  }
})

// Watch for user changes
watch(() => user.value, async (newUser) => {
  if (newUser) {
    await fetchPatterns()
  } else {
    patterns.value = []
  }
})

// Fetch all patterns
const fetchPatterns = async () => {
  if (!user.value) return
  
  try {
    isLoading.value = true
    
    const patternsRef = collection(db, 'patterns')
    const q = query(
      patternsRef,
      where('userId', '==', user.value.uid)
    )
    
    const querySnapshot = await getDocs(q)
    
    patterns.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching patterns:', error)
  } finally {
    isLoading.value = false
  }
}

// Filter and sort patterns
const filteredPatterns = computed(() => {
  let result = patterns.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(pattern => 
      pattern.name.toLowerCase().includes(query)
    )
  }
  
  // Apply sorting
  switch (sortOption.value) {
    case 'newest':
      return [...result].sort((a, b) => {
        const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0)
        const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0)
        return dateB - dateA
      })
    case 'oldest':
      return [...result].sort((a, b) => {
        const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0)
        const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0)
        return dateA - dateB
      })
    case 'name-asc':
      return [...result].sort((a, b) => 
        (a.name || '').localeCompare(b.name || '')
      )
    case 'name-desc':
      return [...result].sort((a, b) => 
        (b.name || '').localeCompare(a.name || '')
      )
    default:
      return result
  }
})

// Navigate to pattern details
const viewPattern = (patternId) => {
  router.push(`/pattern/${patternId}`)
}

// Handle pattern added event
const handlePatternAdded = async (newPattern) => {
  try {
    isLoading.value = true;
    
    // Ensure we have the complete pattern data
    if (!newPattern || !newPattern.name || !newPattern.content) {
      console.error('Missing required pattern data');
      return;
    }
    
    // Create a reference to the patterns collection
    const patternsRef = collection(db, 'patterns');
    
    // Add the document to Firestore
    const docRef = await addDoc(patternsRef, newPattern);
    
    // Refresh the patterns list
    await fetchPatterns();
  } catch (error) {
    console.error('Error saving pattern in PatternListView:', error);
    alert('Failed to save pattern. Please try again.');
  } finally {
    isLoading.value = false;
  }
}

// Toggle sidebar
const toggleSidebar = () => {
  sidebarExpanded.value = !sidebarExpanded.value
}

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

// Generate a unique color based on pattern name
const getPatternColor = (pattern) => {
  if (!pattern.name) return '#6c5ce7'
  
  const hash = pattern.name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  const colors = [
    '#6c5ce7', '#00cec9', '#fd79a8', '#00b894', 
    '#e17055', '#fdcb6e', '#0984e3', '#b2bec3'
  ]
  
  return colors[Math.abs(hash) % colors.length]
}

// Show delete confirmation modal
const confirmDeletePattern = (pattern) => {
  patternToDelete.value = pattern
  showDeleteModal.value = true
}

// Delete pattern
const deletePattern = async () => {
  if (!patternToDelete.value) return
  
  try {
    const patternRef = doc(db, 'patterns', patternToDelete.value.id)
    await deleteDoc(patternRef)
    
    // Update local state
    patterns.value = patterns.value.filter(p => p.id !== patternToDelete.value.id)
    
    // Close modal
    showDeleteModal.value = false
    patternToDelete.value = null
  } catch (error) {
    console.error('Error deleting pattern:', error)
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  position: relative;
  background-color: var(--main-bg);
}

.main-container {
  flex: 1;
  margin-left: 60px;
  transition: margin-left 0.3s ease;
  width: calc(100% - 60px);
}

.main-container.sidebar-expanded {
  margin-left: 220px;
  width: calc(100% - 220px);
}

/* Mobile header (only visible on small screens) */
.mobile-header {
  display: none;
  align-items: center;
  padding: 1rem;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  height: 60px;
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.25rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-title {
  font-size: 1.25rem;
  margin: 0;
  color: var(--accent-color);
  flex: 1;
  text-align: center;
}

.spacer {
  width: 40px;
}

/* Main content area */
.pattern-list-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Page header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.header-left h1 {
  font-size: 1.75rem;
  margin: 0 0 0.25rem;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.9rem;
}

.add-pattern-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-pattern-btn:hover {
  background-color: var(--accent-hover);
  transform: translateY(-2px);
}

/* Filters section */
.filters-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.clear-search {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  font-size: 0.9rem;
}

.filters-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-sort {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-sort label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.sort-select {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.view-toggle {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.view-btn {
  background-color: var(--card-bg);
  border: none;
  color: var(--text-secondary);
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn.active {
  background-color: var(--accent-color);
  color: white;
}

/* Loading indicator */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--accent-color);
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* No results message */
.no-results {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.no-results h3 {
  margin: 1rem 0 0.5rem;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.no-results p {
  margin-bottom: 1.5rem;
}

.primary-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background-color: var(--accent-color);
  color: white;
}

.primary-btn:hover {
  background-color: var(--accent-hover);
  transform: translateY(-2px);
}

/* Grid view */
.patterns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.pattern-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.pattern-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.pattern-preview {
  height: 160px;
  overflow: hidden;
}

.pattern-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 2rem;
}

.pattern-info {
  padding: 1rem;
}

.pattern-name {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pattern-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.pattern-actions {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  opacity: 0;
  transition: opacity 0.2s;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  padding: 0.25rem;
}

.pattern-card:hover .pattern-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* List view */
.patterns-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pattern-list-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.pattern-list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.pattern-list-color {
  width: 3rem;
  height: 3rem;
  border-radius: 8px;
  margin-right: 1rem;
  flex-shrink: 0;
}

.pattern-list-info {
  flex: 1;
}

.pattern-list-item .pattern-name {
  margin: 0 0 0.25rem;
}

.pattern-list-item .pattern-meta {
  justify-content: flex-start;
  gap: 1rem;
}

.pattern-list-item .pattern-meta span {
  display: flex;
  align-items: center;
}

.pattern-list-item .pattern-meta svg {
  margin-right: 0.35rem;
}

.pattern-list-item .pattern-actions {
  position: static;
  opacity: 0;
  background: none;
  padding: 0;
}

.pattern-list-item:hover .pattern-actions {
  opacity: 1;
}

.pattern-list-item .action-btn {
  color: var(--text-primary);
}

.pattern-list-item .action-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* Modal styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.modal-container {
  background-color: var(--card-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.modal-body {
  padding: 1.5rem;
}

.warning-text {
  color: #e74c3c;
  font-size: 0.9rem;
}

.modal-footer {
  padding: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid var(--border-color);
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background-color: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
}

.delete-btn {
  padding: 0.75rem 1.5rem;
  background-color: #e74c3c;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive styles */
@media (max-width: 767px) {
  .main-container {
    margin-left: 0;
    width: 100%;
  }
  
  .main-container.sidebar-expanded {
    margin-left: 0;
    width: 100%;
  }
  
  .mobile-header {
    display: flex;
  }
  
  .pattern-list-content {
    padding: 1.5rem 1rem;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .filters-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filters-group {
    justify-content: space-between;
  }
  
  .patterns-grid {
    grid-template-columns: 1fr;
  }
  
  .pattern-list-item {
    padding: 0.75rem;
  }
  
  .pattern-list-color {
    width: 2.5rem;
    height: 2.5rem;
    margin-right: 0.75rem;
  }
  
  .pattern-list-item .pattern-name {
    font-size: 1rem;
  }
  
  .pattern-list-item .pattern-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style> 