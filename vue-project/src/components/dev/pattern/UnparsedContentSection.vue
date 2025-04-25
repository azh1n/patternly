<template>
  <div
    v-if="isVisible && unparsedContent.trim()"
    class="unparsed-content-section"
  >
    <div class="unparsed-header">
      <div class="icon-warning">⚠️</div>
      <h4>Unparsed Content</h4>
      <button class="toggle-button" @click="$emit('toggle-show')">
        {{ showUnparsedContent ? '−' : '+' }}
      </button>
    </div>
    <div v-if="showUnparsedContent" class="unparsed-content">
      <p class="help-text">The following content could not be parsed into rows:</p>
      <div class="unparsed-text">{{ unparsedContent }}</div>
      <div class="unparsed-actions">
        <button @click="$emit('add-new-row')" class="action-button">Add New Row</button>
        <button @click="$emit('ignore-unparsed-content')" class="action-button secondary">Ignore This Content</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  unparsedContent: { type: String, required: true },
  showUnparsedContent: { type: Boolean, required: true },
  isVisible: { type: Boolean, required: true }
});
defineEmits(['add-new-row', 'ignore-unparsed-content', 'toggle-show']);
</script>

<style scoped>
.unparsed-content-section {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--warning-border, #8B6E00);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--warning-bg, rgba(255, 204, 0, 0.1));
}

.unparsed-header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--warning-header-bg, rgba(255, 204, 0, 0.2));
  gap: 0.5rem;
}

.icon-warning {
  font-size: 1.5rem;
  margin-right: 0.5rem;
}

.unparsed-content {
  padding: 1rem;
}

.help-text {
  margin-bottom: 0.75rem;
  color: var(--text-secondary, #aaa);
}

.unparsed-text {
  padding: 0.75rem;
  background: var(--input-bg, #333);
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  color: var(--text-secondary, #aaa);
  font-style: italic;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 1rem;
  white-space: pre-wrap;
}

.unparsed-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.action-button {
  padding: 0.5rem 0.75rem;
  background: var(--accent-color, #4f87ff);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: var(--accent-hover, #3a6fd9);
}

.action-button.secondary {
  background: var(--button-secondary-bg, #555);
}

.action-button.secondary:hover {
  background: var(--button-secondary-hover, #666);
}

.toggle-button {
  background: none;
  border: none;
  color: var(--accent-color, #4f87ff);
  font-size: 1.5rem;
  cursor: pointer;
  margin-left: auto;
}

.toggle-button:hover {
  color: var(--accent-hover, #3a6fd9);
}
</style>
