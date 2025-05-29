<template>
  <div class="image-processing-progress">
    <div class="progress-container">
      <div class="progress-header">
        <h3>Processing Image</h3>
        <span class="progress-percentage">{{ Math.round(progress) }}%</span>
      </div>
      
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      
      <div class="progress-message">
        {{ progressMessage }}
      </div>
      
      <div v-if="error" class="error-message">
        <font-awesome-icon icon="exclamation-circle" />
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  progress: {
    type: Number,
    required: true,
    validator: value => value >= 0 && value <= 100
  },
  progressMessage: {
    type: String,
    default: 'Processing...'
  },
  error: {
    type: String,
    default: null
  }
});
</script>

<style scoped>
.image-processing-progress {
  width: 100%;
  max-width: 500px;
  margin: 2rem auto;
  padding: 1.5rem;
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.progress-container {
  width: 100%;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.progress-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.progress-percentage {
  font-weight: bold;
  color: var(--accent-color);
  font-size: 1.1rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-message {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-align: center;
  margin-top: 0.5rem;
  min-height: 1.2rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: var(--error-bg, #f8d7da);
  color: var(--error-color, #721c24);
  border-radius: 4px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-message svg {
  flex-shrink: 0;
}

/* Dark mode adjustments */
:root.dark .progress-bar {
  background-color: var(--border-color, #444);
}
</style>
