<!-- Modal component for adding new knitting patterns -->
<template>
  <!-- Modal overlay with click-away functionality -->
  <div v-if="modelValue" class="modal-overlay" @click="$emit('update:modelValue', false)">
    <!-- Modal container that prevents click propagation -->
    <div class="modal" @click.stop>
      <!-- Modal header with title and close button -->
      <div class="modal-header">
        <h2>Add New Pattern</h2>
        <button @click="$emit('update:modelValue', false)" class="close-button">×</button>
      </div>
      <div class="modal-content">
        <!-- Pattern name input field -->
        <div class="form-group">
          <label for="patternName">Pattern Name</label>
          <input
            type="text"
            id="patternName"
            v-model="patternName"
            placeholder="Give your pattern a name..."
            class="pattern-name-input"
            required
          />
        </div>
        <!-- Pattern instructions textarea with character limit -->
        <div class="form-group">
          <label for="text">Pattern Instructions</label>
          <textarea
            v-model="patternText"
            @input="handleInput"
            :maxlength="MAX_CHARS"
            placeholder="Paste your pattern instructions here..."
            class="text-area"
          ></textarea>
        </div>

        <!-- Modal action buttons -->
        <div class="modal-actions">
          <div class="left-buttons">
            <button 
              @click="openTester"
              class="advanced-button"
              :disabled="!patternText"
            >
              Test Pattern Format
            </button>
          </div>
          <div class="right-buttons">
            <button @click="$emit('update:modelValue', false)" class="cancel-button">Cancel</button>
            <button 
              @click="savePattern"
              :disabled="isLoading || !patternText || !patternName"
              class="save-button"
            >
              {{ isLoading ? 'Saving...' : 'Save Pattern' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Pattern Notation Tester Modal -->
  <PatternNotationTester
    v-model="showNotationTester"
    :pattern-text="patternText"
    @close="closeNotationTester"
    @save="closeNotationTester"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import PatternNotationTester from './PatternNotationTester.vue'

// Component props
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true  // Controls modal visibility
  },
  isLoading: {
    type: Boolean,
    default: false  // Indicates saving state
  }
})

// Event emitters for modal control and pattern addition
const emit = defineEmits(['update:modelValue', 'pattern-added'])

// Constants and reactive state
const MAX_CHARS = 100000  // Maximum characters allowed in pattern instructions
const patternName = ref('')  // Stores pattern name input
const patternText = ref('')  // Stores pattern instructions input
const showNotationTester = ref(false)  // Controls notation tester modal visibility

// Reset form when modal is opened
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    patternName.value = ''
    patternText.value = ''
    showNotationTester.value = false
  }
})

// Handles textarea input with character limit enforcement
const handleInput = (event) => {
  const value = event.target.value
  if (value.length > MAX_CHARS) {
    patternText.value = value.slice(0, MAX_CHARS)
  } else {
    patternText.value = value
  }
}

// Open pattern tester
const openTester = () => {
  showNotationTester.value = true
}

// Close notation tester
const closeNotationTester = () => {
  showNotationTester.value = false
}

// Save the pattern
const savePattern = () => {
  emit('pattern-added', {
    name: patternName.value,
    content: patternText.value
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* Modal overlay styles - covers entire viewport */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* Modal container styles */
.modal {
  width: min(600px, 90%);
  background-color: var(--card-bg);
  border-radius: 16px;
  overflow-y: auto;
  max-height: 90vh;
}

:root.light .modal {
  background-color: #ffffff;
}

/* Modal header styles */
.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:root.light .modal-header {
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

:root.light .modal-header h2 {
  color: #333;
}

/* Close button styles */
.close-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.close-button:hover {
  color: var(--text-primary);
}

:root.light .close-button {
  color: #999;
}

:root.light .close-button:hover {
  color: #333;
}

/* Modal content styles */
.modal-content {
  padding: 1.5rem;
}

/* Form group styles */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
}

:root.light .form-group label {
  color: #333;
}

/* Pattern name input styles */
.pattern-name-input {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--input-border);
  border-radius: 12px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
}

:root.light .pattern-name-input {
  border: 2px solid #e0e0e0;
  background-color: #ffffff;
  color: #333;
}

.pattern-name-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

/* Pattern instructions textarea styles */
.text-area {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 2px solid var(--input-border);
  border-radius: 12px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  resize: vertical;
  transition: all 0.3s ease;
}

:root.light .text-area {
  border: 2px solid #e0e0e0;
  background-color: #ffffff;
  color: #333;
}

.text-area:focus {
  outline: none;
  border-color: var(--accent-color);
}

/* Modal action buttons container */
.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.left-buttons {
  display: flex;
  gap: 1rem;
}

.right-buttons {
  display: flex;
  gap: 1rem;
}

/* Cancel button styles */
.cancel-button {
  padding: 0.8rem 1.5rem;
  background-color: var(--button-bg);
  color: var(--button-text);
  border: 1px solid var(--button-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

:root.light .cancel-button {
  color: #333;
  border: 1px solid #e0e0e0;
}

.cancel-button:hover {
  background-color: var(--button-hover-bg);
}

/* Save button styles */
.save-button {
  padding: 0.8rem 1.5rem;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.save-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Advanced button styles */
.advanced-button {
  padding: 0.8rem 1.5rem;
  background-color: var(--button-bg);
  color: var(--accent-color);
  border: 1px solid var(--accent-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.advanced-button:hover:not(:disabled) {
  background-color: var(--accent-color);
  color: white;
}

.advanced-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: var(--button-border);
  color: var(--text-secondary);
}

/* Responsive styles for larger screens */
@media (min-width: 1024px) {
  .modal {
    max-width: 800px;
  }

  .modal-header {
    padding: 2rem;
  }

  .modal-header h2 {
    font-size: 2rem;
  }

  .modal-content {
    padding: 2rem;
  }

  .pattern-name-input,
  .text-area {
    font-size: 1.1rem;
    padding: 1.2rem;
  }

  .text-area {
    min-height: 300px;
  }

  .modal-actions {
    margin-top: 3rem;
  }
}
</style> 