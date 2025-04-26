<template>
  <!-- Row Edit Modal -->
  <div v-if="modelValue" class="row-edit-modal-overlay" @click="closeModal">
    <div class="row-edit-modal" @click.stop>
      <div class="modal-header">
        <h2>Edit Row {{ row ? row.number : '' }}</h2>
        <button class="close-button" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Row Number -->
        <div class="form-group">
          <label for="editRowNumber">Row Number</label>
          <input
            type="number"
            id="editRowNumber"
            v-model.number="editRowNumber"
            class="form-input"
          />
        </div>

        <!-- Row Color -->
        <div class="form-group">
          <label for="editRowColor">Color (optional)</label>
          <input
            type="text"
            id="editRowColor"
            v-model="editRowColor"
            placeholder="e.g., A, MC, Red"
            class="form-input"
          />
        </div>

        <!-- Row Stitches -->
        <div class="form-group">
          <label for="editRowStitches">Stitches</label>
          <div v-if="!hasRepeatedStitches" class="stitch-edit-container">
            <input
              type="text"
              id="editRowStitches"
              v-model="editRowStitchesText"
              placeholder="e.g., 1sc, 2dc, 1inc"
              class="form-input"
            />
          </div>
          <div v-else class="repeat-stitch-edit-container">
            <div class="form-group">
              <label>Before Repeat (optional)</label>
              <input
                type="text"
                v-model="editRowBeforeRepeat"
                placeholder="e.g., 1sc, 2dc"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Repeated Stitches</label>
              <input
                type="text"
                v-model="editRowRepeatedStitches"
                placeholder="e.g., 1sc, 1inc"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Repeat Count</label>
              <input
                type="number"
                v-model.number="editRowRepeatCount"
                min="1"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>After Repeat (optional)</label>
              <input
                type="text"
                v-model="editRowAfterRepeat"
                placeholder="e.g., 1sc, 2dc"
                class="form-input"
              />
            </div>
          </div>
          <div class="repeat-toggle">
            <label>
              <input type="checkbox" v-model="hasRepeatedStitches" />
              This row has repeated stitches
            </label>
          </div>
        </div>

        <!-- Original Text -->
        <div class="form-group">
          <label>Original Text (for reference)</label>
          <div class="original-text">{{ row ? row.text : '' }}</div>
        </div>

        <!-- Preview -->
        <div class="form-group">
          <label>Preview</label>
          <div class="edit-preview">
            <div class="preview-row">
              <div class="preview-row-header">
                <span class="preview-row-number">Row {{ editRowNumber }}</span>
                <div v-if="editRowColor" class="color-indicator" :style="{ backgroundColor: getColorHex(editRowColor) }">{{ editRowColor }}</div>
              </div>
              <div class="preview-row-content">
                <div v-if="!hasRepeatedStitches" class="preview-stitches">
                  <template v-for="(stitch, i) in previewEditedStitches" :key="i">
                    <div 
                      class="preview-stitch" 
                      :class="getStitchClass(stitch)"
                      :title="stitch"
                    >
                      <span class="stitch-count">{{ getStitchCount(stitch) }}</span>
                      <span class="stitch-type">{{ getStitchType(stitch) }}</span>
                    </div>
                  </template>
                </div>
                <div v-else class="preview-stitches">
                  <!-- Show stitches before the repeat -->
                  <template v-for="(stitch, i) in previewBeforeRepeat" :key="`before-${i}`">
                    <div 
                      class="preview-stitch" 
                      :class="getStitchClass(stitch)"
                      :title="stitch"
                    >
                      <span class="stitch-count">{{ getStitchCount(stitch) }}</span>
                      <span class="stitch-type">{{ getStitchType(stitch) }}</span>
                    </div>
                  </template>
                  
                  <!-- Show the repeat group -->
                  <div class="repeat-group">
                    <span class="repeat-bracket left-bracket">(</span>
                    
                    <template v-for="(stitch, i) in previewRepeatedStitches" :key="`rep-${i}`">
                      <div 
                        class="preview-stitch" 
                        :class="getStitchClass(stitch)"
                        :title="stitch"
                      >
                        <span class="stitch-count">{{ getStitchCount(stitch) }}</span>
                        <span class="stitch-type">{{ getStitchType(stitch) }}</span>
                      </div>
                    </template>
                    
                    <span class="repeat-bracket right-bracket">)</span>
                    <span class="repeat-count">x{{ editRowRepeatCount }}</span>
                  </div>
                  
                  <!-- Show stitches after the repeat -->
                  <template v-for="(stitch, i) in previewAfterRepeat" :key="`after-${i}`">
                    <div 
                      class="preview-stitch" 
                      :class="getStitchClass(stitch)"
                      :title="stitch"
                    >
                      <span class="stitch-count">{{ getStitchCount(stitch) }}</span>
                      <span class="stitch-type">{{ getStitchType(stitch) }}</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button @click="saveRowEdit" class="save-button">Save Changes</button>
          <button @click="closeModal" >Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Props and emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  row: {
    type: Object,
    default: null
  },
  isNewRow: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

