<!-- Pattern Edit Modal Component -->
<template>
  <div v-if="modelValue" class="pattern-edit-modal-overlay" @click="closeModal">
    <div class="pattern-edit-modal" @click.stop>
      <div class="modal-header">
        <h2>Edit Pattern</h2>
        <button class="close-button" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Pattern Name -->
        <div class="form-group">
          <label for="patternName">Pattern Name</label>
          <input
            type="text"
            id="patternName"
            v-model="editedPattern.name"
            placeholder="Enter pattern name"
            class="form-input"
          />
        </div>
        
        <!-- Row Notes Editor -->
        <div class="form-group">
          <h3 class="section-title">Row Notes</h3>
          <div v-if="Object.keys(parsedRows).length === 0" class="no-rows-message">
            Save pattern content first to edit row notes
          </div>
          <div v-else class="row-notes-container">
            <div 
              v-for="row in parsedRows" 
              :key="row.rowNum" 
              class="row-note-item"
            >
              <div class="row-note-header">
                <span class="row-label">Row {{ row.rowNum }} ({{ row.color }})</span>
              </div>
              <textarea
                v-model="editedRowNotes[`row${row.rowNum}`]"
                :placeholder="`Add notes for Row ${row.rowNum}...`"
                class="row-note-textarea"
                maxlength="500"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Pattern Content -->
        <div class="form-group">
          <label for="patternContent">Pattern Content</label>
          <textarea
            id="patternContent"
            v-model="editedPattern.content"
            placeholder="Enter pattern content"
            class="form-textarea"
            rows="8"
          ></textarea>
          <div class="helper-text">
            Format each row as: Row {X} Color {Y}, Stitches: {pattern}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button @click="savePattern" class="save-button">
            Save Changes
          </button>
          <button @click="closeModal" class="cancel-button">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase'

// Props and emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  pattern: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'pattern-updated'])

// Reactive state for edited pattern
const editedPattern = ref({
  name: '',
  content: '',
})

// Store row notes separately
const editedRowNotes = ref({})

// Parse rows to get the structure for row notes
const parsedRows = computed(() => {
  if (!editedPattern.value.content) return []
  
  try {
    const content = editedPattern.value.content
    
    // Check if this is the new format (comma-separated "Row: X, Color: Y, Stitches: Z" format)
    if (content.includes('Row:') && content.includes('Color:') && content.includes('Stitches:')) {
      return parseFormattedPattern(content)
    }
    
    // Legacy format parsing
    const rows = content.split('\n').filter(row => row?.trim())
    const parsedRows = []
    
    let currentRowNum = null
    let currentColor = null
    let currentPattern = ''
    
    for (const row of rows) {
      const trimmed = row.trim()
      
      // Check if this is a row marker line (Row X Color)
      const rowMatch = trimmed.match(/^Row\s+(\d+)\s+([\w\s]+)$/i)
      
      if (rowMatch) {
        // If we have collected pattern data from previous row, save it
        if (currentRowNum && currentPattern) {
          parsedRows.push({
            rowNum: String(currentRowNum),
            color: currentColor || 'No color',
            pattern: currentPattern
          })
        }
        
        // Start a new row
        currentRowNum = rowMatch[1]
        currentColor = rowMatch[2].trim()
        currentPattern = ''
      } else if (currentRowNum) {
        // This is pattern data for the current row
        if (currentPattern) currentPattern += ' '
        currentPattern += trimmed
      }
    }
    
    // Save the last row if there's data
    if (currentRowNum && currentPattern) {
      parsedRows.push({
        rowNum: String(currentRowNum),
        color: currentColor || 'No color',
        pattern: currentPattern
      })
    }
    
    return parsedRows
  } catch (error) {
    console.error('Error parsing pattern:', error)
    return []
  }
})

