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
          <div class="detected-format" v-if="detectedFormats">
            <p>Detected Format:</p>
            <div class="format-details">
              <span><strong>Row:</strong> {{ detectedFormats.row || 'None' }} (use # for row number)</span>
              <span><strong>Color:</strong> {{ detectedFormats.color || 'None' }}</span>
            </div>
          </div>
          <div class="format-row">
            <div class="format-field">
              <label>Row Format:</label>
              <input 
                v-model="rowFormat"
                :placeholder="detectedFormats?.row || 'e.g., Round #, Row #, R#'"
                class="format-input"
                @input="parsePattern"
              >
              <div class="format-help">Use # to indicate where the row number appears</div>
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
          
          <!-- Pattern parsing options -->
          <div class="parsing-options">
            <!-- Configuration management -->
            <div class="config-management">
              <div class="config-header">
                <h4>Pattern Configuration</h4>
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
                  <button 
                    class="save-config-btn"
                    @click="showSaveDialog = true"
                    title="Save current configuration"
                  >
                    Save As New
                  </button>
                  <button 
                    v-if="selectedConfig"
                    class="update-config-btn"
                    @click="updateConfig"
                    title="Update selected configuration"
                  >
                    Update
                  </button>
                  <button 
                    v-if="selectedConfig"
                    class="delete-config-btn"
                    @click="deleteConfig"
                    title="Delete selected configuration"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <!-- Save configuration dialog -->
            <div v-if="showSaveDialog" class="save-dialog">
              <div class="save-dialog-content">
                <h4>Save Configuration</h4>
                <input 
                  v-model="newConfigName"
                  placeholder="Enter configuration name"
                  class="config-name-input"
                >
                <div class="save-dialog-actions">
                  <button @click="saveConfig" class="save-btn">Save</button>
                  <button @click="showSaveDialog = false" class="cancel-btn">Cancel</button>
                </div>
              </div>
            </div>

            <h4>Pattern Parsing Options:</h4>
            <div class="options-grid">
              <label class="option-item">
                <input 
                  type="checkbox" 
                  v-model="parsingOptions.ignoreStitchCounts"
                  @change="parsePattern"
                >
                <span class="option-label">
                  <span class="option-title">Ignore Stitch Counts</span>
                  <span class="option-example">e.g., (18) at end of row</span>
                </span>
              </label>
              
              <label class="option-item">
                <input 
                  type="checkbox" 
                  v-model="parsingOptions.keepRepeatParentheses"
                  @change="parsePattern"
                >
                <span class="option-label">
                  <span class="option-title">Keep Repeat Instructions</span>
                  <span class="option-example">e.g., (1sc, 1inc) x6</span>
                </span>
              </label>

              <label class="option-item">
                <input 
                  type="checkbox" 
                  v-model="parsingOptions.ignoreStitchAbbrev"
                  @change="parsePattern"
                >
                <span class="option-label">
                  <span class="option-title">Ignore Stitch Abbreviations</span>
                  <span class="option-example">e.g., "st", "sts" at end</span>
                </span>
              </label>

              <label class="option-item">
                <input 
                  type="checkbox" 
                  v-model="parsingOptions.ignoreTurnMarkers"
                  @change="parsePattern"
                >
                <span class="option-label">
                  <span class="option-title">Ignore Turn Markers</span>
                  <span class="option-example">e.g., ", turn" at end</span>
                </span>
              </label>
            </div>

            <!-- Advanced ignore patterns -->
            <div class="advanced-section">
              <button 
                class="advanced-toggle"
                @click="showAdvanced = !showAdvanced"
              >
                {{ showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options' }}
              </button>
              
              <div v-if="showAdvanced" class="advanced-content">
                <p class="advanced-help">
                  Add custom patterns to ignore. You can use regular expressions for more complex patterns.
                  <br>
                  Examples:
                  <code>\\(\\d+\\)</code> - matches numbers in parentheses
                  <code>\\b[A-Z]\\d+\\b</code> - matches capital letter followed by numbers
                </p>
                
                <div class="ignore-list">
                  <div 
                    v-for="(pattern, index) in customIgnorePatterns" 
                    :key="index" 
                    class="ignore-item"
                  >
                    <input 
                      v-model="customIgnorePatterns[index]"
                      placeholder="Enter pattern to ignore"
                      class="ignore-input"
                      @input="parsePattern"
                    >
                    <button 
                      class="remove-ignore"
                      @click="removeIgnorePattern(index)"
                      title="Remove pattern"
                    >×</button>
                  </div>
                  <button 
                    class="add-ignore"
                    @click="addIgnorePattern"
                  >+ Add Pattern</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Results display section -->
        <div v-if="parsedResults" class="results-section">
          <h3>Parsing Results</h3>
          
          <!-- Formatted pattern preview -->
          <div class="result-group">
            <h4>Formatted Pattern</h4>
            <div class="result-content">
              <div class="formatted-pattern">
                <p v-for="(row, index) in formattedPattern" :key="index">
                  {{ row }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Row separation -->
          <div v-if="parsedResults.rows?.length > 0" class="result-group">
            <h4>Parsed Rows</h4>
            <div class="result-content">
              <div v-for="(row, index) in parsedResults.rows" :key="index" class="parsed-row">
                <h5>Row {{ row.number }}</h5>
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

          <!-- Color detection -->
          <div v-if="parsedResults.color" class="result-group">
            <h4>Color Detection</h4>
            <div class="result-content">
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

  // Detect row format from first line
  const firstLine = input.split('\n')[0]
  
  // If user has entered a row format, try that first
  if (rowFormat.value) {
    const userRowRegex = createRowRegex(rowFormat.value)
    if (userRowRegex.test(firstLine)) {
      formats.row = rowFormat.value
    }
  }
  
  // If no match with user format, try common formats
  if (!formats.row) {
    for (const format of commonRowFormats) {
      if (format.pattern.test(firstLine)) {
        formats.row = format.format
        break
      }
    }
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
      
      const match = line.match(/Round\s+(\d+)\s+(.+)/)
      if (match) {
        const rowNum = parseInt(match[1])
        const rowContent = match[2].trim()
        const parsedRow = parseRow(rowContent, rowNum)
        if (parsedRow) {
          rows.push(parsedRow)
        }
      }
    }

    parsedResults.value = {
      title,
      color: detectedColor || (colorFormat.value ? null : undefined),
      rows
    }

    // Update formatted pattern
    formattedPattern.value = rows.map(row => {
      let formattedRow = `Round ${row.number}`
      if (detectedColor && row.number === 1) {
        formattedRow = `Work in ${detectedColor}.\n${formattedRow}`
      }
      formattedRow += `: ${row.stitches.join(', ')}`
      
      // Add stitch count if present
      const stitchCount = row.ignoredParts.find(part => /^\(\d+\)$/.test(part))
      if (stitchCount) {
        formattedRow += ` ${stitchCount}`
      }
      
      return formattedRow
    })

    if (title) {
      formattedPattern.value.unshift(title)
    }

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

// Computed property for formatted pattern
const formattedPattern = computed(() => {
  if (!parsedResults.value?.rows) return []
  
  return parsedResults.value.rows.map(row => {
    let formattedRow = `Round ${row.number}`
    
    // Add color if present
    if (parsedResults.value.color) {
      formattedRow += `, ${parsedResults.value.color}`
    }
    
    // Add stitches
    formattedRow += `: ${row.stitches.join(', ')}`
    
    // Add any ignored parts that should be kept (like stitch counts)
    const stitchCount = row.ignoredParts.find(part => /^\(\d+\)$/.test(part))
    if (stitchCount) {
      formattedRow += ` ${stitchCount}`
    }
    
    return formattedRow
  })
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
  padding: 1.5rem;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.format-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.format-field {
  flex: 1;
}

.format-field label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
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

.format-example {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.format-example code {
  display: block;
  margin-top: 0.25rem;
  padding: 0.5rem;
  background: var(--main-bg);
  border-radius: 4px;
  font-family: monospace;
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

.detected-format {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--main-bg);
  border-radius: 8px;
}

.detected-format p {
  margin: 0 0 0.5rem 0;
  font-weight: 500;
  color: var(--text-primary);
}

.format-details {
  display: flex;
  gap: 1.5rem;
}

.format-details span {
  color: var(--text-secondary);
}

.format-details strong {
  color: var(--text-primary);
}

.format-help {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-style: italic;
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

.parsing-options {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.parsing-options h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  background: var(--hover-bg);
}

.option-item input[type="checkbox"] {
  margin-top: 0.25rem;
}

.option-label {
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

.ignored-part {
  display: inline-block;
  margin: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--main-bg);
  border-radius: 4px;
  color: var(--text-secondary);
  font-family: monospace;
  font-size: 0.9rem;
}

.advanced-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.advanced-toggle {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--button-bg);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.advanced-toggle:hover {
  background: var(--button-hover-bg);
}

.advanced-content {
  margin-top: 1rem;
}

.advanced-help {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.advanced-help code {
  display: inline-block;
  margin: 0 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--main-bg);
  border-radius: 4px;
  font-family: monospace;
}

.ignore-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ignore-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.ignore-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.9rem;
}

.ignore-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.remove-ignore {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: var(--error-bg);
  color: var(--error-text);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  transition: all 0.2s ease;
}

.remove-ignore:hover {
  background: var(--error-hover-bg);
}

.add-ignore {
  margin-top: 0.5rem;
  padding: 0.75rem;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  width: 100%;
  text-align: center;
  transition: all 0.2s ease;
}

.add-ignore:hover {
  background: var(--button-hover-bg);
  border-color: var(--accent-color);
  color: var(--text-primary);
}

.config-management {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.config-header h4 {
  margin: 0;
  color: var(--text-primary);
}

.config-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.config-select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  min-width: 200px;
}

.save-config-btn,
.update-config-btn,
.delete-config-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-config-btn {
  background: var(--success-bg);
  color: var(--success-text);
}

.update-config-btn {
  background: var(--warning-bg);
  color: var(--warning-text);
}

.delete-config-btn {
  background: var(--error-bg);
  color: var(--error-text);
}

.save-config-btn:hover { background: var(--success-hover-bg); }
.update-config-btn:hover { background: var(--warning-hover-bg); }
.delete-config-btn:hover { background: var(--error-hover-bg); }

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
</style> 