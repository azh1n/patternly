<template>
  <div class="pattern-card" @click="handleClick">
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
      <div class="completion-info">
        <span class="completion-count">
          {{ completedRowsCount }} / {{ totalRows }} rows
        </span>
        <div class="completion-bar">
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

const props = defineProps({
  pattern: {
    type: Object,
    required: true
  }
})

const router = useRouter()

const totalRows = computed(() => {
  return props.pattern.content.split('\n')
    .filter(line => line.trim().startsWith('Row')).length
})

const completedRowsCount = computed(() => {
  if (!props.pattern.completedRows) return 0
  return Object.values(props.pattern.completedRows).filter(Boolean).length
})

const completionPercentage = computed(() => {
  const totalRows = Object.keys(props.pattern.completedRows || {}).length
  const completedRows = Object.values(props.pattern.completedRows || {}).filter(Boolean).length
  return totalRows ? Math.round((completedRows / totalRows) * 100) : 0
})

const handleClick = () => {
  router.push(`/pattern/${props.pattern.id}`)
}
</script>

<style scoped>
.pattern-card {
  background-color: #2a2a2a;
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #333;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.pattern-card:hover {
  transform: translateY(-4px);
  background-color: #333;
  border-color: #4CAF50;
}

.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.pattern-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #fff;
  flex: 1;
}

.pattern-date {
  font-size: 0.9rem;
  color: #666;
  white-space: nowrap;
}

.pattern-preview {
  font-size: 0.95rem;
  margin: 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #aaa;
  line-height: 1.5;
  flex: 1;
}

.pattern-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.completion-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.completion-count {
  font-size: 0.9rem;
  color: #888;
}

.completion-bar {
  width: 100px;
  height: 4px;
  background-color: #333;
  border-radius: 2px;
  overflow: hidden;
}

.completion-progress {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.view-pattern {
  color: #4CAF50;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

.pattern-card:hover .view-pattern {
  color: #81C784;
}

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