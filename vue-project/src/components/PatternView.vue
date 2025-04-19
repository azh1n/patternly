<!--
  PatternView.vue
  Displays a detailed view of a single pattern with editing capabilities.
  
  Features:
  - Pattern content display and editing
  - Real-time content updates
  - Pattern deletion
  - Responsive layout
  - Loading and error states
  - Auto-save functionality
  - Keyboard shortcuts
-->
<template>
  <div class="pattern-view" v-if="pattern">
    <!-- Header Section -->
    <div class="pattern-header">
      <h1 class="pattern-title">{{ pattern.name }}</h1>
      <div class="pattern-actions">
        <button 
          @click="handleSave" 
          class="save-button"
          :disabled="!hasChanges || isLoading"
          aria-label="Save changes"
        >
          <font-awesome-icon icon="save" class="action-icon" aria-hidden="true" />
          <span v-if="isLoading">Saving...</span>
          <span v-else>Save Changes</span>
        </button>
        <button 
          @click="handleDelete" 
          class="delete-button"
          :disabled="isLoading"
          aria-label="Delete pattern"
        >
          <font-awesome-icon icon="trash" class="action-icon" aria-hidden="true" />
          Delete
        </button>
      </div>
    </div>

    <!-- Content Section -->
    <div class="pattern-content">
      <textarea
        v-model="editedContent"
        class="content-editor"
        :placeholder="'Enter your pattern content here...'"
        @input="handleContentChange"
        @keydown.ctrl.s.prevent="handleSave"
        aria-label="Pattern content"
        :disabled="isLoading"
      ></textarea>
    </div>

    <!-- Status Messages -->
    <div 
      v-if="statusMessage" 
      class="status-message"
      :class="{ 'error': isError }"
      role="alert"
      aria-live="polite"
    >
      {{ statusMessage }}
    </div>
  </div>

  <!-- Loading State -->
  <div 
    v-else-if="isLoading" 
    class="loading-state"
    role="status"
    aria-live="polite"
  >
    <div class="loading-spinner" aria-hidden="true"></div>
    <p>Loading pattern...</p>
  </div>

  <!-- Error State -->
  <div 
    v-else 
    class="error-state"
    role="alert"
    aria-live="polite"
  >
    <font-awesome-icon icon="exclamation-circle" class="error-icon" aria-hidden="true" />
    <h2>Pattern Not Found</h2>
    <p>The requested pattern could not be loaded.</p>
  </div>
</template>

<script setup>
/**
 * Imports
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase'
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../composables/useAuth'

/**
 * Props
 */
const props = defineProps({
  /** Initial pattern data */
  initialPattern: {
    type: Object,
    required: true
  }
})

/**
 * Emits
 */
const emit = defineEmits(['pattern-updated', 'pattern-deleted'])

/**
 * Router and Auth Setup
 */
const route = useRoute()
const router = useRouter()
const { user } = useAuth()

/**
 * State
 */
const pattern = ref(props.initialPattern)
const editedContent = ref('')
const isLoading = ref(false)
const statusMessage = ref('')
const isError = ref(false)
const hasChanges = ref(false)
const autoSaveTimeout = ref(null)

/**
 * Computed Properties
 */

/**
 * Gets the pattern document reference
 * @returns {Object} Firestore document reference
 */
const patternRef = computed(() => {
  return doc(db, 'users', user.value.uid, 'patterns', pattern.value.id)
})

/**
 * Methods
 */

/**
 * Handles content changes and triggers auto-save
 */
const handleContentChange = () => {
  hasChanges.value = true
  clearTimeout(autoSaveTimeout.value)
  autoSaveTimeout.value = setTimeout(saveChanges, 2000)
}

/**
 * Saves pattern changes to Firestore
 */
const saveChanges = async () => {
  try {
    isLoading.value = true
    statusMessage.value = 'Saving changes...'
    isError.value = false

    await updateDoc(patternRef.value, {
      content: editedContent.value,
      updatedAt: new Date()
    })

    pattern.value.content = editedContent.value
    hasChanges.value = false
    statusMessage.value = 'Changes saved successfully'
    emit('pattern-updated', pattern.value)
  } catch (error) {
    console.error('Error saving pattern:', error)
    statusMessage.value = 'Error saving changes. Please try again.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

/**
 * Handles pattern deletion
 */
const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this pattern?')) return

  try {
    isLoading.value = true
    statusMessage.value = 'Deleting pattern...'
    isError.value = false

    await deleteDoc(patternRef.value)
    emit('pattern-deleted', pattern.value.id)
    router.push('/')
  } catch (error) {
    console.error('Error deleting pattern:', error)
    statusMessage.value = 'Error deleting pattern. Please try again.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

/**
 * Lifecycle Hooks
 */
onMounted(() => {
  editedContent.value = pattern.value.content
})

onBeforeUnmount(() => {
  clearTimeout(autoSaveTimeout.value)
})
</script>

<style scoped>
/* ===== Layout Styles ===== */
.pattern-view {
  width: 100%;
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

/* ===== Header Styles ===== */
.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
}

.pattern-title {
  margin: 0;
  font-size: 2rem;
  color: var(--text-primary);
}

.pattern-actions {
  display: flex;
  gap: var(--spacing-md);
}

/* ===== Button Styles ===== */
.save-button,
.delete-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--border-radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-button {
  background-color: var(--accent-color);
  color: white;
  border: none;
}

.save-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-button {
  background-color: transparent;
  color: var(--error-color);
  border: 1px solid var(--error-color);
}

.delete-button:hover:not(:disabled) {
  background-color: var(--error-bg);
  transform: translateY(-1px);
}

.delete-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  font-size: 1.2rem;
}

/* ===== Content Styles ===== */
.pattern-content {
  flex: 1;
  min-height: 400px;
}

.content-editor {
  width: 100%;
  height: 100%;
  min-height: 400px;
  padding: var(--spacing-lg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.3s ease;
  font-family: monospace;
}

.content-editor:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

.content-editor:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ===== Status Message Styles ===== */
.status-message {
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  font-size: 0.9rem;
  text-align: center;
}

.status-message.error {
  background-color: var(--error-bg);
  color: var(--error-color);
}

/* ===== Loading State ===== */
.loading-state {
  text-align: center;
  padding: var(--spacing-xl);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto var(--spacing-md);
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Error State ===== */
.error-state {
  text-align: center;
  padding: var(--spacing-xl);
}

.error-icon {
  font-size: 3rem;
  color: var(--error-color);
  margin-bottom: var(--spacing-lg);
}

.error-state h2 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-size: 1.5rem;
}

.error-state p {
  color: var(--text-secondary);
  margin: 0;
}

/* ===== Responsive Styles ===== */
@media (max-width: 768px) {
  .pattern-view {
    padding: var(--spacing-lg);
  }

  .pattern-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .pattern-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .pattern-title {
    font-size: 1.5rem;
  }

  .content-editor {
    min-height: 300px;
  }
}
</style> 