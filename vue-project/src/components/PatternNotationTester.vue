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
            placeholder="Enter your pattern rows (e.g., Round 1 6 sc in a magic ring (6))"
            class="pattern-input"
            @input="detectAndParse"
          ></textarea>
        </div>

        <!-- Pattern format configuration - only shown after input -->
        <div v-if="patternInput.trim()" class="format-section">
          <!-- Quick Settings Panel -->
          <div class="quick-settings">
            <div class="settings-group">
              <h4>Pattern Format</h4>
              <div class="format-inputs">
                <div class="format-field">
                  <label>Row Format:</label>
                  <input 
                    v-model="rowFormat"
                    :placeholder="detectedFormats?.row || 'e.g., Round #, Row #, R#'"
                    class="format-input"
                    @input="parsePattern"
                  >
                </div>
                <div class="format-field">
                  <label>Color Format:</label>
                  <input 
                    v-model="colorFormat"
                    :placeholder="detectedFormats?.color || 'e.g., Color A, MC, Pink'"
                    class="format-input"
                    @input="parsePattern"
                  >
                </div>
              </div>
              <div class="format-help">Use # to indicate where the row number appears</div>
            </div>

            <div class="settings-group">
              <h4>Common Options</h4>
              <div class="common-options">
                <label class="option-item">
                  <input 
                    type="checkbox" 
                    v-model="parsingOptions.ignoreStitchCounts"
                    @change="parsePattern"
                  >
                  <span>Ignore Stitch Counts</span>
                </label>
                <label class="option-item">
                  <input 
                    type="checkbox" 
                    v-model="parsingOptions.keepRepeatParentheses"
                    @change="parsePattern"
                  >
                  <span>Keep Repeat Instructions</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Detected Format Display -->
          <div v-if="detectedFormats" class="detected-format">
            <div class="format-info">
              <span class="format-label">Detected Row:</span>
              <span class="format-value">{{ detectedFormats.row || 'None' }}</span>
            </div>
            <div class="format-info">
              <span class="format-label">Detected Color:</span>
              <span class="format-value">{{ detectedFormats.color || 'None' }}</span>
            </div>
          </div>

          <!-- Configuration Management -->
          <div class="config-section">
            <div class="config-header">
              <h4>Saved Configurations</h4>
              <div class="config-actions">
                <select 
                  v-model="selectedConfig" 
                  class="config-select"
                  @change="loadConfig"
                >
                  <option value="">Select a configuration</option>
                  <option 
                    v-for="config in savedConfigs" 
                    :key="config.name" 
                    :value="config.name"
                  >
                    {{ config.name }}
                  </option>
                </select>
                <button class="action-btn save-btn" @click="showSaveDialog = true">
                  Save New
                </button>
                <button 
                  v-if="selectedConfig"
                  class="action-btn update-btn"
                  @click="updateConfig"
                >
                  Update
                </button>
              </div>
            </div>
          </div>

          <!-- Advanced Options -->
          <div class="advanced-section">
            <button 
              class="advanced-toggle"
              @click="showAdvanced = !showAdvanced"
            >
              {{ showAdvanced ? '− Advanced Options' : '+ Advanced Options' }}
            </button>
            
            <div v-if="showAdvanced" class="advanced-content">
              <div class="advanced-options-grid">
                <label class="option-item">
                  <input 
                    type="checkbox" 
                    v-model="parsingOptions.ignoreStitchAbbrev"
                    @change="parsePattern"
                  >
                  <div class="option-info">
                    <span class="option-title">Ignore Stitch Abbreviations</span>
                    <span class="option-example">e.g., "st", "sts" at end</span>
                  </div>
                </label>

                <label class="option-item">
                  <input 
                    type="checkbox" 
                    v-model="parsingOptions.ignoreTurnMarkers"
                    @change="parsePattern"
                  >
                  <div class="option-info">
                    <span class="option-title">Ignore Turn Markers</span>
                    <span class="option-example">e.g., ", turn" at end</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Results display section -->
        <div v-if="parsedResults" class="results-section">
          <h3>Parsing Results</h3>
          
          <!-- Formatted pattern preview -->
          <div class="result-group">
            <div class="section-header" @click="toggleSection('formatted')">
              <h4>Formatted Pattern</h4>
              <button class="toggle-btn">
                {{ sectionStates.formatted ? '−' : '+' }}
              </button>
            </div>
            <div v-show="sectionStates.formatted" class="result-content">
              <div class="formatted-pattern">
                <p v-for="(row, index) in formattedPattern" :key="index">
                  {{ row }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Row separation -->
          <div v-if="parsedResults.rows?.length > 0" class="result-group">
            <div class="section-header" @click="toggleSection('rows')">
              <h4>Parsed Rows</h4>
              <button class="toggle-btn">
                {{ sectionStates.rows ? '−' : '+' }}
              </button>
            </div>
            <div v-show="sectionStates.rows" class="result-content">
              <div v-for="(row, index) in parsedResults.rows" :key="index" class="parsed-row">
                <div class="row-header" @click="toggleRow(row.number)">
                  <h5>Row {{ row.number }}</h5>
                  <button class="toggle-btn small">
                    {{ rowStates[row.number] ? '−' : '+' }}
                  </button>
                </div>
                <div v-show="rowStates[row.number]" class="row-content">
                  <p><strong>Raw Pattern:</strong> {{ row.rawPattern }}</p>
                  <p v-if="row.ignoredParts.length > 0">
                    <strong>Ignored Parts:</strong>
                    <span v-for="(part, pIndex) in row.ignoredParts" :key="pIndex" class="ignored-part">
                      {{ part }}
                    </span>
                  </p>
                  <p><strong>Parsed Stitches:</strong></p>
                  <ul class="stitch-list">
                    <li v-for="(stitch, sIndex) in row.stitches" :key="sIndex">
                      {{ stitch }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Color detection -->
          <div v-if="parsedResults.color" class="result-group">
            <div class="section-header" @click="toggleSection('color')">
              <h4>Color Detection</h4>
              <button class="toggle-btn">
                {{ sectionStates.color ? '−' : '+' }}
              </button>
            </div>
            <div v-show="sectionStates.color" class="result-content">
              <p><strong>Detected Color:</strong> {{ parsedResults.color }}</p>
              <p v-if="parsedResults.colorPosition"><strong>Color Position:</strong> {{ parsedResults.colorPosition }}</p>
            </div>
          </div>
        </div>

        <!-- Error display -->
        <div v-if="parseError" class="error-section">
          <h4>Pattern Format Help</h4>
          <p>{{ parseError }}</p>
        </div>

        <!-- Modal action buttons -->
        <div class="modal-actions">
          <button 
            @click="saveToPattern" 
            class="save-btn"
            :disabled="!parsedResults || !formattedPattern.length"
          >
            Save to Pattern
          </button>
          <button @click="$emit('close')" class="close-btn">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePatternStore } from '../stores/pattern'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true
  },
  patternText: {
    type: String,
    default: ''
  },
  patternId: {
    type: String,
    required: false,
    default: null
  }
})

