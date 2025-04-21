<!-- Modal component for adding new knitting patterns -->
<template>
    <!-- Modal overlay with click-away functionality -->
    <div v-if="modelValue" class="modal-overlay">
      <!-- Modal container that prevents click propagation -->
      <div class="modal" @click.stop>
        <!-- Modal header with title and close button -->
        <div class="modal-header">
          <h2>Add New Pattern</h2>
          <button @click="$emit('update:modelValue', false)" class="close-button">×</button>
        </div>
        <div class="modal-content">
          <!-- Pattern name input field -->
          <div class="name-section">
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
  
          <!-- Pattern input section -->
          <div class="input-section">
            <label for="patternInput">Pattern Instructions</label>
            <textarea
              id="patternInput"
              v-model="patternInput"
              placeholder="Enter your pattern instructions (e.g., Round 1: 6 sc in a magic ring (6))"
              class="pattern-input"
              @input="detectAndParse"
            ></textarea>
          </div>
  
          <!-- Formatting options toggle -->
          <div v-if="patternInput.trim()" class="formatting-toggle">
            <button @click="toggleFormatting" class="toggle-button" :class="{ 'attention': patternInput.trim() && !parsedResults?.rows?.length }">
              <span>Formatting Options</span>
              <span class="toggle-icon">{{ showFormatting ? '−' : '+' }}</span>
            </button>
          </div>
  
          <!-- Pattern format configuration - only shown when formatting is toggled -->
          <div v-if="showFormatting && patternInput.trim()" class="format-section">
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
                    <label>Color:</label>
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
          </div>
  
          <!-- Results display section - only shown when formatting is toggled -->
          <div v-if="showFormatting && parsedResults" class="results-section">
            <h3>Pattern Preview</h3>
            
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
                <div class="parsed-rows-container">
                  <!-- Show first 3 rows by default -->
                  <div v-for="(row, index) in displayedRows" :key="index" class="parsed-row">
                    <div class="row-header">
                      <div class="row-header-content">
                        <h5 @click="toggleRow(row.number)">Row {{ row.number }}</h5>
                        <button class="toggle-btn small" @click="toggleRow(row.number)">
                          {{ rowStates[row.number] ? '−' : '+' }}
                        </button>
                      </div>
                    </div>
                    <div v-show="rowStates[row.number]" class="row-content">
                      <div class="row-details">
                        <div class="detail-item">
                          <strong>Raw:</strong> {{ row.rawPattern }}
                        </div>
                        <div v-if="row.ignoredParts.length > 0" class="detail-item">
                          <strong>Ignored:</strong>
                          <span v-for="(part, pIndex) in row.ignoredParts" :key="pIndex" class="ignored-part">
                            {{ part }}
                          </span>
                        </div>
                        <div class="detail-item">
                          <strong>Stitches:</strong>
                          <span class="stitch-list">{{ row.stitches.join(', ') }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Show More button if there are more rows -->
                  <button 
                    v-if="parsedResults.rows.length > displayLimit" 
                    @click="toggleShowMore" 
                    class="show-more-button"
                  >
                    {{ showingAll ? 'Show Less' : `Show ${parsedResults.rows.length - displayLimit} More Rows` }}
                  </button>
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
            <p class="error-message">{{ parseError }}</p>
          </div>
  
          <!-- Add error message in template -->
          <div v-if="patternInput.trim() && !parsedResults?.rows?.length" class="error-section">
            <p class="error-message">Pattern must be parsed into separate rows before saving.</p>
          </div>
  
          <!-- Modal action buttons -->
          <div class="modal-actions">
            <button 
              @click="savePattern"
              :disabled="!canSave"
              class="save-button"
            >
              {{ isLoading ? 'Saving...' : 'Save Pattern' }}
            </button>
            <button @click="$emit('update:modelValue', false)" class="cancel-button">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue'
  import { usePatternStore } from '../stores/pattern'
  import { useRouter } from 'vue-router'
  import { auth } from '@/firebase'
  
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
  
  // Store
  const patternStore = usePatternStore()
  
  // State
  const patternName = ref('')
  const patternInput = ref('')
  const rowFormat = ref('')
  const colorFormat = ref('')
  const parsedResults = ref(null)
  const parseError = ref(null)
  const detectedFormats = ref(null)
  const formattedPattern = ref([])
  
  // Section collapse states
  const sectionStates = ref({
    formatted: true,
    rows: true,
    color: true
  })
  
  // Individual row collapse states
  const rowStates = ref({})
  
  // Parsing configuration
  const parsingOptions = ref({
    ignoreStitchCounts: true,
    keepRepeatParentheses: true,
    ignoreStitchAbbrev: true,
    ignoreTurnMarkers: true
  })
  
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
  
  // Add new state for formatting toggle
  const showFormatting = ref(false)
  
  // Add new state for show more functionality
  const displayLimit = ref(3)
  const showingAll = ref(false)
  
  // Computed
  const canSave = computed(() => {
    const hasValidName = patternName.value.trim()
    const hasValidPattern = parsedResults.value?.rows?.length > 0
    const noErrors = !parseError.value
    
    // If we have input but no parsed rows, set an error
    if (patternInput.value.trim() && !hasValidPattern) {
      parseError.value = 'Unable to parse the pattern into rows. Please check your format in the Formatting Options section and make sure each row starts with "Round" or "Row" or something similar.'
    }
    
    return hasValidName && hasValidPattern && noErrors
  })
  
  // Computed property for displayed rows
  const displayedRows = computed(() => {
    return showingAll.value 
      ? parsedResults.value?.rows 
      : parsedResults.value?.rows?.slice(0, displayLimit.value)
  })
  
  // Reset form when modal is opened
  watch(() => props.modelValue, (newVal) => {
    if (newVal) {
      patternName.value = ''
      patternInput.value = ''
      rowFormat.value = ''
      colorFormat.value = ''
      parsedResults.value = null
      parseError.value = null
      formattedPattern.value = []
      detectedFormats.value = null
    }
  })
  
  // Watch for results to initialize row states
  watch(() => parsedResults.value?.rows, (newRows) => {
    if (newRows) {
      const states = {}
      newRows.forEach(row => {
        states[row.number] = row.number <= 3
      })
      rowStates.value = states
    }
  }, { immediate: true })
  
  // Create regex for row format
  const createRowRegex = (format) => {
    const formatWithVariations = format
      .replace(/Row/i, '(?:Row|Round|R|Rnd)')
      .replace(/Round/i, '(?:Row|Round|R|Rnd)')
      .replace(/R(?!ound)/i, '(?:Row|Round|R|Rnd)')
      .replace(/Rnd/i, '(?:Row|Round|R|Rnd)')
    
    const escapedFormat = formatWithVariations
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace('\\(?:Row\\|Round\\|R\\|Rnd\\)', '(?:Row|Round|R|Rnd)')
    
    const pattern = escapedFormat.replace('#', '(\\d+)')
    return new RegExp(pattern, 'i')
  }
  
  // Pattern format detection
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
  
  // Clean pattern text
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
  
    return {
      text: cleanedText.trim(),
      ignoredParts
    }
  }
  
  // Preprocess input
  const preprocessInput = (input) => {
    // Remove any standalone numbers
    let processed = input.replace(/^\d+$/gm, '')
  
    // Handle title and section headers
    const titleMatch = input.match(/^[A-Za-z\s]+$/m)
    const title = titleMatch ? titleMatch[0].trim() : null
  
    // First, join lines that are part of the same row
    processed = processed.split('\n').reduce((acc, line, index, arr) => {
      line = line.trim()
      if (!line) return acc
      
      // If line starts with "Row" or has "With Color", it's a new row
      if (line.match(/^Row\s+\d+/) || line.match(/^With Color/)) {
        if (acc.length) acc.push('\n')
        acc.push(line)
      } else {
        // If previous line exists and doesn't end with period, this is a continuation
        if (acc.length && !acc[acc.length - 1].endsWith('.')) {
          acc[acc.length - 1] += ' ' + line
        } else {
          if (acc.length) acc.push('\n')
          acc.push(line)
        }
      }
      return acc
    }, []).join('')
  
    // Handle color instructions at the start of rows
    processed = processed.replace(/^(Row \d+): With Color ([A-Z]),\s*/gm, 'Row $1 [Color $2]: ')
    processed = processed.replace(/^With Color ([A-Z]),\s*(Row \d+):/gm, 'Row $2 [Color $1]: ')
  
    // Remove "FO." and similar ending instructions
    processed = processed.replace(/\s*FO\.\s*/g, '')
    processed = processed.replace(/\s*Stuff\.\s*/g, '')
  
    // Handle stitch counts at the end of rows
    const stitchCountRegex = /\(Stitch Count:[^)]+\)/g
    const stitchCounts = {}
    let match
    while ((match = stitchCountRegex.exec(processed)) !== null) {
      const rowMatch = processed.slice(0, match.index).match(/Row (\d+)[^\n]*$/)
      if (rowMatch) {
        stitchCounts[rowMatch[1]] = match[0]
      }
    }
    
    // Remove the stitch counts from the main text
    processed = processed.replace(/\s*\(Stitch Count:[^)]+\)/g, '')
  
    // Split on newlines and clean up each line
    processed = processed.split('\n')
      .map(line => {
        line = line.trim()
        if (!line) return ''
        
        // Extract row number
        const rowMatch = line.match(/Row (\d+)/)
        if (rowMatch) {
          const rowNum = rowMatch[1]
          // Add back stitch count if we have it
          if (stitchCounts[rowNum]) {
            line += ' ' + stitchCounts[rowNum]
          }
        }
        return line
      })
      .filter(Boolean)
      .join('\n')
  
    return {
      title,
      pattern: processed
    }
  }
  
  // Parse a single row
  const parseRow = (rowText, rowNum) => {
    try {
      // Extract color if present
      let color = null
      const colorMatch = rowText.match(/\[Color ([A-Z])\]/)
      if (colorMatch) {
        color = colorMatch[1]
        rowText = rowText.replace(/\[Color [A-Z]\]:\s*/, '')
      }
  
      // Remove all instances of "Row X" and clean up
      rowText = rowText.replace(/^Row\s+\d+\s*:?\s*/, '') // Remove first Row prefix
      rowText = rowText.replace(/Row\s+\d+\s*/g, '') // Remove any remaining Row mentions
      
      // Extract stitch count if present
      let stitchCount = null
      const stitchCountMatch = rowText.match(/\(Stitch Count:[^)]+\)/)
      if (stitchCountMatch) {
        stitchCount = stitchCountMatch[0]
        rowText = rowText.replace(stitchCountMatch[0], '').trim()
      }
  
      // Clean up any extra spaces or commas
      rowText = rowText.replace(/\s+/g, ' ').trim()
      rowText = rowText.replace(/,\s*,/g, ',')
      rowText = rowText.replace(/\s*,\s*/g, ', ')
  
      // Split into stitches
      const stitches = rowText.split(',').map(s => s.trim()).filter(Boolean)
  
      return {
        number: rowNum,
        color,
        rawPattern: rowText,
        stitches,
        ignoredParts: stitchCount ? [stitchCount] : []
      }
    } catch (error) {
      console.error('Error parsing row:', error)
      return null
    }
  }
  
  // Parse the entire pattern
  const parsePattern = () => {
    parseError.value = null
    formattedPattern.value = []
    
    if (!patternInput.value.trim()) {
      parsedResults.value = null
      return
    }
  
    try {
      const { title, pattern } = preprocessInput(patternInput.value.trim())
      let rows = []
  
      // Split into rows and parse each one
      const lines = pattern.split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        
        // More flexible row pattern matching
        const match = line.match(/Row\s*(\d+)(?:\s*\[Color [A-Z]\])?\s*:/)
        if (match) {
          const rowNum = parseInt(match[1])
          const parsedRow = parseRow(line, rowNum)
          if (parsedRow) {
            rows.push(parsedRow)
          }
        }
      }
  
      // Sort rows by number
      rows.sort((a, b) => a.number - b.number)
  
      parsedResults.value = {
        title,
        rows
      }
  
      // Update formatted pattern
      const formattedRows = rows.map(row => {
        let formattedRow = `Row ${row.number}`
        if (row.color) {
          formattedRow += ` [Color ${row.color}]`
        }
        formattedRow += `: ${row.stitches.join(', ')}`
        
        // Add stitch count if present
        const stitchCount = row.ignoredParts.find(part => part.startsWith('(Stitch Count:'))
        if (stitchCount) {
          formattedRow += ` ${stitchCount}`
        }
        
        return formattedRow
      })
  
      formattedPattern.value = title ? [title, ...formattedRows] : formattedRows
  
      // Log for debugging
      console.log('Parsed Results:', parsedResults.value)
      console.log('Formatted Pattern:', formattedPattern.value)
  
    } catch (error) {
      console.error('Error parsing pattern:', error)
      parseError.value = 'Unable to parse the pattern. Please check your format matches the example.'
      parsedResults.value = null
    }
  }
  
  const detectAndParse = () => {
    detectFormats(patternInput.value)
    parsePattern()
  }
  
  const toggleSection = (section) => {
    sectionStates.value[section] = !sectionStates.value[section]
  }
  
  const toggleRow = (rowNumber) => {
    rowStates.value[rowNumber] = !rowStates.value[rowNumber]
  }
  
  // Toggle show more function
  const toggleShowMore = () => {
    showingAll.value = !showingAll.value
  }
  
  // Save the pattern
  const savePattern = async () => {
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        parseError.value = 'Please sign in to save patterns.'
        return
      }

      if (!parsedResults.value?.rows?.length) {
        parseError.value = 'No valid rows found in the pattern.'
        return
      }

      // Format the pattern content in the same way as AddPatternModal
      const patternContent = parsedResults.value.rows.map(row => {
        let rowText = `Row ${row.number}`
        if (row.color) {
          rowText += ` [Color ${row.color}]`
        }
        rowText += `: ${row.stitches.join(', ')}`
        
        // Add stitch count if present
        const stitchCount = row.ignoredParts.find(part => part.startsWith('(Stitch Count:'))
        if (stitchCount) {
          rowText += ` ${stitchCount}`
        }
        
        return rowText
      }).join('\n')

      // Emit the pattern in the same format as AddPatternModal
      emit('pattern-added', {
        name: patternName.value.trim(),
        content: patternContent
      })
      emit('update:modelValue', false)
    } catch (error) {
      console.error('Error saving pattern:', error)
      parseError.value = 'Error saving pattern: ' + (error.message || 'Please try again.')
    }
  }
  
  // Add toggle function
  const toggleFormatting = () => {
    showFormatting.value = !showFormatting.value
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
    width: min(800px, 90%);
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
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--input-bg);
    color: var(--text-primary);
    font-size: 1rem;
  }
  
  .pattern-name-input:focus {
    outline: none;
    border-color: var(--accent-color);
  }
  
  /* Pattern instructions textarea styles */
  .pattern-input {
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
  
  :root.light .pattern-input {
    border: 2px solid #e0e0e0;
    background-color: #ffffff;
    color: #333;
  }
  
  .pattern-input:focus {
    outline: none;
    border-color: var(--accent-color);
  }
  
  /* Modal action buttons container */
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }
  
  .save-button,
  .cancel-button {
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .save-button {
    background-color: #4CAF50;
    color: white;
    border: 1px solid #43A047;
  }
  
  .save-button:hover:not(:disabled) {
    background-color: #43A047;
  }
  
  .save-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #4CAF50;
    color: white;
  }
  
  .cancel-button {
    background-color: var(--button-bg);
    color: var(--button-text);
    border: 1px solid var(--button-border);
  }
  
  .cancel-button:hover {
    background-color: var(--button-hover-bg);
  }
  
  /* Additional styles */
  .name-section {
    margin-bottom: 2rem;
  }
  
  .input-section {
    margin-bottom: 2rem;
  }
  
  .format-section {
    margin-top: 1.5rem;
    margin-bottom: 2rem;
    transition: all 0.3s ease;
  }
  
  .detected-format {
    padding: 1rem 1.5rem;
    background: var(--card-bg);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    margin-top: 1rem;
  }
  
  .format-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .format-info:last-child {
    margin-bottom: 0;
  }
  
  .format-label {
    color: var(--text-secondary);
    font-size: 0.9rem;
    min-width: 120px;
  }
  
  .format-value {
    color: var(--text-primary);
    font-weight: 500;
  }
  
  .results-section {
    margin-top: 1.5rem;
    margin-bottom: 2rem;
    transition: all 0.3s ease;
  }
  
  .result-group {
    margin-bottom: 1rem;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .toggle-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1rem;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;
  }
  
  .toggle-btn:hover {
    color: var(--text-primary);
  }
  
  :root.light .toggle-btn {
    color: #999;
  }
  
  :root.light .toggle-btn:hover {
    color: #333;
  }
  
  .result-content {
    padding-left: 1rem;
  }
  
  .parsed-row {
    margin-bottom: 0.5rem;
  }
  
  .stitch-list {
    list-style-type: disc;
    padding-left: 1rem;
  }
  
  .error-message {
    color: var(--error-color);
    margin: 0;
    padding: 1rem;
    background-color: var(--error-bg);
    border-radius: 8px;
  }
  
  /* Modal width adjustment for the new layout */
  .modal {
    width: min(800px, 90%);
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
    .pattern-input {
      font-size: 1.1rem;
      padding: 1.2rem;
    }
  
    .pattern-input {
      min-height: 300px;
    }
  
    .modal-actions {
      margin-top: 3rem;
    }
  }
  
  /* Quick Settings Panel */
  .quick-settings {
    padding: 1.5rem;
    display: flex;
    gap: 2rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--card-bg);
    border-radius: 12px 12px 0 0;
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
  
  /* Common Options */
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
  
  /* Results Section */
  .results-section {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 2rem;
  }
  
  .results-section h3 {
    margin: 0 0 1.5rem;
    color: var(--text-primary);
    font-size: 1.3rem;
    font-weight: 600;
  }
  
  .result-group {
    margin-bottom: 2rem;
    background: var(--main-bg);
    border-radius: 8px;
    overflow: hidden;
  }
  
  .result-group:last-child {
    margin-bottom: 0;
  }
  
  .section-header {
    padding: 1rem 1.5rem;
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
  }
  
  .section-header h4 {
    margin: 0;
    color: var(--accent-color);
    font-size: 1.1rem;
  }
  
  .result-content {
    padding: 1.5rem;
  }
  
  /* Formatted Pattern */
  .formatted-pattern {
    font-family: monospace;
    white-space: pre-wrap;
    line-height: 1.5;
  }
  
  .formatted-pattern p {
    margin: 0.5rem 0;
  }
  
  .formatted-pattern p:first-child {
    margin-top: 0;
  }
  
  .formatted-pattern p:last-child {
    margin-bottom: 0;
  }
  
  /* Parsed Rows */
  .parsed-rows-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .parsed-row {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--card-bg);
  }
  
  .row-header {
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .row-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  
  .row-header-content h5 {
    margin: 0;
    color: var(--accent-color);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }
  
  .toggle-btn.small {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: var(--accent-color);
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .toggle-btn.small:hover {
    opacity: 0.8;
  }
  
  .row-content {
    padding: 0.5rem;
    border-radius: 4px;
  }
  
  .row-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  
  .detail-item {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }
  
  .detail-item strong {
    min-width: 70px;
    color: var(--text-secondary);
  }
  
  .stitch-list {
    font-family: monospace;
  }
  
  /* Show More button styles */
  .show-more-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--accent-color);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
  }
  
  .show-more-button:hover {
    background: var(--hover-bg);
  }
  
  /* Update ignored parts for inline display */
  .ignored-part {
    display: inline-block;
    margin: 0 0.25rem;
    padding: 0.25rem 0.5rem;
    background: var(--tag-bg);
    border-radius: 4px;
    font-size: 0.85rem;
  }
  
  /* Toggle Button */
  .toggle-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .toggle-button.attention {
    background-color: #ff980020;
    border-color: #FF9800;
    color: #FF9800;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(255, 152, 0, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
    }
  }
  
  .toggle-button:hover {
    background: var(--hover-bg);
  }
  
  .toggle-button.attention:hover {
    background-color: #ff980030;
  }
  
  .toggle-icon {
    font-size: 1.2rem;
    font-weight: bold;
    color: var(--accent-color);
  }
  
  :root.light .toggle-button {
    background: #ffffff;
    border-color: #e0e0e0;
  }
  
  :root.light .toggle-button:hover {
    background: #f5f5f5;
  }
  
  /* Add new styles for the format helper button */
  .format-helper-button {
    display: block;
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid currentColor;
    border-radius: 6px;
    color: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .format-helper-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  </style> 