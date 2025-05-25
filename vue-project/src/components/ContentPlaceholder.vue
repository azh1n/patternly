<template>
  <div class="content-placeholder">
    <slot>
      <div v-if="!hasSlotContent" class="placeholder-content">
        <div class="placeholder-text">
          <h2>{{ title }}</h2>
          <p v-if="description">{{ description }}</p>
          <p v-else>
            {{ defaultText }}
          </p>
        </div>
      </div>
    </slot>
  </div>
</template>

<script setup>
import { ref, useSlots, onMounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Loading Content'
  },
  description: {
    type: String,
    default: ''
  }
})

const slots = useSlots()
const hasSlotContent = ref(false)
const defaultText = 'Content is currently loading. Please wait a moment while we prepare your experience.'

onMounted(() => {
  // Check if slot has content
  hasSlotContent.value = !!slots.default
})
</script>

<style scoped>
.content-placeholder {
  width: 100%;
  min-height: 300px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.placeholder-content {
  max-width: 600px;
  text-align: center;
}

.placeholder-text h2 {
  margin-bottom: 1rem;
  color: var(--text-primary, #333);
}

.placeholder-text p {
  color: var(--text-secondary, #666);
  line-height: 1.6;
}

/* Dark/Light mode support */
@media (prefers-color-scheme: dark) {
  .placeholder-text h2 {
    color: var(--text-primary, #eee);
  }
  
  .placeholder-text p {
    color: var(--text-secondary, #aaa);
  }
}
</style> 