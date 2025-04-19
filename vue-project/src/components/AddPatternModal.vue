<!--
  AddPatternModal.vue
  Modal component for adding new patterns to the collection.
  
  Features:
  - Pattern name and content input
  - Form validation
  - Error handling
  - Responsive design
  - Loading states
  - Keyboard navigation
  - Focus management
-->
<template>
  <div 
    class="modal-overlay" 
    v-if="isOpen"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    @keydown.escape="closeModal"
  >
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2 id="modal-title">Add New Pattern</h2>
        <button 
          @click="closeModal" 
          class="close-button"
          aria-label="Close modal"
          @keydown.enter="closeModal"
        >
          <font-awesome-icon icon="times" aria-hidden="true" />
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="pattern-form">
        <!-- Name Input -->
        <div class="form-group">
          <label for="pattern-name">Pattern Name</label>
          <div class="input-wrapper">
            <font-awesome-icon icon="tag" class="input-icon" aria-hidden="true" />
            <input
              id="pattern-name"
              v-model="patternName"
              type="text"
              placeholder="Enter pattern name..."
              :class="{ 'error': nameError }"
              aria-invalid="nameError"
              aria-describedby="name-error"
              @keydown.enter.prevent="handleSubmit"
              ref="nameInput"
            />
          </div>
          <span v-if="nameError" id="name-error" class="error-message">
            {{ nameError }}
          </span>
        </div>

        <!-- Content Input -->
        <div class="form-group">
          <label for="pattern-content">Pattern Content</label>
          <div class="input-wrapper">
            <font-awesome-icon icon="file-alt" class="input-icon" aria-hidden="true" />
            <textarea
              id="pattern-content"
              v-model="patternContent"
              placeholder="Enter pattern content..."
              :class="{ 'error': contentError }"
              aria-invalid="contentError"
              aria-describedby="content-error"
              @keydown.ctrl.enter.prevent="handleSubmit"
              ref="contentInput"
            ></textarea>
          </div>
          <span v-if="contentError" id="content-error" class="error-message">
            {{ contentError }}
          </span>
        </div>

        <!-- Status Message -->
        <div 
          v-if="statusMessage" 
          class="status-message"
          :class="{ 'error': isError }"
          role="alert"
          aria-live="polite"
        >
          {{ statusMessage }}
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button 
            type="button" 
            @click="closeModal"
            class="cancel-button"
            @keydown.enter="closeModal"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="submit-button"
            :disabled="isLoading"
            @keydown.enter="handleSubmit"
          >
            <span v-if="isLoading">Adding...</span>
            <span v-else>Add Pattern</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * Imports
 */
import { ref, computed, onMounted, watch } from 'vue'
import { db } from '../firebase'
import { collection, addDoc } from 'firebase/firestore'
import { useAuth } from '../composables/useAuth'

/**
 * Props
 */
const props = defineProps({
  /** Whether the modal is open */
  isOpen: {
    type: Boolean,
    required: true
  }
})

/**
 * Emits
 */
const emit = defineEmits(['close', 'pattern-added'])

/**
 * Auth Setup
 */
const { user } = useAuth()

/**
 * Refs
 */
const nameInput = ref(null)
const contentInput = ref(null)

/**
 * State
 */
const patternName = ref('')
const patternContent = ref('')
const isLoading = ref(false)
const statusMessage = ref('')
const isError = ref(false)
const nameError = ref('')
const contentError = ref('')

/**
 * Computed Properties
 */

/**
 * Validates the pattern name
 * @returns {boolean} Whether the name is valid
 */
const isNameValid = computed(() => {
  return patternName.value.trim().length > 0
})

/**
 * Validates the pattern content
 * @returns {boolean} Whether the content is valid
 */
const isContentValid = computed(() => {
  return patternContent.value.trim().length > 0
})

/**
 * Methods
 */

/**
 * Closes the modal and resets the form
 */
const closeModal = () => {
  resetForm()
  emit('close')
}

/**
 * Resets the form state
 */
const resetForm = () => {
  patternName.value = ''
  patternContent.value = ''
  nameError.value = ''
  contentError.value = ''
  statusMessage.value = ''
  isError.value = false
}

/**
 * Validates the form inputs
 * @returns {boolean} Whether the form is valid
 */
const validateForm = () => {
  let isValid = true

  if (!isNameValid.value) {
    nameError.value = 'Please enter a pattern name'
    isValid = false
  } else {
    nameError.value = ''
  }

  if (!isContentValid.value) {
    contentError.value = 'Please enter pattern content'
    isValid = false
  } else {
    contentError.value = ''
  }

  return isValid
}

/**
 * Handles form submission
 */
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    isLoading.value = true
    statusMessage.value = 'Adding pattern...'
    isError.value = false

    const patternData = {
      name: patternName.value.trim(),
      content: patternContent.value.trim(),
      userId: user.value.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const docRef = await addDoc(collection(db, 'patterns'), patternData)
    
    statusMessage.value = 'Pattern added successfully'
    emit('pattern-added', { id: docRef.id, ...patternData })
    closeModal()
  } catch (error) {
    console.error('Error adding pattern:', error)
    statusMessage.value = 'Error adding pattern. Please try again.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

/**
 * Watchers
 */
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    // Focus the name input when modal opens
    setTimeout(() => {
      nameInput.value?.focus()
    }, 100)
  }
})
</script>

<style scoped>
/* ===== Modal Overlay ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* ===== Modal Content ===== */
.modal-content {
  width: 100%;
  max-width: 600px;
  background-color: var(--card-bg);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* ===== Header Styles ===== */
.modal-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.close-button {
  padding: var(--spacing-sm);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.close-button:hover,
.close-button:focus {
  color: var(--text-primary);
  transform: scale(1.1);
}

/* ===== Form Styles ===== */
.pattern-form {
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
  font-weight: 500;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

input,
textarea {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) var(--spacing-xl);
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius-md);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
  outline: none;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

input.error,
textarea.error {
  border-color: var(--error-color);
}

.error-message {
  display: block;
  margin-top: var(--spacing-sm);
  color: var(--error-color);
  font-size: 0.9rem;
}

textarea {
  min-height: 200px;
  resize: vertical;
  font-family: monospace;
}

/* ===== Status Message ===== */
.status-message {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  text-align: center;
  font-size: 0.9rem;
}

.status-message.error {
  background-color: var(--error-bg);
  color: var(--error-color);
}

/* ===== Form Actions ===== */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.cancel-button,
.submit-button {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--border-radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.cancel-button {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.cancel-button:hover,
.cancel-button:focus {
  background-color: var(--hover-bg);
  border-color: var(--text-secondary);
}

.submit-button {
  background-color: var(--accent-color);
  border: none;
  color: white;
}

.submit-button:hover:not(:disabled),
.submit-button:focus:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Responsive Styles ===== */
@media (max-width: 640px) {
  .modal-content {
    margin: var(--spacing-md);
  }

  .modal-header {
    padding: var(--spacing-md);
  }

  .pattern-form {
    padding: var(--spacing-md);
  }

  .form-actions {
    flex-direction: column;
  }

  .cancel-button,
  .submit-button {
    width: 100%;
  }
}
</style> 