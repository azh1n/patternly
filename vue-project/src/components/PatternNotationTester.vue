<!-- Pattern notation testing component -->
<template>
  <div v-if="modelValue" class="modal-overlay" @click="$emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>Pattern Notation Tester</h2>
        <button @click="$emit('close')" class="close-button">×</button>
      </div>
      
      <div class="modal-content">
        <!-- Pattern input section -->
        <div class="input-section">
          <label for="patternInput">Test Pattern Row:</label>
          <textarea
            id="patternInput"
            v-model="patternInput"
            placeholder="Enter a pattern row (e.g., 'Row 1: With Color A, 1bs, 22dc, 1bs')"
            class="pattern-input"
            @input="parsePattern"
          ></textarea>
        </div>

        <!-- Results display section -->
        <div class="results-section" v-if="parsedResults">
          <h3>Parsing Results</h3>
          
          <!-- Row separation -->
          <div class="result-group">
            <h4>Row Separation</h4>
            <div class="result-content">
              <p><strong>Row Number:</strong> {{ parsedResults.rowNum }}</p>
            </div>
          </div>

          <!-- Color detection -->
          <div class="result-group">
            <h4>Color Detection</h4>
            <div class="result-content">
              <p><strong>Detected Color:</strong> {{ parsedResults.color }}</p>
              <p><strong>Color Position:</strong> After "With"</p>
            </div>
          </div>

          <!-- Stitch parsing -->
          <div class="result-group">
            <h4>Stitch Parsing</h4>
            <div class="result-content">
              <p><strong>Raw Pattern:</strong> {{ parsedResults.rawPattern }}</p>
              <p><strong>Parsed Stitches:</strong></p>
              <ul class="stitch-list">
                <li v-for="(stitch, index) in parsedResults.stitches" :key="index">
                  {{ stitch }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Modal action buttons -->
        <div class="modal-actions">
          <button @click="$emit('close')" class="close-btn">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true
  },
  patternText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'save'])

const patternInput = ref('')
const parsedResults = ref(null)

// Watch for changes in pattern text
watch(() => props.patternText, (newText) => {
  if (newText) {
    // Try to find the first row in the pattern text
    const firstRow = newText.split('\n').find(line => line.trim().startsWith('Row'))
    if (firstRow) {
      patternInput.value = firstRow.trim()
      parsePattern()
    }
  }
})

const parsePattern = () => {
  if (!patternInput.value.trim()) {
    parsedResults.value = null
    return
  }

  try {
    // Parse row number and color
    const rowMatch = patternInput.value.match(/Row (\d+): With (Color [A-Z])/)
    if (!rowMatch) {
      throw new Error('Invalid pattern format')
    }

    const rowNum = rowMatch[1]
    const color = rowMatch[2]
    let rawPattern = patternInput.value.split(color)[1]?.trim() || ''

    // Remove FO and stitch count if present
    rawPattern = rawPattern.split(' FO.')[0].split(' (Stitch Count')[0].trim()

    // Parse stitches
    const stitches = []
    let currentPart = ''
    let inParentheses = 0

    for (let i = 0; i < rawPattern.length; i++) {
      const char = rawPattern[i]
      if (char === '(') inParentheses++
      if (char === ')') inParentheses--

      if (char === ',' && inParentheses === 0) {
        if (currentPart.trim()) {
          stitches.push(currentPart.trim())
        }
        currentPart = ''
      } else {
        currentPart += char
      }
    }
    if (currentPart.trim()) {
      stitches.push(currentPart.trim())
    }

    // Clean up stitches
    const cleanedStitches = stitches
      .map(stitch => stitch.replace(/\.$/, '').trim())
      .filter(stitch => {
        const isStandardCode = stitch.match(/^\d+[a-z]+$/)
        const isRepeatedPattern = stitch.match(/^\([^)]+\)x\d+$/)
        const isBorderStitch = stitch.match(/^\d+bs$/)
        return isStandardCode || isRepeatedPattern || isBorderStitch
      })

    parsedResults.value = {
      rowNum,
      color,
      rawPattern,
      stitches: cleanedStitches
    }
  } catch (error) {
    console.error('Error parsing pattern:', error)
    parsedResults.value = null
  }
}
</script>

<style scoped>
/* Modal overlay styles */
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
  width: min(800px, 90%);
  background-color: var(--card-bg);
  border-radius: 16px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

/* Modal header styles */
.modal-header {
  padding: 1.5rem;
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

/* Modal content styles */
.modal-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.input-section {
  margin-bottom: 2rem;
}

.pattern-input {
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  border: 2px solid var(--input-border);
  border-radius: 12px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-family: monospace;
  margin-top: 0.5rem;
  resize: vertical;
}

.pattern-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.results-section {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.result-group {
  margin-bottom: 1.5rem;
}

.result-group:last-child {
  margin-bottom: 0;
}

.result-group h4 {
  margin: 0 0 0.5rem 0;
  color: var(--accent-color);
}

.result-content {
  background-color: var(--main-bg);
  padding: 1rem;
  border-radius: 8px;
  word-break: break-word;
}

.stitch-list {
  list-style-type: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
}

.stitch-list li {
  padding: 0.25rem 0;
  font-family: monospace;
}

/* Modal action buttons */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.close-btn {
  padding: 0.8rem 1.5rem;
  background-color: var(--button-bg);
  color: var(--button-text);
  border: 1px solid var(--button-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: var(--button-hover-bg);
}

/* Responsive styles */
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

  .pattern-input {
    font-size: 1.1rem;
    padding: 1.2rem;
  }
}
</style> 