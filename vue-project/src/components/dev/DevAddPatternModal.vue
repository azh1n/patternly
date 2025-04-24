<!-- Modal component for adding new knitting patterns -->
<template>
  <div v-if="modelValue" class="pattern-modal-overlay" @click="closeModal">
    <div class="pattern-modal" @click.stop>
      <div class="modal-header">
        <h2>Add Pattern</h2>
        <button class="close-button" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Pattern Name -->
        <div class="form-group">
          <label for="patternName">Pattern Name</label>
          <input 
            type="text" 
            id="patternName" 
            v-model="patternName" 
            placeholder="Enter pattern name"
            class="form-input"
          />
        </div>
        
        <!-- Pattern Input -->
        <div class="form-group">
          <label for="patternText">Pattern Instructions</label>
          <textarea 
            id="patternText" 
            v-model="patternText" 
            placeholder="Paste your pattern here..."
            class="form-textarea"
            @input="analyzePattern"
          ></textarea>
        </div>
        
        <!-- Analysis Results -->
        <div v-if="patternText" class="analysis-section">
          <h3 class="section-title">
            <span>Pattern Analysis</span>
            <button class="toggle-button" @click="showAnalysis = !showAnalysis">
              {{ showAnalysis ? '−' : '+' }}
            </button>
          </h3>
          
          <div v-if="showAnalysis" class="analysis-content">
            <!-- Detection Results -->
            <div class="detection-results">
              <div class="detection-item">
                <span class="label">Row Format:</span>
                <span class="value">{{ detectedRowFormat || 'Not detected' }}</span>
                <button v-if="!detectedRowFormat" class="action-button" @click="showRowConfig = true">
                  Define
                </button>
              </div>
              
              <div class="detection-item">
                <span class="label">Colors:</span>
                <span class="value">{{ detectedColors.length ? detectedColors.join(', ') : 'Not detected' }}</span>
                <button v-if="!detectedColors.length" class="action-button" @click="showColorConfig = true">
                  Define
                </button>
              </div>
              
              <div class="detection-item">
                <span class="label">Stitches:</span>
                <span class="value">{{ detectedStitches.length ? detectedStitches.join(', ') : 'Not detected' }}</span>
              </div>
            </div>
            
            <!-- Configuration Panel -->
            <div v-if="showRowConfig || showColorConfig" class="config-panel">
              <!-- Row Format Configuration -->
              <div v-if="showRowConfig" class="config-section">
                <h4>Define Row Format</h4>
                <p class="help-text">Enter the pattern used to identify rows (use # for row number)</p>
                <div class="input-group">
                  <input 
                    type="text" 
                    v-model="userRowFormat" 
                    placeholder="Example: Row #, Round #, R#" 
                    class="form-input"
                  />
                  <button @click="applyRowFormat" class="apply-button">Apply</button>
                </div>
                <div class="examples">
                  <p>Examples: "Row #", "Round #", "R#", "Rnd #"</p>
                </div>
              </div>
              
              <!-- Color Configuration -->
              <div v-if="showColorConfig" class="config-section">
                <h4>Define Color Format</h4>
                <p class="help-text">Enter how colors are referenced in your pattern</p>
                <div class="input-group">
                  <input 
                    type="text" 
                    v-model="userColorFormat" 
                    placeholder="Example: Color A, MC" 
                    class="form-input"
                  />
                  <button @click="applyColorFormat" class="apply-button">Apply</button>
                </div>
                <div class="examples">
                  <p>Examples: "Color A", "MC", "Pink", etc.</p>
                </div>
              </div>
            </div>
            
            <!-- Parsed Rows -->
            <div v-if="parsedRows.length" class="parsed-rows">
              <h4>Parsed Rows</h4>
              <div class="rows-list">
                <div v-for="(row, index) in parsedRows" :key="index" class="parsed-row">
                  <div class="row-header" @click="toggleRowDetails(index)">
                    <span class="row-number">Row {{ row.number }}</span>
                    <span class="row-color" v-if="row.color">{{ row.color }}</span>
                    <button class="toggle-button small">{{ expandedRows[index] ? '−' : '+' }}</button>
                  </div>
                  <div v-if="expandedRows[index]" class="row-details">
                    <p class="row-text">{{ row.text }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Pattern Preview Section -->
            <div v-if="parsedRows.length" class="pattern-preview-section">
              <h4>Pattern Preview</h4>
              <div class="pattern-preview">
                <div v-for="(row, index) in parsedRows" :key="index" class="preview-row">
                  <div class="preview-row-header">
                    <span class="preview-row-number">Row {{ row.number }}</span>
                    <div v-if="row.color" class="color-indicator" :style="{ backgroundColor: getColorHex(row.color) }"></div>
                  </div>
                  <div class="preview-row-content">
                    <div class="preview-stitches">
                      <template v-for="(stitch, i) in row.stitches" :key="i">
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
          </div>
        </div>
        
        <!-- Error Messages -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            @click="savePattern" 
            class="save-button" 
            :disabled="!canSave"
          >
            {{ isLoading ? 'Saving...' : 'Save Pattern' }}
          </button>
          <button @click="closeModal" class="cancel-button">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { usePatternStore } from '@/stores/pattern'
import { auth } from '@/firebase'

// Props and emits
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

const emit = defineEmits(['update:modelValue', 'pattern-added'])

// Store
const patternStore = usePatternStore()

// Form state
const patternName = ref('')
const patternText = ref('')
const errorMessage = ref('')

// UI state
const showAnalysis = ref(true)
const showRowConfig = ref(false)
const showColorConfig = ref(false)
const expandedRows = ref({})

// Pattern analysis state
const detectedRowFormat = ref('')
const userRowFormat = ref('')
const detectedColors = ref([])
const userColorFormat = ref('')
const detectedStitches = ref([])
const parsedRows = ref([])

// Computed properties
const canSave = computed(() => {
  const hasValidName = patternName.value.trim().length > 0;
  const hasInput = patternText.value.trim().length > 0;
  
  // Allow saving if there's a name and pattern text, even if parsing is limited
  return hasValidName && hasInput;
})

// Common patterns for detection
const commonRowPatterns = [
  { pattern: /^Row\s+(\d+)/i, format: 'Row #' },
  { pattern: /^Round\s+(\d+)/i, format: 'Round #' },
  { pattern: /^Round\s+(\d+)\s+\(/i, format: 'Round #' }, // Format like "Round 57 (3sc, 1dec)"
  { pattern: /^R\s*(\d+)/i, format: 'R#' },
  { pattern: /^Rnd\s*(\d+)/i, format: 'Rnd #' }
]

const commonColorPatterns = [
  { pattern: /with\s+color\s+([A-Za-z]+)/i, format: 'color' },
  { pattern: /\bMC\b/i, format: 'MC' },
  { pattern: /\bCC\d*\b/i, format: 'CC' },
  { pattern: /\bcolor\s+([A-Za-z])\b/i, format: 'color' }
]

// Common crochet stitch patterns
const stitchPatterns = [
  { pattern: /\b(\d+)sc\b/i, name: 'sc' },  // single crochet with no space
  { pattern: /\b(\d+)\s*sc\b/i, name: 'sc' },  // single crochet
  { pattern: /\b(\d+)inc\b/i, name: 'inc' },  // increase with no space
  { pattern: /\b(\d+)\s*inc\b/i, name: 'inc' },  // increase
  { pattern: /\binc\b/i, name: 'inc' },        // increase without number
  { pattern: /\b(\d+)dec\b/i, name: 'dec' },  // decrease with no space
  { pattern: /\b(\d+)\s*dec\b/i, name: 'dec' },  // decrease
  { pattern: /\bdec\b/i, name: 'dec' },        // decrease without number
  { pattern: /\b(\d+)\s*dc\b/i, name: 'dc' },  // double crochet
  { pattern: /\b(\d+)\s*hdc\b/i, name: 'hdc' }, // half double crochet
  { pattern: /\b(\d+)\s*tr\b/i, name: 'tr' },  // treble crochet
  { pattern: /\b(\d+)\s*dtr\b/i, name: 'dtr' }, // double treble crochet
  { pattern: /\b(\d+)\s*sl\s*st\b/i, name: 'sl st' }, // slip stitch
  { pattern: /\bch\s*(\d+)\b/i, name: 'ch' },  // chain
  { pattern: /\bsk\s*(\d+)\b/i, name: 'sk' },  // skip
  { pattern: /\bst\b/i, name: 'st' },          // stitch
  { pattern: /\bsts\b/i, name: 'sts' },        // stitches
  { pattern: /\bsp\b/i, name: 'sp' }           // space
]

// Reset the form when modal opens
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

// Methods

// Reset form to initial state
const resetForm = () => {
  patternName.value = ''
  patternText.value = ''
  errorMessage.value = ''
  detectedRowFormat.value = ''
  userRowFormat.value = ''
  detectedColors.value = []
  userColorFormat.value = ''
  detectedStitches.value = []
  parsedRows.value = []
  expandedRows.value = {}
  showRowConfig.value = false
  showColorConfig.value = false
  showAnalysis.value = true
}

// Close the modal
const closeModal = () => {
  emit('update:modelValue', false)
}

// Analyze the pattern text
const analyzePattern = () => {
  if (!patternText.value.trim()) {
    parsedRows.value = []
    return
  }

  try {
    // Clear previous error
    errorMessage.value = ''
    
    // Detect row format
    detectRowFormat()
    
    // Detect colors
    detectColors()
    
    // Detect stitches
    detectStitches()
    
    // Parse rows based on detected or user-defined format
    parseRows()
  } catch (error) {
    console.error('Error analyzing pattern:', error)
    errorMessage.value = 'Error analyzing pattern: ' + error.message
  }
}

// Detect row format in the pattern
const detectRowFormat = () => {
  if (userRowFormat.value) {
    // User has already defined a format
    detectedRowFormat.value = userRowFormat.value
    return
  }
  
  const lines = patternText.value.split('\n')
  
  for (const line of lines) {
    for (const pattern of commonRowPatterns) {
      if (pattern.pattern.test(line)) {
        detectedRowFormat.value = pattern.format
        return
      }
    }
  }
  
  // No format detected
  detectedRowFormat.value = ''
}

// Detect colors in the pattern
const detectColors = () => {
  if (userColorFormat.value) {
    // If user has specified a color format, we'll use that later
    return
  }
  
  const text = patternText.value
  const colors = new Set()
  
  for (const pattern of commonColorPatterns) {
    const matches = text.match(new RegExp(pattern.pattern, 'gi'))
    if (matches) {
      matches.forEach(match => {
        const colorMatch = match.match(pattern.pattern)
        if (colorMatch && colorMatch[1]) {
          colors.add(colorMatch[1])
        } else {
          colors.add(pattern.format)
        }
      })
    }
  }
  
  detectedColors.value = Array.from(colors)
}

// Detect stitches in the pattern
const detectStitches = () => {
  const text = patternText.value
  const stitches = new Set()
  
  // Handle pattern with parentheses like "Round 57 (3sc, 1dec) x8 (32)"
  const parenthesesMatches = text.match(/\(([^)]+)\)/g);
  
  if (parenthesesMatches && parenthesesMatches.length > 0) {
    // Find the first set of parentheses that doesn't just contain a number
    for (const parenthesesMatch of parenthesesMatches) {
      const content = parenthesesMatch.replace(/[()]/g, '').trim();
      
      // Skip if it's just a number (likely stitch count)
      if (/^\d+$/.test(content)) continue;
      
      // If there's an "x" with a number (like "x6"), it means we need to repeat these stitches
      const repeatMatch = text.match(/\([^)]+\)\s*x(\d+)/);
      const repeatCount = repeatMatch ? parseInt(repeatMatch[1]) : 1;
      
      // Split by commas and process each stitch
      const stitchParts = content.split(',').map(part => part.trim());
      
      // For each stitch instruction
      for (const part of stitchParts) {
        // Try to match directly with our common patterns
        let matched = false;
        
        // Check for "1sc" or "3sc" pattern
        const scMatch = part.match(/(\d+)sc/i);
        if (scMatch) {
          stitches.add(`${scMatch[1]}sc`);
          matched = true;
        }
        
        // Check for "1inc" or "inc" pattern
        const incMatch = part.match(/(?:(\d+)inc|inc)/i);
        if (incMatch) {
          const count = incMatch[1] || '1';
          stitches.add(`${count}inc`);
          matched = true;
        }
        
        // Check for "1dec" or "dec" pattern
        const decMatch = part.match(/(?:(\d+)dec|dec)/i);
        if (decMatch) {
          const count = decMatch[1] || '1';
          stitches.add(`${count}dec`);
          matched = true;
        }
        
        // If we didn't match any specific pattern, try the general patterns
        if (!matched) {
          for (const pattern of stitchPatterns) {
            const match = part.match(pattern.pattern);
            if (match) {
              const count = match[1] || '1';
              stitches.add(`${count}${pattern.name}`);
              break;
            }
          }
        }
      }
      
      // If we found stitches in this set of parentheses, no need to check others
      if (stitches.size > 0) {
        break;
      }
    }
  }
  
  // If no stitches found inside parentheses, check the entire text
  if (stitches.size === 0) {
    for (const pattern of stitchPatterns) {
      const matches = Array.from(text.matchAll(new RegExp(pattern.pattern, 'gi')));
      for (const match of matches) {
        const count = match[1] || '1';
        stitches.add(`${count}${pattern.name}`);
      }
    }
  }
  
  detectedStitches.value = Array.from(stitches)
}

// Create regex for row format
const createRowRegex = (format) => {
  // Replace known keywords with their regex equivalents
  let regexFormat = format
    .replace(/Row/i, '(?:Row|R)')
    .replace(/Round/i, '(?:Round|Rnd)')
    .replace(/R(?!ound)/i, '(?:Row|R)')
    .replace(/Rnd/i, '(?:Round|Rnd)')
  
  // Escape special regex characters except those we just added
  regexFormat = regexFormat
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Restore our special patterns
    .replace(/\\\(\\\?:\\\w+\\\|\\\w+\\\)/g, match => {
      return match.replace(/\\/g, '')
    })
  
  // Replace # with capture group for row number
  regexFormat = regexFormat.replace(/#/g, '(\\d+)')
  
  return new RegExp(regexFormat, 'i')
}

// Parse the rows in the pattern
const parseRows = () => {
  if (!patternText.value.trim()) {
    parsedRows.value = []
    return
  }
  
  // If no row format is detected and user hasn't defined one, we can't parse
  if (!detectedRowFormat.value && !userRowFormat.value) {
    // Set default for Round format seen in the screenshot
    if (patternText.value.includes('Round')) {
      detectedRowFormat.value = 'Round #'
    } else {
      parsedRows.value = []
      return
    }
  }
  
  const rowRegex = createRowRegex(detectedRowFormat.value || userRowFormat.value)
  const text = patternText.value
  const lines = text.split('\n').filter(line => line.trim())
  
  const rows = []
  let currentRow = null
  let currentRowText = ''
  
  // First pass - identify row boundaries
  for (const line of lines) {
    const rowMatch = line.match(rowRegex)
    
    if (rowMatch) {
      // Save previous row if exists
      if (currentRow !== null && currentRowText) {
        rows.push({
          number: currentRow,
          text: currentRowText.trim(),
          color: extractColor(currentRowText),
          stitches: extractStitches(currentRowText)
        })
      }
      
      // Start new row
      currentRow = parseInt(rowMatch[1])
      currentRowText = line
    } else if (currentRow !== null) {
      // Continue current row
      currentRowText += ' ' + line
    }
  }
  
  // Add the last row
  if (currentRow !== null && currentRowText) {
    rows.push({
      number: currentRow,
      text: currentRowText.trim(),
      color: extractColor(currentRowText),
      stitches: extractStitches(currentRowText)
    })
  }
  
  // If still no rows parsed but we have pattern text, try a more aggressive approach
  if (rows.length === 0 && patternText.value.trim()) {
    // Look for potential rows that might be formatted differently
    const roundMatches = patternText.value.match(/Round\s+(\d+)[^\n]*/g);
    if (roundMatches) {
      roundMatches.forEach(match => {
        const numberMatch = match.match(/Round\s+(\d+)/);
        if (numberMatch) {
          const rowNum = parseInt(numberMatch[1]);
          rows.push({
            number: rowNum,
            text: match.trim(),
            color: '',
            stitches: extractStitches(match)
          });
        }
      });
    }
  }
  
  // Sort rows by number
  rows.sort((a, b) => a.number - b.number)
  
  // Initialize expanded state for first 3 rows
  const expanded = {}
  rows.forEach((row, index) => {
    expanded[index] = index < 3
  })
  expandedRows.value = expanded
  
  parsedRows.value = rows
}

// Extract color from row text
const extractColor = (text) => {
  // If user has specified a color format, use that
  if (userColorFormat.value) {
    const colorPattern = new RegExp(`\\b${userColorFormat.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const match = text.match(colorPattern)
    return match ? match[0] : ''
  }
  
  // Otherwise use detected patterns
  for (const pattern of commonColorPatterns) {
    const match = text.match(pattern.pattern)
    if (match) {
      return match[1] || pattern.format
    }
  }
  
  return ''
}

// Extract stitches from row text
const extractStitches = (text) => {
  const foundStitches = [];
  
  // Handle pattern with parentheses like "Round 3 (1sc, 1inc) x6 (18)"
  const parenthesesMatches = text.match(/\(([^)]+)\)/g);
  
  if (parenthesesMatches && parenthesesMatches.length > 0) {
    // Find the first set of parentheses that doesn't just contain a number
    for (const parenthesesMatch of parenthesesMatches) {
      const content = parenthesesMatch.replace(/[()]/g, '').trim();
      
      // Skip if it's just a number (likely stitch count)
      if (/^\d+$/.test(content)) continue;
      
      // If there's an "x" with a number (like "x6"), it means we need to repeat these stitches
      const repeatMatch = text.match(/\([^)]+\)\s*x(\d+)/);
      const repeatCount = repeatMatch ? parseInt(repeatMatch[1]) : 1;
      
      // Split by commas and process each stitch
      const stitchParts = content.split(',').map(part => part.trim());
      
      // For each stitch instruction
      for (const part of stitchParts) {
        // Try to match directly with our common patterns
        let matched = false;
        
        // Check for "1sc" or "3sc" pattern
        const scMatch = part.match(/(\d+)sc/i);
        if (scMatch) {
          foundStitches.push(`${scMatch[1]}sc`);
          matched = true;
        }
        
        // Check for "1inc" or "inc" pattern
        const incMatch = part.match(/(?:(\d+)inc|inc)/i);
        if (incMatch) {
          const count = incMatch[1] || '1';
          foundStitches.push(`${count}inc`);
          matched = true;
        }
        
        // Check for "1dec" or "dec" pattern
        const decMatch = part.match(/(?:(\d+)dec|dec)/i);
        if (decMatch) {
          const count = decMatch[1] || '1';
          foundStitches.push(`${count}dec`);
          matched = true;
        }
        
        // If we didn't match any specific pattern, try the general patterns
        if (!matched) {
          for (const pattern of stitchPatterns) {
            const match = part.match(pattern.pattern);
            if (match) {
              const count = match[1] || '1';
              foundStitches.push(`${count}${pattern.name}`);
              break;
            }
          }
        }
      }
      
      // If we found stitches in this set of parentheses, no need to check others
      if (foundStitches.length > 0) {
        break;
      }
    }
  }
  
  // If no stitches found inside parentheses, check the entire text
  if (foundStitches.length === 0) {
    for (const pattern of stitchPatterns) {
      const matches = Array.from(text.matchAll(new RegExp(pattern.pattern, 'gi')));
      for (const match of matches) {
        const count = match[1] || '1';
        foundStitches.push(`${count}${pattern.name}`);
      }
    }
  }
  
  // Remove duplicates and return
  return [...new Set(foundStitches)];
}

// Apply user-defined row format
const applyRowFormat = () => {
  if (userRowFormat.value) {
    detectedRowFormat.value = userRowFormat.value
    showRowConfig.value = false
    parseRows()
  }
}

// Apply user-defined color format
const applyColorFormat = () => {
  if (userColorFormat.value) {
    showColorConfig.value = false
    parseRows() // Re-parse with new color format
  }
}

// Toggle row details visibility
const toggleRowDetails = (index) => {
  expandedRows.value = {
    ...expandedRows.value,
    [index]: !expandedRows.value[index]
  }
}

// Save the pattern
const savePattern = async () => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      errorMessage.value = 'Please sign in to save patterns.'
      return
    }

    // Get pattern text - either use parsed rows or raw input if parsing failed
    let formattedPattern = patternText.value;
    
    if (parsedRows.value.length > 0) {
      // If we successfully parsed rows, use the structured format
      formattedPattern = parsedRows.value.map(row => {
        const colorInfo = row.color ? `with ${row.color}, ` : ''
        return `Row ${row.number}: ${colorInfo}${row.stitches.join(', ')}`
      }).join('. ')
    }

    // Emit the pattern data
    emit('pattern-added', {
      name: patternName.value.trim(),
      content: formattedPattern
    })
    
    // Close the modal
    closeModal()
  } catch (error) {
    console.error('Error saving pattern:', error)
    errorMessage.value = 'Error saving pattern: ' + error.message
  }
}

// Pattern preview helper methods
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
    'stitch-dec': type === 'dec'
  }
}

const getColorHex = (color) => {
  // Map color identifiers to hex values
  const colorMap = {
    'A': '#ff5252', // Red
    'B': '#4caf50', // Green
    'C': '#2196f3', // Blue
    'D': '#ffc107', // Yellow
    'E': '#9c27b0', // Purple
    'F': '#ff9800', // Orange
    'MC': '#333333', // Main Color (dark)
    'CC': '#e91e63', // Contrast Color (pink)
    'CC1': '#e91e63', // Contrast Color 1
    'CC2': '#00bcd4', // Contrast Color 2
    'Red': '#ff5252',
    'Green': '#4caf50',
    'Blue': '#2196f3',
    'Yellow': '#ffc107',
    'Purple': '#9c27b0',
    'Orange': '#ff9800',
    'Pink': '#e91e63',
    'Turquoise': '#00bcd4'
  }
  
  // If we can match the color to our map, return the hex
  const colorKey = Object.keys(colorMap).find(key => 
    color.toLowerCase().includes(key.toLowerCase())
  )
  
  return colorKey ? colorMap[colorKey] : '#888888' // Default gray
}
</script>

<style scoped>
/* Modal Overlay */
.pattern-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

/* Modal Container */
.pattern-modal {
  width: 100%;
  max-width: 700px;
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

.form-textarea {
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  background: var(--input-bg, #333);
  color: var(--text-primary, #fff);
  font-size: 1rem;
  resize: vertical;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--accent-color, #4f87ff);
}

/* Analysis Section */
.analysis-section {
  margin-top: 1.5rem;
  border: 1px solid var(--border-color, #444);
  border-radius: 8px;
  overflow: hidden;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  padding: 1rem;
  background: var(--section-header-bg, #333);
  color: var(--text-primary, #fff);
  font-size: 1.25rem;
  font-weight: 600;
  cursor: default;
}

.toggle-button {
  background: none;
  border: none;
  color: var(--accent-color, #4f87ff);
  font-size: 1.25rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-button.small {
  font-size: 1rem;
  width: 20px;
  height: 20px;
}

/* Analysis Content */
.analysis-content {
  padding: 1rem;
}

/* Detection Results */
.detection-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.detection-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: var(--item-bg, #333);
  border-radius: 6px;
  gap: 0.75rem;
}

.detection-item .label {
  color: var(--text-secondary, #aaa);
  font-weight: 500;
  min-width: 100px;
}

.detection-item .value {
  color: var(--text-primary, #fff);
  flex: 1;
}

.action-button {
  padding: 0.25rem 0.75rem;
  background: var(--accent-color, #4f87ff);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.action-button:hover {
  background: var(--accent-hover, #3b6fdf);
}

/* Configuration Panel */
.config-panel {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--card-bg-light, #333);
  border-radius: 8px;
  border: 1px solid var(--border-color, #444);
}

.config-section {
  margin-bottom: 1.5rem;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-section h4 {
  margin: 0 0 0.75rem;
  color: var(--text-primary, #fff);
  font-size: 1.125rem;
}

.help-text {
  margin: 0 0 0.75rem;
  color: var(--text-secondary, #aaa);
  font-size: 0.875rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.apply-button {
  padding: 0.75rem 1rem;
  background: var(--accent-color, #4f87ff);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.apply-button:hover {
  background: var(--accent-hover, #3b6fdf);
}

.examples {
  margin-top: 0.75rem;
  color: var(--text-muted, #777);
  font-size: 0.875rem;
  font-style: italic;
}

/* Parsed Rows */
.parsed-rows {
  margin-top: 1.5rem;
}

.parsed-rows h4 {
  margin: 0 0 1rem;
  color: var(--text-primary, #fff);
  font-size: 1.125rem;
}

.rows-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.parsed-row {
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  overflow: hidden;
}

.row-header {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: var(--item-bg, #333);
  cursor: pointer;
}

.row-number {
  font-weight: 500;
  color: var(--accent-color, #4f87ff);
  margin-right: 0.75rem;
}

.row-color {
  color: var(--text-secondary, #aaa);
  margin-right: auto;
}

.row-details {
  padding: 0.75rem;
  background: var(--card-bg-light, #2d2d2d);
  border-top: 1px solid var(--border-color, #444);
}

.row-text {
  margin: 0 0 0.75rem;
  color: var(--text-primary, #fff);
  font-size: 0.875rem;
}

.stitch-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stitch-text {
  display: inline-block;
  padding: 0.25rem 0;
  margin-right: 0.5rem;
  color: var(--text-primary, #fff);
  font-size: 0.875rem;
}

:root.light .stitch-text {
  color: #333;
  background: transparent;
}

/* Error Message */
.error-message {
  margin: 1.5rem 0;
  padding: 0.75rem 1rem;
  background: var(--error-bg, rgba(220, 53, 69, 0.1));
  color: var(--error-color, #dc3545);
  border: 1px solid var(--error-border, rgba(220, 53, 69, 0.25));
  border-radius: 6px;
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
  background: var(--button-secondary-bg, #444);
  color: var(--text-primary, #fff);
  border: 1px solid var(--button-secondary-border, #555);
}

.cancel-button:hover {
  background: var(--button-secondary-hover, #555);
}

/* Light Theme Overrides */
:root.light .pattern-modal {
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

:root.light .form-input,
:root.light .form-textarea {
  border: 1px solid #e0e0e0;
  background: #f9f9f9;
  color: #333;
}

:root.light .section-title {
  background: #f5f5f5;
  color: #333;
}

:root.light .detection-item {
  background: #f5f5f5;
}

:root.light .detection-item .label {
  color: #666;
}

:root.light .detection-item .value {
  color: #333;
}

:root.light .config-panel {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
}

:root.light .help-text {
  color: #666;
}

:root.light .row-header {
  background: #f5f5f5;
}

:root.light .row-details {
  background: #f9f9f9;
  border-top: 1px solid #e0e0e0;
}

:root.light .row-text {
  color: #333;
}

:root.light .stitch-text {
  background: #eee;
  color: #333;
}

:root.light .action-buttons {
  border-top: 1px solid #e0e0e0;
}

:root.light .cancel-button {
  background: #e0e0e0;
  color: #333;
  border: 1px solid #d0d0d0;
}

:root.light .cancel-button:hover {
  background: #d0d0d0;
}

/* Pattern Preview Styles */
.pattern-preview-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color, #444);
}

.pattern-preview-section h4 {
  margin: 0 0 1rem;
  color: var(--text-primary, #fff);
  font-size: 1.125rem;
}

.pattern-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--preview-bg, #1a1a1a);
  border-radius: 8px;
  border: 1px solid var(--border-color, #444);
}

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
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.preview-row-content {
  padding-left: 1.5rem;
}

.preview-stitches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
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

/* Different stitch styles - these are for the preview buttons */
.stitch-sc {
  background: #4caf50;
  color: white;
}

.stitch-dc {
  background: #2196f3;
  color: white;
}

.stitch-hdc {
  background: #673ab7;
  color: white;
}

.stitch-tr {
  background: #ff5722;
  color: white;
}

.stitch-dtr {
  background: #e91e63;
  color: white;
}

.stitch-ch {
  background: #ffc107;
  color: #333;
}

.stitch-sl {
  background: #9e9e9e;
  color: white;
}

.stitch-inc {
  background: #8bc34a;
  color: white;
}

.stitch-dec {
  background: #f44336;
  color: white;
}

/* Light theme overrides for preview */
:root.light .pattern-preview {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
}

:root.light .preview-row-number {
  color: #2979ff;
}

:root.light .color-indicator {
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.stitch {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

:root.light .preview-stitch {
  background: #e0e0e0;
  color: #333;
  border: 1px solid #d0d0d0;
}
</style> 