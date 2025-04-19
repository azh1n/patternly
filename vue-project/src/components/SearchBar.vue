<!-- Search bar component with two-way binding for pattern search -->
<template>
  <!-- Search container with input and icon -->
  <div class="search-bar">
    <input 
      type="text" 
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      placeholder="Search your patterns..."
      class="search-input"
    />
    <!-- Search icon indicator -->
    <span class="search-icon">🔍</span>
  </div>
</template>

<script setup>
// Component props for v-model binding
defineProps({
  modelValue: {
    type: String,
    required: true  // Current search query value
  }
})

// Event emitter for v-model updates
defineEmits(['update:modelValue'])
</script>

<style scoped>
/* Search bar container styles */
.search-bar {
  width: 100%;
  position: relative;
}

/* Search input field styles */
.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid #333;
  border-radius: 12px;
  background-color: #2a2a2a;
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
}

/* Input focus state styles */
.search-input:focus {
  outline: none;
  border-color: #4CAF50;
  background-color: #333;
}

/* Search icon positioning and styles */
.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

/* Desktop responsive styles */
@media (min-width: 1024px) {
  .search-input {
    font-size: 1.1rem;
    padding: 1.2rem 1.2rem 1.2rem 3.5rem;
  }

  .search-icon {
    font-size: 1.3rem;
    left: 1.2rem;
  }
}
</style> 