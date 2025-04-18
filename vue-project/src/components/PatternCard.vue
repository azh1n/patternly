<template>
  <div 
    class="pattern-card"
    @click="$emit('select')"
  >
    <div class="pattern-header">
      <h3>{{ pattern.name }}</h3>
      <span class="pattern-date">
        {{ new Date(pattern.timestamp.seconds * 1000).toLocaleDateString() }}
      </span>
    </div>
    <div class="pattern-preview">
      {{ pattern.content.split('\n')[0] }}
    </div>
    <div class="pattern-footer">
      <span class="view-pattern">View Pattern →</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  pattern: {
    type: Object,
    required: true
  }
})

defineEmits(['select'])
</script>

<style scoped>
.pattern-card {
  background-color: #2a2a2a;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #333;
  transition: all 0.3s ease;
  cursor: pointer;
}

.pattern-card:hover {
  transform: translateY(-4px);
  border-color: #4CAF50;
}

.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.pattern-header h3 {
  margin: 0;
  color: #4CAF50;
  font-size: 1.2rem;
  font-weight: 600;
}

.pattern-date {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
}

.pattern-preview {
  color: #aaa;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 1rem 0;
}

.pattern-footer {
  padding-top: 1rem;
  border-top: 1px solid #333;
  text-align: right;
}

.view-pattern {
  color: #4CAF50;
  font-size: 0.9rem;
  font-weight: 500;
}
</style> 