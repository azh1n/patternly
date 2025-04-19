<!-- Pattern card component displaying pattern information and completion status -->
<template>
  <!-- Main card container with click handler -->
  <div class="pattern-card" @click="handleClick">
    <!-- Card header with pattern name and date -->
    <div class="pattern-header">
      <h3>{{ pattern.name }}</h3>
      <span class="pattern-date">
        {{ new Date(pattern.timestamp.seconds * 1000).toLocaleDateString() }}
      </span>
    </div>
    <!-- Pattern preview showing first line of instructions -->
    <div class="pattern-preview">
      {{ pattern.content.split('\n')[0] }}
    </div>
    <!-- Card footer with completion status and view button -->
    <div class="pattern-footer">
      <div class="completion-info">
        <span class="completion-count">
          {{ completedRowsCount }} / {{ totalRows }} rows
        </span>
        <div class="completion-bar">
          <div 
            class="completion-progress"
            :style="{ width: `${completionPercentage}%` }"
          ></div>
        </div>
      </div>
      <span class="view-pattern">View Pattern →</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

// Component props
const props = defineProps({
  pattern: {
    type: Object,
    required: true  // Pattern object containing name, content, timestamp, and completion data
  }
})

// Router instance for navigation
const router = useRouter()

// Calculate total number of rows in pattern
const totalRows = computed(() => {
  return props.pattern.content.split('\n')
    .filter(line => line.trim().startsWith('Row')).length
})

// Calculate number of completed rows
const completedRowsCount = computed(() => {
  if (!props.pattern.completedRows) return 0
  return Object.values(props.pattern.completedRows).filter(Boolean).length
})

// Calculate completion percentage
const completionPercentage = computed(() => {
  const totalRows = Object.keys(props.pattern.completedRows || {}).length
  const completedRows = Object.values(props.pattern.completedRows || {}).filter(Boolean).length
  return totalRows ? Math.round((completedRows / totalRows) * 100) : 0
})

// Navigate to pattern detail view
const handleClick = () => {
  router.push(`/pattern/${props.pattern.id}`)
}
</script>

<style scoped>
/* Card container styles */
.pattern-card {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

/* Card hover effects */
.pattern-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: var(--hover-bg);
}

/* Header layout styles */
.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

/* Pattern title styles */
.pattern-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
  flex: 1;
}

/* Date display styles */
.pattern-date {
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* Pattern preview styles with text truncation */
.pattern-preview {
  font-size: 0.95rem;
  margin: 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
  line-height: 1.5;
  flex: 1;
}

/* Footer section styles */
.pattern-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Completion information container */
.completion-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Completion count text styles */
.completion-count {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* Progress bar container */
.completion-bar {
  width: 100px;
  height: 4px;
  background-color: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

/* Progress bar fill */
.completion-progress {
  height: 100%;
  background-color: var(--button-bg);
  transition: width 0.3s ease;
}

/* View pattern link styles */
.view-pattern {
  color: var(--button-bg);
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

/* View pattern link hover state */
.pattern-card:hover .view-pattern {
  color: var(--button-hover-bg);
}

/* Desktop responsive styles */
@media (min-width: 1024px) {
  .pattern-header h3 {
    font-size: 1.4rem;
  }

  .pattern-date {
    font-size: 1rem;
  }

  .pattern-preview {
    font-size: 1rem;
  }

  .completion-count {
    font-size: 1rem;
  }

  .view-pattern {
    font-size: 1rem;
  }
}
</style> 