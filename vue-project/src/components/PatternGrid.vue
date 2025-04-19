<!--
  PatternGrid.vue
  Grid component for displaying and managing patterns.
  
  Features:
  - Pattern card grid display
  - Search functionality
  - Pagination
  - Loading states
  - Empty state handling
  - Responsive design
  - Keyboard navigation
-->
<template>
  <div class="pattern-grid">
    <!-- Search Bar -->
    <div class="search-container">
      <div class="search-wrapper">
        <font-awesome-icon icon="search" class="search-icon" aria-hidden="true" />
        <input
          type="text"
          v-model="searchQuery"
          class="search-input"
          placeholder="Search patterns..."
          aria-label="Search patterns"
          @keydown.enter="handleSearch"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div 
      v-if="isLoading" 
      class="loading-state"
      role="status"
      aria-live="polite"
    >
      <div class="loading-spinner" aria-hidden="true"></div>
      <p>Loading patterns...</p>
    </div>

    <!-- Empty State -->
    <div 
      v-else-if="filteredPatterns.length === 0" 
      class="empty-state"
      role="status"
      aria-live="polite"
    >
      <font-awesome-icon icon="folder-open" class="empty-icon" aria-hidden="true" />
      <h3>No Patterns Found</h3>
      <p v-if="searchQuery">
        No patterns match your search "{{ searchQuery }}"
      </p>
      <p v-else>
        You haven't created any patterns yet.
      </p>
    </div>

    <!-- Pattern Grid -->
    <div 
      v-else 
      class="grid-container"
      role="grid"
      aria-label="Pattern collection"
    >
      <PatternCard
        v-for="pattern in paginatedPatterns"
        :key="pattern.id"
        :pattern="pattern"
        @select="handlePatternSelect"
        class="grid-item"
        role="gridcell"
      />
    </div>

    <!-- Pagination -->
    <div 
      v-if="totalPages > 1" 
      class="pagination"
      role="navigation"
      aria-label="Pattern pagination"
    >
      <button 
        @click="previousPage"
        class="pagination-button"
        :disabled="currentPage === 1"
        aria-label="Previous page"
      >
        <font-awesome-icon icon="chevron-left" aria-hidden="true" />
      </button>
      
      <div class="page-numbers">
        <button
          v-for="page in totalPages"
          :key="page"
          @click="goToPage(page)"
          class="page-button"
          :class="{ active: page === currentPage }"
          :aria-label="`Go to page ${page}`"
          :aria-current="page === currentPage ? 'page' : null"
        >
          {{ page }}
        </button>
      </div>

      <button 
        @click="nextPage"
        class="pagination-button"
        :disabled="currentPage === totalPages"
        aria-label="Next page"
      >
        <font-awesome-icon icon="chevron-right" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * Imports
 */
import { ref, computed, watch } from 'vue'
import PatternCard from './PatternCard.vue'

/**
 * Props
 */
const props = defineProps({
  /** Array of pattern objects */
  patterns: {
    type: Array,
    required: true
  },
  /** Whether the grid is loading */
  isLoading: {
    type: Boolean,
    default: false
  }
})

/**
 * Emits
 */
const emit = defineEmits(['pattern-select'])

/**
 * State
 */
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(12)

/**
 * Computed Properties
 */

/**
 * Filters patterns based on search query
 * @returns {Array} Filtered patterns
 */
const filteredPatterns = computed(() => {
  if (!searchQuery.value) return props.patterns
  
  const query = searchQuery.value.toLowerCase()
  return props.patterns.filter(pattern => 
    pattern.name.toLowerCase().includes(query) ||
    pattern.content.toLowerCase().includes(query)
  )
})

/**
 * Calculates total number of pages
 * @returns {number} Total pages
 */
const totalPages = computed(() => {
  return Math.ceil(filteredPatterns.value.length / itemsPerPage.value)
})

/**
 * Gets patterns for current page
 * @returns {Array} Paginated patterns
 */
const paginatedPatterns = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredPatterns.value.slice(start, end)
})

/**
 * Methods
 */

/**
 * Handles pattern selection
 * @param {Object} pattern - Selected pattern
 */
const handlePatternSelect = (pattern) => {
  emit('pattern-select', pattern)
}

/**
 * Handles search input
 */
const handleSearch = () => {
  currentPage.value = 1
}

/**
 * Navigates to previous page
 */
const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

/**
 * Navigates to next page
 */
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

/**
 * Navigates to specific page
 * @param {number} page - Page number
 */
const goToPage = (page) => {
  currentPage.value = page
}

/**
 * Watchers
 */
watch(searchQuery, () => {
  currentPage.value = 1
})
</script>

<style scoped>
/* ===== Grid Container ===== */
.pattern-grid {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

/* ===== Search Styles ===== */
.search-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.search-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 1rem;
}

.search-input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) var(--spacing-xl);
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius-lg);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
  outline: none;
}

.search-input:focus {
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

/* ===== Loading State ===== */
.loading-state {
  text-align: center;
  padding: var(--spacing-xl);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto var(--spacing-md);
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
}

.empty-icon {
  font-size: 3rem;
  color: var(--accent-color);
  margin-bottom: var(--spacing-lg);
}

.empty-state h3 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-size: 1.5rem;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
}

/* ===== Grid Styles ===== */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
  width: 100%;
}

.grid-item {
  width: 100%;
}

/* ===== Pagination Styles ===== */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
}

.pagination-button {
  padding: var(--spacing-sm);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.pagination-button:hover:not(:disabled),
.pagination-button:focus:not(:disabled) {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: var(--spacing-sm);
}

.page-button {
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.page-button:hover,
.page-button:focus {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.page-button.active {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

/* ===== Responsive Styles ===== */
@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .search-container {
    max-width: 100%;
  }

  .pagination {
    flex-wrap: wrap;
  }

  .page-numbers {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style> 