const emit = defineEmits(['close', 'update:modelValue', 'pattern-updated', 'pattern-created'])

const patternStore = usePatternStore()

// Format configurations
const rowFormat = ref('')
const colorFormat = ref('')
const patternInput = ref('')
const parsedResults = ref(null)
const parseError = ref(null)
const detectedFormats = ref(null)
const formattedPattern = ref([])

// UI State
const showAdvanced = ref(false)

// Parsing configuration
const parsingOptions = ref({
  ignoreStitchCounts: true,      // Ignore (number) at end of row
  keepRepeatParentheses: true,   // Keep parentheses used for repeats
  ignoreStitchAbbrev: true,      // Ignore st, sts
  ignoreTurnMarkers: true        // Ignore turn instructions
})

// Custom ignore patterns
const customIgnorePatterns = ref([])

// Configuration management
const showSaveDialog = ref(false)
const newConfigName = ref('')
const selectedConfig = ref('')
const savedConfigs = ref([
  {
    name: 'Default',
    options: {
      ignoreStitchCounts: true,
      keepRepeatParentheses: true,
      ignoreStitchAbbrev: true,
      ignoreTurnMarkers: true
    },
    customPatterns: [],
    rowFormat: 'Row #',
    colorFormat: 'Color'
  }
])

// Common row formats to detect
const commonRowFormats = [
  { pattern: /^Round\s+\d+/i, format: 'Round #' },
  { pattern: /^Row\s+\d+/i, format: 'Row #' },
  { pattern: /^R\s*\d+/i, format: 'R#' },
  { pattern: /^Rnd\s*\d+/i, format: 'Rnd #' }
]