// Form state
const editRowNumber = ref(0)
const editRowColor = ref('')
const editRowStitchesText = ref('')
const hasRepeatedStitches = ref(false)
const editRowBeforeRepeat = ref('')
const editRowRepeatedStitches = ref('')
const editRowRepeatCount = ref(1)
const editRowAfterRepeat = ref('')

// Initialize form when modal opens or row changes
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.row) {
    initializeForm()
  }
})

watch(() => props.row, (newVal) => {
  if (newVal && props.modelValue) {
    initializeForm()
  }
})

// Initialize form with row data
const initializeForm = () => {
  if (!props.row && !props.isNewRow) return
  
  if (props.isNewRow) {
    // Set defaults for new row
    editRowNumber.value = props.row?.number || 1
    editRowColor.value = ''
    editRowStitchesText.value = ''
    hasRepeatedStitches.value = false
    editRowBeforeRepeat.value = ''
    editRowRepeatedStitches.value = ''
    editRowRepeatCount.value = 1
    editRowAfterRepeat.value = ''
  } else {
    // Set values from existing row
    editRowNumber.value = props.row.number
    editRowColor.value = props.row.color || ''
    
    // Check if this row has repeated stitches
    if (props.row.stitches && props.row.stitches.repeated) {
      hasRepeatedStitches.value = true
      
      // Set up repeat fields
      const beforeRepeat = Array.isArray(props.row.stitches.beforeRepeat) 
        ? props.row.stitches.beforeRepeat.join(', ') 
        : ''
      
      const repeatedStitches = Array.isArray(props.row.stitches.repeatedStitches) 
        ? props.row.stitches.repeatedStitches.join(', ') 
        : ''
      
      const afterRepeat = Array.isArray(props.row.stitches.afterRepeat) 
        ? props.row.stitches.afterRepeat.join(', ') 
        : ''
      
      editRowBeforeRepeat.value = beforeRepeat
      editRowRepeatedStitches.value = repeatedStitches
      editRowRepeatCount.value = props.row.stitches.repeatCount || 1
      editRowAfterRepeat.value = afterRepeat
      
      // Clear the non-repeated field
      editRowStitchesText.value = ''
    } else {
      hasRepeatedStitches.value = false
      
      // Set up non-repeated stitches field
      editRowStitchesText.value = Array.isArray(props.row.stitches) 
        ? props.row.stitches.join(', ') 
        : ''
      
      // Clear the repeat fields
      editRowBeforeRepeat.value = ''
      editRowRepeatedStitches.value = ''
      editRowRepeatCount.value = 1
      editRowAfterRepeat.value = ''
    }
  }
}

// Close the modal
const closeModal = () => {
  emit('update:modelValue', false)
}

// Parse a comma-separated string of stitches into an array
const parseStitchesString = (stitchesStr) => {
  if (!stitchesStr.trim()) return []
  
  return stitchesStr.split(',').map(s => s.trim()).filter(Boolean)
}

