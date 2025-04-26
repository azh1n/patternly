<template>
  <div class="stitch-visualization-toggle">
    <button 
      @click="$emit('update:visualizationType', 'color')" 
      :class="{ active: visualizationType === 'color' }"
      title="Show color block notation"
    >
      <span class="toggle-icon">
        <div class="toggle-color-block"></div>
      </span>
      <span class="toggle-label">Color Blocks</span>
    </button>
    <button 
      @click="$emit('update:visualizationType', 'symbol')" 
      :class="{ active: visualizationType === 'symbol' }"
      title="Show symbol notation"
    >
      <span class="toggle-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1 L8 15 M1 8 L15 8" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </span>
      <span class="toggle-label">Symbols</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  visualizationType: {
    type: String,
    required: true
  }
});

defineEmits(['update:visualizationType']);
</script>

<style scoped>
.stitch-visualization-toggle {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color, #444);
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stitch-visualization-toggle button {
  flex: 1;
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--text-primary, #fff);
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.stitch-visualization-toggle button.active {
  background: var(--accent-color, #4f87ff);
  color: white;
}

.stitch-visualization-toggle button:first-child {
  border-right: 1px solid var(--border-color, #444);
}

.toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-color-block {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(135deg, #e91e63 0%, #4caf50 50%, #2196f3 100%);
}

/* Light theme overrides */
:root.light .stitch-visualization-toggle {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

:root.light .stitch-visualization-toggle button {
  color: #333;
  background: #f8f9fa;
}

:root.light .stitch-visualization-toggle button:first-child {
  border-right-color: #e0e0e0;
}

:root.light .stitch-visualization-toggle button.active {
  background: #2979ff;
  color: white;
  border-color: #2979ff;
}
</style> 