// Common color formats to detect
const commonColorPatterns = [
  { pattern: /(?:^|\s)(?:with\s+)?Color\s+[A-Z]/i, format: 'Color' },
  { pattern: /(?:^|\s)(?:with\s+)?MC\b/i, format: 'MC' },
  { pattern: /(?:^|\s)(?:with\s+)?CC\b/i, format: 'CC' },
  { pattern: /(?:^|\s)(?:work\s+in\s+)([A-Za-z]+)/i, format: match => match[1] },
  { pattern: /(?:^|\s)(?:in\s+)([A-Za-z]+)/i, format: match => match[1] }
]

const createRowRegex = (format) => {
  // Make the regex more flexible to handle Row/Round variations
  const formatWithVariations = format
    .replace(/Row/i, '(?:Row|Round|R|Rnd)')
    .replace(/Round/i, '(?:Row|Round|R|Rnd)')
    .replace(/R(?!ound)/i, '(?:Row|Round|R|Rnd)')
    .replace(/Rnd/i, '(?:Row|Round|R|Rnd)')
  
  // Escape special characters except # and the row/round variations we just added
  const escapedFormat = formatWithVariations
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace('\\(?:Row\\|Round\\|R\\|Rnd\\)', '(?:Row|Round|R|Rnd)')
  
  // Replace # with a number capture group
  const pattern = escapedFormat.replace('#', '(\\d+)')
  return new RegExp(pattern, 'i')
}

const detectFormats = (input) => {
  if (!input.trim()) {
    detectedFormats.value = null
    return
  }

  const formats = {
    row: null,
    color: null
  }

  // Detect row format from first line that contains Round or Row
  const lines = input.split('\n')
  for (const line of lines) {
    // If user has entered a row format, try that first
    if (rowFormat.value) {
      const userRowRegex = createRowRegex(rowFormat.value)
      if (userRowRegex.test(line)) {
        formats.row = rowFormat.value
        break
      }
    }
    
    // If no match with user format, try common formats
    for (const format of commonRowFormats) {
      if (format.pattern.test(line)) {
        formats.row = format.format
        break
      }
    }
    
    if (formats.row) break
  }

  // Detect color format
  for (const pattern of commonColorPatterns) {
    const match = input.match(pattern.pattern)
    if (match) {
      formats.color = typeof pattern.format === 'function' 
        ? pattern.format(match) 
        : pattern.format
      break
    }
  }

  detectedFormats.value = formats
  
  // Only set the formats if they're not already set by the user
  if (formats.row && !rowFormat.value) rowFormat.value = formats.row
  if (formats.color && !colorFormat.value) colorFormat.value = formats.color
}

const addIgnorePattern = () => {
  customIgnorePatterns.value.push('')
}

const removeIgnorePattern = (index) => {
  customIgnorePatterns.value.splice(index, 1)
  parsePattern()
}

