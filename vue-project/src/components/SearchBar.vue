<template>
  <div class="search-bar">
    <input 
      type="text" 
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      placeholder="Search your patterns..."
      class="search-input"
    />
    <span class="search-icon">🔍</span>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.search-bar {
  width: 100%;
  position: relative;
}

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

.search-input:focus {
  outline: none;
  border-color: #4CAF50;
  background-color: #333;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

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