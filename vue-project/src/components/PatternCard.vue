<!--
  PatternCard.vue
  Card component for displaying pattern information in the grid.
  
  Features:
  - Pattern name and preview
  - Creation date
  - User information
  - Interactive hover effects
  - Responsive design
-->
<template>
  <div 
    class="pattern-card"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    :aria-label="`View pattern: ${pattern.name}`"
  >
    <!-- Card Header -->
    <div class="card-header">
      <h3 class="pattern-name">{{ pattern.name }}</h3>
      <span class="creation-date" :title="formatDate(pattern.createdAt)">
        {{ formatDate(pattern.createdAt) }}
      </span>
    </div>

    <!-- Pattern Preview -->
    <div class="pattern-preview">
      <pre>{{ pattern.content }}</pre>
    </div>

    <!-- Card Footer -->
    <div class="card-footer">
      <div class="user-info">
        <font-awesome-icon icon="user" class="user-icon" aria-hidden="true" />
        <span class="username">{{ pattern.userName || 'Anonymous' }}</span>
      </div>
      <font-awesome-icon 
        icon="chevron-right" 
        class="arrow-icon" 
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * Imports
 */
import { format } from 'date-fns'

/**
 * Props
 */
const props = defineProps({
  /** Pattern data object */
  pattern: {
    type: Object,
    required: true
  }
})

/**
 * Emits
 */
const emit = defineEmits(['select'])

/**
 * Methods
 */

/**
 * Formats a date string into a readable format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  try {
    return format(new Date(date), 'MMM d, yyyy')
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Unknown date'
  }
}

/**
 * Handles card click/keyboard interaction
 */
const handleClick = () => {
  emit('select', props.pattern)
}
</script>

<style scoped>
/* ===== Card Container ===== */
.pattern-card {
  background-color: var(--card-bg);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-color);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  height: 100%;
}

.pattern-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--accent-color);
}

.pattern-card:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--accent-color);
}

/* ===== Header Styles ===== */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.pattern-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creation-date {
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* ===== Preview Styles ===== */
.pattern-preview {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.pattern-preview::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(to bottom, transparent, var(--card-bg));
  pointer-events: none;
}

.pattern-preview pre {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 150px;
  overflow: hidden;
}

/* ===== Footer Styles ===== */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.user-icon {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.username {
  font-size: 0.9rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.arrow-icon {
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: transform 0.2s ease;
}

.pattern-card:hover .arrow-icon {
  transform: translateX(2px);
  color: var(--accent-color);
}

/* ===== Responsive Styles ===== */
@media (max-width: 640px) {
  .pattern-card {
    padding: var(--spacing-md);
  }

  .pattern-name {
    font-size: 1rem;
  }

  .creation-date {
    font-size: 0.8rem;
  }

  .pattern-preview pre {
    font-size: 0.8rem;
    max-height: 120px;
  }

  .username {
    max-width: 100px;
  }
}
</style> 