const cleanPattern = (text) => {
  let cleanedText = text
  const ignoredParts = []

  // Function to track what we're removing
  const removeAndTrack = (pattern, text) => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => {
        if (!ignoredParts.includes(match)) {
          ignoredParts.push(match)
        }
      })
    }
    return text.replace(pattern, '')
  }

  // Handle stitch counts at the end - (number)
  if (parsingOptions.value.ignoreStitchCounts) {
    cleanedText = removeAndTrack(/\s*\(\d+\)\s*$/, cleanedText)
  }

  // Handle stitch abbreviations
  if (parsingOptions.value.ignoreStitchAbbrev) {
    cleanedText = removeAndTrack(/\s+sts?\b/g, cleanedText)
  }

  // Handle turn markers
  if (parsingOptions.value.ignoreTurnMarkers) {
    cleanedText = removeAndTrack(/,?\s*turn\b/i, cleanedText)
  }

  // Handle custom ignore patterns
  customIgnorePatterns.value.forEach(pattern => {
    if (!pattern.trim()) return

    try {
      // Escape special characters if the pattern isn't already a regex
      const regexPattern = pattern.startsWith('\\') ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(regexPattern, 'g')
      cleanedText = removeAndTrack(regex, cleanedText)
    } catch (error) {
      console.warn('Invalid ignore pattern:', pattern)
    }
  })

  return {
    text: cleanedText.trim(),
    ignoredParts
  }
}