// Computed properties for the edit preview
const previewEditedStitches = computed(() => {
  return parseStitchesString(editRowStitchesText.value)
})

const previewBeforeRepeat = computed(() => {
  return parseStitchesString(editRowBeforeRepeat.value)
})

const previewRepeatedStitches = computed(() => {
  return parseStitchesString(editRowRepeatedStitches.value)
})

const previewAfterRepeat = computed(() => {
  return parseStitchesString(editRowAfterRepeat.value)
})

// Save the row edit
const saveRowEdit = () => {
  // Create updated row object
  let updatedRow = {
    number: editRowNumber.value,
    color: editRowColor.value,
    text: props.row?.text || `Row ${editRowNumber.value}` // Basic text representation
  }
  
  // Update stitches based on edit mode
  if (hasRepeatedStitches.value) {
    updatedRow.stitches = {
      repeated: true,
      beforeRepeat: previewBeforeRepeat.value,
      repeatedStitches: previewRepeatedStitches.value,
      afterRepeat: previewAfterRepeat.value,
      repeatCount: editRowRepeatCount.value
    }
  } else {
    updatedRow.stitches = previewEditedStitches.value
  }
  
  // Emit the updated row
  emit('save', updatedRow)
  
  // Close the modal
  closeModal()
}

// Helper methods for stitch display
const getStitchCount = (stitch) => {
  // Extract the count from stitch notation (e.g., "3sc" -> "3")
  const match = stitch.match(/^(\d+)/)
  return match ? match[1] : '1'
}

const getStitchType = (stitch) => {
  // Extract the stitch type from notation (e.g., "3sc" -> "sc")
  const match = stitch.match(/\D+$/)
  return match ? match[0] : stitch
}

const getStitchClass = (stitch) => {
  // Return a CSS class based on stitch type
  const type = getStitchType(stitch)
  return {
    'stitch-sc': type.includes('sc'),
    'stitch-dc': type.includes('dc'),
    'stitch-hdc': type.includes('hdc'),
    'stitch-tr': type.includes('tr'),
    'stitch-dtr': type.includes('dtr'),
    'stitch-ch': type.includes('ch'),
    'stitch-sl': type.includes('sl'),
    'stitch-inc': type === 'inc',
    'stitch-dec': type === 'dec',
    'stitch-bs': type.includes('bs'),
    'stitch-ns': type.includes('ns')
  }
}

const getColorHex = (color) => {
  // First check for exact color name matches
  const colorMap = {
    // Color names
    'Red': '#ff5252',
    'Green': '#4caf50',
    'Blue': '#2196f3',
    'Yellow': '#ffc107',
    'Purple': '#9c27b0',
    'Orange': '#ff9800',
    'Pink': '#e91e63',
    'Turquoise': '#00bcd4',
    'Black': '#333333',
    'White': '#ffffff',
    'Brown': '#795548',
    'Gray': '#607d8b',
    
    // Letter-based colors
    'A': '#ff5252', // Red
    'B': '#4caf50', // Green
    'C': '#2196f3', // Blue
    'D': '#ffc107', // Yellow
    'E': '#9c27b0', // Purple
    'F': '#ff9800', // Orange
    'MC': '#333333', // Main Color (dark)
    'CC': '#e91e63', // Contrast Color (pink)
    'CC1': '#e91e63', // Contrast Color 1
    'CC2': '#00bcd4'  // Contrast Color 2
  }
  
  // First check for exact matches
  if (colorMap[color]) {
    return colorMap[color]
  }
  
  // Then check for partial matches
  for (const [key, value] of Object.entries(colorMap)) {
    if (color.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }
  
  // If no match found, return default gray
  return '#888888'
}
</script>

<style scoped>
/* Modal Overlay */
.row-edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
  padding: 1rem;
  backdrop-filter: blur(3px);
}

