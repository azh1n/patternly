<template>
  <div class="patterns-section">
    <h2>Your Patterns <span class="pattern-count">({{ patterns.length }} total)</span></h2>
    <div class="pattern-cards">
      <PatternCard
        v-for="pattern in paginatedPatterns"
        :key="pattern.id"
        :pattern="pattern"
        @select="$emit('select', pattern)"
      />
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="previousPage"
        :disabled="currentPage === 1"
        class="pagination-button"
      >
        ← Previous
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
        Next →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import PatternCard from './PatternCard.vue'

const props = defineProps({
  patterns: {
    type: Array,
    required: true
  }
})

defineEmits(['select'])

const PATTERNS_PER_PAGE = 6
const currentPage = ref(1)

const totalPages = computed(() => {
  return Math.ceil(props.patterns.length / PATTERNS_PER_PAGE)
})

const paginatedPatterns = computed(() => {
  const start = (currentPage.value - 1) * PATTERNS_PER_PAGE
  const end = start + PATTERNS_PER_PAGE
  return props.patterns.slice(start, end)
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}
</script>

<style scoped>
.patterns-section {
  width: 100%;
}

.pattern-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 1024px) {
  .patterns-section {
    padding: 0 2rem;
  }
  
  .pattern-cards {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2rem;
  }
}

.pattern-count {
  font-size: 1rem;
  color: #666;
  font-weight: normal;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0;
  padding: 1rem;
}

.pagination-button {
  padding: 0.8rem 1.5rem;
  background-color: #2a2a2a;
  color: white;
  border: 1px solid #333;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.pagination-button:hover:not(:disabled) {
  background-color: #333;
  border-color: #4CAF50;
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
  border-radius: 8px;
  border: 1px solid #333;
  background-color: #2a2a2a;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-number.active {
  background-color: #4CAF50;
  border-color: #4CAF50;
}

.page-number:hover:not(.active) {
  background-color: #333;
  border-color: #4CAF50;
}
</style> 