// Parse the new formatted pattern
const parseFormattedPattern = (content) => {
  try {
    // Split by rows if separated by commas followed by "Row:"
    const rowEntries = content.split(/,\s*Row:/)
    
    // For the first entry, we need to clean up the "Row:" prefix
    let firstEntry = rowEntries[0]
    if (rowEntries.length > 0 && firstEntry.startsWith('Row:')) {
      firstEntry = firstEntry.replace(/^Row:/, '').trim()
      rowEntries[0] = firstEntry
    }
    
    const parsedRows = rowEntries.map((entry, index) => {
      // Add "Row:" back for consistent parsing if needed
      const fullEntry = index === 0 ? entry : `Row:${entry.startsWith(' ') ? entry : ` ${entry}`}`
      
      // Extract row number - special handling for first entry since "Row:" was removed
      let rowNum
      if (index === 0) {
        // First entry special handling - format should be "53, Color: A, Stitches: ..."
        const firstRowMatch = fullEntry.match(/^(\d+)/)
        rowNum = firstRowMatch ? String(firstRowMatch[1]) : '0'
      } else {
        // Other entries should have "Row:" which was added back
        const rowMatch = fullEntry.match(/Row:\s*(\d+)/)
        rowNum = rowMatch ? String(rowMatch[1]) : '0'
      }
      
      // Extract color
      const colorMatch = fullEntry.match(/Color:\s*([^,]*)/)
      const color = colorMatch ? colorMatch[1].trim() : 'No color'
      
      // Extract stitches section
      const stitchesMatch = fullEntry.match(/Stitches:\s*(.*?)(?:$|,\s*Row:)/)
      const stitchesText = stitchesMatch ? stitchesMatch[1].trim() : ''
      
      return {
        rowNum,
        color,
        pattern: stitchesText
      }
    })
    
    return parsedRows
  } catch (error) {
    console.error('Error parsing formatted pattern:', error)
    return []
  }
}

// When the modal opens, initialize the edited pattern
watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.pattern) {
    editedPattern.value = {
      name: props.pattern.name || '',
      content: props.pattern.content || ''
    }
    
    // Initialize row notes
    editedRowNotes.value = { ...(props.pattern.rowNotes || {}) }
  }
})

// Close the modal
const closeModal = () => {
  emit('update:modelValue', false)
}

// Save the pattern
const savePattern = async () => {
  try {
    if (!props.pattern.id) {
      closeModal()
      return
    }

    // Update the pattern in the database
    await updateDoc(doc(db, 'patterns', props.pattern.id), {
      name: editedPattern.value.name,
      content: editedPattern.value.content,
      rowNotes: editedRowNotes.value,
      updatedAt: new Date()
    })

    // Emit event to parent component
    emit('pattern-updated', {
      ...props.pattern,
      name: editedPattern.value.name,
      content: editedPattern.value.content,
      rowNotes: editedRowNotes.value
    })
    
    // Close the modal
    closeModal()
  } catch (error) {
    console.error('Error updating pattern:', error)
    alert('Failed to update pattern. Please try again.')
  }
}
</script>

<style scoped>
.pattern-edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.pattern-edit-modal {
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.75rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-button:hover {
  color: var(--text-primary);
}

/* Modal Body */
.modal-body {
  padding: 1.5rem;
}

/* Form Elements */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent-color);
}

.helper-text {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Row Notes Section */
.section-title {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.no-rows-message {
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  color: var(--text-secondary);
  text-align: center;
}

.row-notes-container {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.row-note-item {
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.row-note-header {
  padding: 0.5rem 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}

.row-label {
  font-weight: 500;
  color: var(--text-primary);
}

.row-note-textarea {
  width: 100%;
  padding: 0.75rem;
  border: none;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
}

.row-note-textarea:focus {
  outline: none;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.save-button,
.cancel-button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-button {
  background-color: var(--accent-color);
  color: white;
  border: none;
}

.save-button:hover {
  opacity: 0.9;
}

.cancel-button {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.cancel-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Responsive styles */
@media (max-width: 767px) {
  .pattern-edit-modal {
    width: 95%;
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .modal-header h2 {
    font-size: 1.3rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  .row-notes-container {
    max-height: 250px;
  }
  
  .row-note-textarea {
    min-height: 60px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .save-button,
  .cancel-button {
    width: 100%;
    padding: 0.85rem;
    font-size: 1rem;
  }
}
</style> 