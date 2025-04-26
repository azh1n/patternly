<template>
  <div class="pattern-view-toggle">
    <button 
      @click="$emit('update:viewMode', 'text')" 
      :class="{ active: viewMode === 'text' }"
      title="Show text notation"
    >
      <span class="toggle-icon">Aa</span>
      <span class="toggle-label">Text</span>
    </button>
    <button 
      @click="$emit('update:viewMode', 'chart')" 
      :class="{ active: viewMode === 'chart' }"
      title="Show chart notation"
    >
      <span class="toggle-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M4 8 L12 8 M8 4 L8 12" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </span>
      <span class="toggle-label">Chart</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  viewMode: {
    type: String,
    required: true
  }
});

defineEmits(['update:viewMode']);
</script>

<style scoped>
.pattern-view-toggle {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color, #444);
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.pattern-view-toggle button {
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

.pattern-view-toggle button.active {
  background: var(--accent-color, #4f87ff);
  color: white;
}

.pattern-view-toggle button:first-child {
  border-right: 1px solid var(--border-color, #444);
}

.toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

/* Light theme overrides */
:root.light .pattern-view-toggle {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

:root.light .pattern-view-toggle button {
  color: #333;
  background: #f8f9fa;
}

:root.light .pattern-view-toggle button:first-child {
  border-right-color: #e0e0e0;
}

:root.light .pattern-view-toggle button.active {
  background: #2979ff;
  color: white;
  border-color: #2979ff;
}
</style>
