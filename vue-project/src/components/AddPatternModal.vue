<template>
  <div v-if="modelValue" class="modal-overlay" @click="$emit('update:modelValue', false)">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>Add New Pattern</h2>
        <button @click="$emit('update:modelValue', false)" class="close-button">×</button>
      </div>
      <div class="modal-content">
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

        <div class="modal-actions">
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
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const MAX_CHARS = 100000
const patternName = ref('')
const patternText = ref('')

const handleInput = (event) => {
  if (event.target.value.length <= MAX_CHARS) {
    patternText.value = event.target.value
  }
}

const savePattern = () => {
  emit('save', {
    name: patternName.value,
    content: patternText.value
  })
  patternName.value = ''
  patternText.value = ''
}
</script>

<style scoped>
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

.modal {
  width: min(600px, 90%);
  background-color: #2a2a2a;
  border-radius: 16px;
  overflow-y: auto;
  max-height: 90vh;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.close-button {
  background: none;
  border: none;
  color: #666;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.close-button:hover {
  color: #fff;
}

.modal-content {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #fff;
  font-weight: 500;
}

.pattern-name-input {
  width: 100%;
  padding: 1rem;
  border: 2px solid #333;
  border-radius: 12px;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.pattern-name-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.text-area {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 2px solid #333;
  border-radius: 12px;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 1rem;
  resize: vertical;
  transition: all 0.3s ease;
}

.text-area:focus {
  outline: none;
  border-color: #4CAF50;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-button {
  padding: 0.8rem 1.5rem;
  background-color: transparent;
  color: #fff;
  border: 1px solid #333;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background-color: #333;
}

.save-button {
  padding: 0.8rem 1.5rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.save-button:hover:not(:disabled) {
  background-color: #45a049;
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

  .cancel-button,
  .save-button {
    padding: 1rem 2.5rem;
    font-size: 1.1rem;
  }
}
</style> 