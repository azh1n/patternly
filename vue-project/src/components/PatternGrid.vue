<template>
  <div class="patterns-section">
    <div class="controls-section">
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search patterns..."
          class="search-input"
        />
        <font-awesome-icon icon="search" class="search-icon" />
      </div>
      <button @click="$emit('add-pattern')" class="add-button">
        <font-awesome-icon icon="plus" class="plus-icon" />
        Add Pattern
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading your patterns...</p>
    </div>

    <div v-else>
      <div class="patterns-header">
        <h2>Your Patterns <span class="pattern-count">({{ filteredPatterns.length }} total)</span></h2>
      </div>

      <div v-if="filteredPatterns.length === 0" class="empty-state">
        <font-awesome-icon icon="clipboard" class="empty-icon" />
        <h3>No Patterns Found</h3>
        <p>{{ searchQuery ? 'Try adjusting your search terms.' : 'Start by adding your first pattern!' }}</p>
      </div>

      <div v-else class="pattern-grid">
        <PatternCard
          v-for="(pattern, index) in paginatedPatterns"
          :key="pattern.id"
          :pattern="pattern"
          @select="$emit('select-pattern', pattern, index + (currentPage - 1) * patternsPerPage)"
        />
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button 
          @click="previousPage" 
          :disabled="currentPage === 1"
          class="pagination-button"
        >
          <font-awesome-icon icon="chevron-left" /> Previous
        </button>
        <div class="page-numbers">
          <button 
            v-for="page in totalPages" 
            :key="page"
            @click="currentPage = page"
            :class="['page-number', { active: currentPage === page }]"
          >
            {{ page }}
          </button>
        </div>
        <button 
          @click="nextPage" 
          :disabled="currentPage === totalPages"
          class="pagination-button"
        >
          Next <font-awesome-icon icon="chevron-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import PatternCard from './PatternCard.vue'

const props = defineProps({
  patterns: {
    type: Array,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select-pattern', 'add-pattern'])

const searchQuery = ref('')
const currentPage = ref(1)
const patternsPerPage = 6

// Filter patterns based on search query
const filteredPatterns = computed(() => {
  if (!searchQuery.value) return props.patterns
  const query = searchQuery.value.toLowerCase()
  return props.patterns.filter(pattern => 
    pattern.name.toLowerCase().includes(query) ||
    pattern.content.toLowerCase().includes(query)
  )
})

const totalPages = computed(() => {
  return Math.ceil(filteredPatterns.value.length / patternsPerPage)
})

const paginatedPatterns = computed(() => {
  const start = (currentPage.value - 1) * patternsPerPage
  const end = start + patternsPerPage
  return filteredPatterns.value.slice(start, end)
})

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

// Reset to first page when search changes
watch(searchQuery, () => {
  currentPage.value = 1
})
</script>

<style scoped>
.patterns-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.controls-section {
  width: 100%;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-bar {
  width: 100%;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid var(--input-border);
  border-radius: 12px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 1.2rem;
}

.add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: center;
}

.add-button:hover {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

.plus-icon {
  font-size: 1.2rem;
}

.loading-state {
  text-align: center;
  padding: 4rem 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.patterns-header {
  margin-bottom: 2rem;
}

.patterns-header h2 {
  font-size: 1.5rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pattern-count {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: normal;
}

.pattern-grid, .empty-state {
  width: 100%;
  max-width: var(--max-content-width, 1200px);
  margin: 0 auto;
}

.pattern-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  background-color: var(--card-bg);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  width: calc(100vw - 4rem);
  max-width: var(--max-content-width, 1200px);
  margin: 0 auto;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
  color: var(--accent-color);
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 1.5rem;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
  font-size: 1rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.pagination-button {
  padding: 0.8rem 1.5rem;
  background-color: var(--button-bg);
  color: var(--button-text);
  border: 1px solid var(--button-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.pagination-button:hover:not(:disabled) {
  background-color: var(--button-hover-bg);
  border-color: var(--accent-color);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 0.5rem;
}

.page-number {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-bg);
  color: var(--button-text);
  border: 1px solid var(--button-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.page-number:hover:not(.active) {
  background-color: var(--button-hover-bg);
  border-color: var(--accent-color);
}

.page-number.active {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

@media (min-width: 640px) {
  .pattern-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .controls-section {
    flex-direction: row;
    align-items: center;
    gap: 2rem;
    margin: 3rem 0;
  }

  .search-bar {
    flex: 1;
  }

  .add-button {
    width: auto;
    min-width: 200px;
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }

  .search-input {
    font-size: 1.1rem;
    padding: 1.2rem 1.2rem 1.2rem 3.5rem;
  }

  .search-icon {
    font-size: 1.3rem;
    left: 1.2rem;
  }

  .patterns-header h2 {
    font-size: 1.8rem;
  }

  .pattern-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .pagination-button {
    padding: 1rem 2rem;
    font-size: 1rem;
  }

  .page-number {
    width: 48px;
    height: 48px;
    font-size: 1rem;
  }

  .empty-state {
    width: calc(100vw - 8rem);
  }

  .empty-state h3 {
    font-size: 1.8rem;
  }

  .empty-state p {
    font-size: 1.1rem;
  }
}
</style> 