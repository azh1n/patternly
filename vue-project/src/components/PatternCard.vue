<!-- Pattern card component displaying pattern information and completion status -->
<template>
  <!-- Main card container with click handler -->
  <div 
    class="pattern-card" 
    @click="handleClick"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space="handleClick"
    :aria-label="`View pattern: ${pattern.name}`"
  >
    <!-- Card header with pattern name and date -->
    <div class="pattern-header">
      <h3>{{ pattern.name }}</h3>
      <span class="pattern-date" aria-label="Created on">
        {{ formatDate(pattern.timestamp) }}
      </span>
    </div>
    <!-- Pattern preview showing first line of instructions -->
    <div class="pattern-preview" aria-label="Pattern preview">
      {{ previewText }}
    </div>
    <!-- Card footer with completion status and view button -->
    <div class="pattern-footer">
      <div class="completion-info">
        <span class="completion-count" aria-label="Completion progress">
          {{ completedRowsCount }} / {{ totalRows }} rows
        </span>
        <div 
          class="completion-bar" 
          role="progressbar"
          :aria-valuenow="completionPercentage"
          aria-valuemin="0"
          aria-valuemax="100"
        >
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
  },
})

// Router instance for navigation
const router = useRouter()

// Format the timestamp
const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return 'No date'
  return new Date(timestamp.seconds * 1000).toLocaleDateString()
}

// Get preview text
const previewText = computed(() => {
  if (!props.pattern.content) return 'No pattern content';
  
  // Check if this is the new format (with Row: X, Color: Y, Stitches: Z)
  if (props.pattern.content.includes('Row:') && 
      props.pattern.content.includes('Color:') && 
      props.pattern.content.includes('Stitches:')) {
    
    // Extract the row number and color from the first row
    const rowMatch = props.pattern.content.match(/Row:\s*(\d+)/);
    const colorMatch = props.pattern.content.match(/Color:\s*([^,]*)/);
    
    const rowNum = rowMatch ? rowMatch[1] : '';
    const color = colorMatch ? colorMatch[1].trim() : '';
    
    // Create a readable preview
    if (rowNum && color) {
      return `Row ${rowNum}: With Color ${color}...`;
    }
  }
  
  // For older format, use the first line
  const lines = props.pattern.content.split('\n');
  return lines.length > 0 ? lines[0] : 'Empty pattern';
})

// Calculate total number of rows in pattern
const totalRows = computed(() => {
  // First, check if totalRows is already stored in the database
  if (props.pattern.totalRows) {
    return props.pattern.totalRows;
  }
  
  // Fallback to calculation from content if not available in database
  if (!props.pattern.content) return 0;
  return props.pattern.content.split('\n')
    .filter(line => line.trim().startsWith('Row')).length;
})

// Calculate number of completed rows
const completedRowsCount = computed(() => {
  if (!props.pattern.completedRows) return 0
  return Object.values(props.pattern.completedRows).filter(Boolean).length
})

// Calculate completion percentage
const completionPercentage = computed(() => {
  if (!props.pattern.completedRows) return 0;
  
  const completedRows = Object.values(props.pattern.completedRows).filter(Boolean).length;
  return totalRows.value > 0 ? Math.round((completedRows / totalRows.value) * 100) : 0;
})

// Navigate to pattern detail view
const handleClick = () => {
  const routePath = `/pattern/${props.pattern.id}`
  router.push(routePath)
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
  background-color: #4CAF50;
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