.row-edit-modal {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--card-bg, #2a2a2a);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #444);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary, #fff);
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: var(--text-secondary, #aaa);
  font-size: 1.75rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-button:hover {
  color: var(--text-primary, #fff);
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
  color: var(--text-primary, #fff);
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  background: var(--input-bg, #333);
  color: var(--text-primary, #fff);
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-color, #4f87ff);
}

.stitch-edit-container,
.repeat-stitch-edit-container {
  margin-bottom: 0.5rem;
}

.repeat-toggle {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
}

.repeat-toggle label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.original-text {
  padding: 0.75rem;
  background: var(--input-bg, #333);
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  color: var(--text-secondary, #aaa);
  font-style: italic;
}

.edit-preview {
  margin-top: 0.5rem;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color, #444);
}

.save-button,
.cancel-button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.save-button {
  background-color: var(--success-color, #28a745);
  color: white;
  border: none;
}

.save-button:hover:not(:disabled) {
  background-color: var(--success-hover, #218838);
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-button {
  background: var(--button-bg, #2a2a2a);
  color: var(--button-text, #ffffff);
  border: 1px solid var(--button-border, #333333);
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background: var(--button-hover-bg, #333333);
}

/* Preview Styles */
.preview-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-row-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.preview-row-number {
  font-weight: 600;
  color: var(--accent-color, #4f87ff);
}

.color-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  font-size: 0.875rem;
}

.color-indicator::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border-color, #444);
  box-shadow: 0 0 0 1px white;
  background-color: inherit;
}

.preview-row-content {
  padding-left: 0rem;
}

.preview-stitches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  border-radius: 8px;
}

.preview-stitch {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--stitch-bg, #333);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  font-size: 0.75rem;
  position: relative;
  overflow: hidden;
}

.stitch-count {
  font-weight: 700;
  font-size: 0.875rem;
}

.stitch-type {
  font-size: 0.625rem;
  opacity: 0.8;
}

/* Stitch styles are now defined globally in assets/styles/stitch-colors.css */

/* Repeat Group Styles */
.repeat-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin: 0 0.5rem;
  position: relative;
  padding: 0 0.5rem;
  background-color: rgba(79, 135, 255, 0.08);
  border-radius: 8px;
  height: 40px;
  overflow: visible;
}

.repeat-bracket {
  font-size: 2.5rem;
  font-weight: 400;
  color: var(--accent-color, #4f87ff);
  margin: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding-bottom: 7px;
}

.left-bracket {
  margin-right: 0.25rem;
}

.right-bracket {
  margin-left: 0.25rem;
  margin-right: 0.125rem;
}

.repeat-count {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--accent-color, #4f87ff);
  padding: 0.125rem 0.25rem;
  background: rgba(79, 135, 255, 0.15);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.125rem;
  height: 24px;
  position: relative;
}

/* Custom light cancel button */
.light-cancel-button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  background: #e0e0e0;
  color: #333;
  border: 1px solid #d0d0d0;
  transition: all 0.2s ease;
}

.light-cancel-button:hover {
  background: #d0d0d0;
}

/* Light theme overrides */
:root.light .row-edit-modal {
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

:root.light .modal-header {
  border-bottom: 1px solid #e0e0e0;
}

:root.light .modal-header h2 {
  color: #333;
}

:root.light .close-button {
  color: #666;
}

:root.light .close-button:hover {
  color: #333;
}

:root.light .form-group label {
  color: #333;
}

:root.light .form-input {
  border: 1px solid #e0e0e0;
  background: #f9f9f9;
  color: #333;
}

:root.light .original-text {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  color: #666;
}

:root.light .action-buttons {
  border-top: 1px solid #e0e0e0;
}

:root.light .cancel-button {
  background: #f2f2f2 !important;
  color: #333 !important;
  border: 1px solid #d0d0d0 !important;
}

:root.light .cancel-button:hover {
  background: #e0e0e0 !important;
}

:root.light .preview-stitch {
  border: 1px solid rgba(0, 0, 0, 0.1);
}

:root.light .repeat-group {
  background-color: rgba(41, 121, 255, 0.08);
}

:root.light .repeat-bracket,
:root.light .repeat-count {
  color: #2979ff;
}
</style>