const parseRow = (rowText, rowNum) => {
  try {
    // Clean the pattern first
    const { text: cleanedPattern, ignoredParts } = cleanPattern(rowText)
    let rawPattern = cleanedPattern
    const stitches = []
    let currentPart = ''
    let inParentheses = 0
    let isRepeatSection = false

    // Parse stitches
    for (let i = 0; i < rawPattern.length; i++) {
      const char = rawPattern[i]
      
      // Track parentheses depth and check if it's a repeat section
      if (char === '(') {
        inParentheses++
        // Check if this parenthesis is followed by a repeat marker
        const lookAhead = rawPattern.slice(i).match(/^\([^)]+\)\s*x\d+/)
        if (lookAhead && parsingOptions.value.keepRepeatParentheses) {
          isRepeatSection = true
        }
      }
      if (char === ')') {
        inParentheses--
        if (inParentheses === 0) {
          isRepeatSection = false
        }
      }
      
      // Split on comma or semicolon if not in a repeat section
      if ((char === ',' || char === ';') && !isRepeatSection && inParentheses === 0) {
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
      .map(stitch => {
        stitch = stitch.trim()
        
        // Keep repeat instructions intact
        if (stitch.includes('x') && parsingOptions.value.keepRepeatParentheses) {
          return stitch
        }
        
        // Handle special instructions
        if (stitch.includes('in a') || stitch.includes('into')) {
          return stitch
        }
        
        return stitch
          .replace(/\s+/g, ' ')
          .trim()
      })
      .filter(Boolean)

    return {
      number: rowNum,
      rawPattern: rowText.trim(),
      stitches: cleanedStitches,
      ignoredParts
    }
  } catch (error) {
    console.error('Error parsing row:', error)
    return null
  }
}

const detectAndParse = () => {
  detectFormats(patternInput.value)
  parsePattern()
}

// Preprocess input to handle multiple rows on the same line
const preprocessInput = (input) => {
  // Remove any standalone numbers
  let processed = input.replace(/^\d+$/gm, '')

  // Handle title and section headers
  const titleMatch = input.match(/^[A-Za-z\s]+$/m)
  const title = titleMatch ? titleMatch[0].trim() : null

  // Handle color instructions
  const colorMatch = input.match(/^Work\s+in\s+([^.]+)\./i)
  const color = colorMatch ? colorMatch[1].trim() : null

  // Remove title and color instruction from input
  if (title) {
    processed = processed.replace(title, '')
  }
  if (colorMatch) {
    processed = processed.replace(colorMatch[0], '')
  }

  // Handle range notation (e.g., "Round 35-44")
  processed = processed.replace(/\b(Row|Round|R|Rnd)\s*(\d+)-(\d+)\s+([^(]+)\(([^)]+)\)(\s+\d+\s+Rounds)?/gi, (match, prefix, start, end, instructions, stitches, rounds) => {
    const count = parseInt(end) - parseInt(start) + 1
    const repeatedRows = Array.from({ length: count }, (_, i) => {
      const roundNum = parseInt(start) + i
      return `${prefix} ${roundNum} ${instructions}(${stitches})`
    }).join('\n')
    return repeatedRows
  })

  // Replace variations of Round/Row with consistent format
  processed = processed.replace(/\b(Round|Row|R|Rnd|Vuela)\s*(\d+)\b/gi, '\nRound $2')

  // Remove "FO" and similar ending instructions
  processed = processed.replace(/FO\..*/gi, '')
  processed = processed.replace(/Stuff\..*/gi, '')

  // Split on newlines and clean up each line
  processed = processed.split('\n')
    .map(line => line.trim())
    .filter(Boolean) // Remove empty lines
    .join('\n')

  return {
    title,
    color,
    pattern: processed
  }
}

const parsePattern = () => {
  parseError.value = null
  formattedPattern.value = []  // Reset formatted pattern
  
  if (!patternInput.value.trim()) {
    parsedResults.value = null
    return
  }

  try {
    // Preprocess the input
    const { title, color: detectedColor, pattern } = preprocessInput(patternInput.value.trim())
    let rows = []

    // Split into rows and parse each one
    const lines = pattern.split('\n')
    for (const line of lines) {
      if (!line.trim()) continue
      
      // Use a more flexible regex that matches both Round and Row
      const match = line.match(/(?:Round|Row)\s+(\d+)\s+(.+)/i)
      if (match) {
        const rowNum = parseInt(match[1])
        const rowContent = match[2].trim()
        const parsedRow = parseRow(rowContent, rowNum)
        if (parsedRow) {
          rows.push(parsedRow)
        }
      }
    }

    // Sort rows by number to ensure they're in order
    rows.sort((a, b) => a.number - b.number)

    parsedResults.value = {
      title,
      color: detectedColor || (colorFormat.value ? null : undefined),
      rows
    }

    // Update formatted pattern
    const formattedRows = rows.map(row => {
      let formattedRow = `Round ${row.number}`
      if (detectedColor && row.number === 1) {
        formattedRow = `Work in ${detectedColor}.\n${formattedRow}`
      }
      formattedRow += `: ${row.stitches.join(', ')}`
      
      // Add stitch count if present and not ignoring stitch counts
      if (!parsingOptions.value.ignoreStitchCounts) {
        const stitchCount = row.ignoredParts.find(part => /^\(\d+\)$/.test(part))
        if (stitchCount) {
          formattedRow += ` ${stitchCount}`
        }
      }
      
      return formattedRow
    })

    formattedPattern.value = title ? [title, ...formattedRows] : formattedRows

  } catch (error) {
    console.error('Error parsing pattern:', error)
    parseError.value = 'Unable to parse the pattern. Please check your format matches the example.'
    parsedResults.value = null
  }
}

// Watch for changes in row format
watch(rowFormat, () => {
  if (patternInput.value.trim()) {
    detectFormats(patternInput.value)
    parsePattern()
  }
})

// Watch for changes in pattern text
watch(() => props.patternText, (newText) => {
  if (newText) {
    patternInput.value = newText
    detectAndParse()
  }
})

// Save current configuration
const saveConfig = () => {
  if (!newConfigName.value.trim()) {
    return
  }

  const newConfig = {
    name: newConfigName.value.trim(),
    options: { ...parsingOptions.value },
    customPatterns: [...customIgnorePatterns.value],
    rowFormat: rowFormat.value,
    colorFormat: colorFormat.value
  }

  savedConfigs.value.push(newConfig)
  selectedConfig.value = newConfig.name
  showSaveDialog.value = false
  newConfigName.value = ''

  // Save to localStorage
  localStorage.setItem('patternConfigs', JSON.stringify(savedConfigs.value))
}

// Update existing configuration
const updateConfig = () => {
  const index = savedConfigs.value.findIndex(c => c.name === selectedConfig.value)
  if (index === -1) return

  savedConfigs.value[index] = {
    name: selectedConfig.value,
    options: { ...parsingOptions.value },
    customPatterns: [...customIgnorePatterns.value],
    rowFormat: rowFormat.value,
    colorFormat: colorFormat.value
  }

  // Save to localStorage
  localStorage.setItem('patternConfigs', JSON.stringify(savedConfigs.value))
}

// Load selected configuration
const loadConfig = () => {
  const config = savedConfigs.value.find(c => c.name === selectedConfig.value)
  if (!config) return

  parsingOptions.value = { ...config.options }
  customIgnorePatterns.value = [...config.customPatterns]
  rowFormat.value = config.rowFormat
  colorFormat.value = config.colorFormat
  parsePattern()
}

// Delete selected configuration
const deleteConfig = () => {
  if (selectedConfig.value === 'Default') return // Prevent deleting default config

  savedConfigs.value = savedConfigs.value.filter(c => c.name !== selectedConfig.value)
  selectedConfig.value = ''
  
  // Save to localStorage
  localStorage.setItem('patternConfigs', JSON.stringify(savedConfigs.value))
}

// Load saved configurations from localStorage on component mount
onMounted(() => {
  const savedConfigsStr = localStorage.getItem('patternConfigs')
  if (savedConfigsStr) {
    try {
      const configs = JSON.parse(savedConfigsStr)
      // Ensure Default config is always present
      if (!configs.find(c => c.name === 'Default')) {
        configs.unshift(savedConfigs.value[0])
      }
      savedConfigs.value = configs
    } catch (error) {
      console.error('Error loading saved configurations:', error)
    }
  }
})

// Save the formatted pattern
const saveToPattern = async () => {
  try {
    const patternData = {
      pattern: formattedPattern.value.join('\n'),
      updatedAt: new Date().toISOString()
    }

    if (props.patternId) {
      // Update existing pattern
      const pattern = await patternStore.getPattern(props.patternId)
      if (!pattern) {
        throw new Error('Pattern not found')
      }

      const updatedPattern = {
        ...pattern,
        ...patternData
      }

      await patternStore.updatePattern(props.patternId, updatedPattern)
      emit('pattern-updated', updatedPattern)
    } else {
      // Create new pattern
      const newPattern = {
        ...patternData,
        createdAt: new Date().toISOString(),
        // Add any other required fields for new patterns
        title: 'New Pattern', // You might want to make this configurable
        description: '',
        difficulty: 'beginner',
        status: 'draft'
      }

      const createdPattern = await patternStore.addPattern(newPattern)
      emit('pattern-created', createdPattern)
    }
    
    // Close the modal
    emit('close')
  } catch (error) {
    console.error('Error saving pattern:', error)
    parseError.value = 'Error saving pattern. Please try again.'
  }
}

// Section collapse states
const sectionStates = ref({
  formatted: true,
  rows: true,
  color: true
})

// Individual row collapse states
const rowStates = ref({})

// Initialize row states when results change
watch(() => parsedResults.value?.rows, (newRows) => {
  if (newRows) {
    const states = {}
    newRows.forEach(row => {
      // Default to expanded for first 3 rows, collapsed for the rest
      states[row.number] = row.number <= 3
    })
    rowStates.value = states
  }
}, { immediate: true })

// Toggle section visibility
const toggleSection = (section) => {
  sectionStates.value[section] = !sectionStates.value[section]
}

// Toggle individual row visibility
const toggleRow = (rowNumber) => {
  rowStates.value[rowNumber] = !rowStates.value[rowNumber]
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

.format-section {
  margin-bottom: 2rem;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.quick-settings {
  padding: 1.5rem;
  display: flex;
  gap: 2rem;
  border-bottom: 1px solid var(--border-color);
}

.settings-group {
  flex: 1;
}

.settings-group h4 {
  margin: 0 0 1rem;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.format-inputs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.format-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.format-field label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.format-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
}

.format-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.format-help {
  margin-top: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
}

.common-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.option-item:hover {
  background: var(--hover-bg);
}

.option-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.detected-format {
  padding: 1rem 1.5rem;
  background: var(--main-bg);
  display: flex;
  gap: 2rem;
}

.format-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.format-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.format-value {
  color: var(--text-primary);
  font-weight: 500;
}

.config-section {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.config-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.config-select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-primary);
  min-width: 200px;
}

.action-btn {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.save-btn {
  background: var(--success-bg);
  color: var(--success-text);
}

.update-btn {
  background: var(--warning-bg);
  color: var(--warning-text);
}

.advanced-section {
  padding: 1.5rem;
}

.advanced-toggle {
  width: 100%;
  padding: 0.75rem;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
}

.advanced-toggle:hover {
  color: var(--accent-color);
}

.advanced-content {
  margin-top: 1rem;
}

.advanced-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-title {
  color: var(--text-primary);
  font-weight: 500;
}

.option-example {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
}

/* Results display section */
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

.input-help {
  margin: 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.input-help code {
  display: block;
  margin-top: 0.25rem;
  padding: 0.5rem;
  background: var(--main-bg);
  border-radius: 4px;
  font-family: monospace;
}

.error-section {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.error-section h4 {
  color: var(--accent-color);
  margin: 0 0 0.5rem 0;
}

.error-section p {
  margin: 0;
  color: var(--text-secondary);
}

.parsed-row {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.parsed-row:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.parsed-row h5 {
  margin: 0 0 0.75rem 0;
  color: var(--accent-color);
}

.save-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
}

.save-dialog-content {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  min-width: 300px;
}

.save-dialog-content h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.config-name-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.save-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.save-btn,
.cancel-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn {
  background: var(--success-bg);
  color: var(--success-text);
}

.cancel-btn {
  background: var(--button-bg);
  color: var(--button-text);
}

.save-btn:hover { background: var(--success-hover-bg); }
.cancel-btn:hover { background: var(--button-hover-bg); }

.formatted-pattern {
  font-family: monospace;
  white-space: pre-wrap;
  padding: 1rem;
  background: var(--main-bg);
  border-radius: 8px;
  margin-top: 0.5rem;
}

.formatted-pattern p {
  margin: 0.25rem 0;
}

.save-btn {
  padding: 0.8rem 1.5rem;
  background-color: var(--success-bg);
  color: var(--success-text);
  border: 1px solid var(--success-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn:hover:not(:disabled) {
  background-color: var(--success-hover-bg);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.section-header:hover {
  background-color: var(--hover-bg);
}

.section-header h4 {
  margin: 0;
}

.toggle-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background-color: var(--button-hover-bg);
  color: var(--text-primary);
}

.toggle-btn.small {
  font-size: 1rem;
  width: 20px;
  height: 20px;
}

.row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.row-header:hover {
  background-color: var(--hover-bg);
}

.row-header h5 {
  margin: 0;
}

.row-content {
  padding: 0.5rem;
  margin-left: 1rem;
  border-left: 2px solid var(--border-color);
}

.result-content {
  transition: all 0.3s ease-in-out;
}

.parsed-row {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.parsed-row:last-child {
  margin-bottom: 0;
}

.ignored-part {
  display: inline-block;
  margin: 0.25rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--tag-bg);
  border-radius: 4px;
  font-size: 0.9rem;
}
</style> 