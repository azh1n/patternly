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
              </div>
  
              <div class="detection-item">
                <span class="label">Colors:</span>
                <span class="value">{{ detectedColors.length ? detectedColors.join(', ') : 'Not detected' }}</span>
                <button v-if="!detectedColors.length" class="action-button" @click="showColorConfig = true">
                  Define
                </button>
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
                <div class="quick-options">
                  <button @click="applyQuickFormat('Round #')" class="option-button">Use Round #</button>
                  <button @click="applyQuickFormat('Row #')" class="option-button">Use Row #</button>
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
            
            <!-- Fallback for when rows couldn't be parsed -->
            <div v-if="patternText.trim() && !parsedRows.length" class="parsed-rows">
              <h4>Pattern Text</h4>
              <div class="help-text">No rows were detected in your pattern. Please check if your pattern follows the standard format (Row 1: ... or Round 1: ...), or manually define a row format below.</div>
              <div class="config-panel">
                <div class="config-section">
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
                  <div class="quick-options">
                    <button @click="applyQuickFormat('Round #')" class="option-button">Use Round #</button>
                    <button @click="applyQuickFormat('Row #')" class="option-button">Use Row #</button>
                  </div>
                  <div class="examples">
                    <p>Examples: "Row #", "Round #", "R#", "Rnd #"</p>
                  </div>
                </div>
              </div>
            </div>
                    
            <!-- Pattern Preview Section -->
            <div v-if="parsedRows.length" class="pattern-preview-section">
              <h4>Pattern Preview ({{ parsedRows.length }} rows)</h4>
              <div class="pattern-preview">
                <div v-for="(row, index) in parsedRows" :key="index" class="preview-row">
                  <div class="preview-row-header">
                    <span class="preview-row-number">Row {{ row.number }}</span>
                    <div v-if="row.color" class="color-indicator" :style="{ backgroundColor: getColorHex(row.color) }"></div>
                  </div>
                  <div class="preview-row-content">
                    <div v-if="!row.stitches || (Array.isArray(row.stitches) && row.stitches.length === 0)" class="no-stitches-message">
                      No stitches detected. Original text: {{ row.text }}
                    </div>
                    <div v-else-if="row.stitches.repeated" class="preview-stitches">
                      <!-- Show stitches before the repeat -->
                      <template v-for="(stitch, i) in row.stitches.beforeRepeat" :key="`before-${i}`">
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
                        
                        <template v-for="(stitch, i) in row.stitches.repeatedStitches" :key="`rep-${i}`">
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
                        <span class="repeat-count">x{{ row.stitches.repeatCount }}</span>
                      </div>
                      
                      <!-- Show stitches after the repeat -->
                      <template v-for="(stitch, i) in row.stitches.afterRepeat" :key="`after-${i}`">
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

// Add a computed property for the database format
const formattedPatternForDB = computed(() => {
  if (!parsedRows.value.length) return '';
  
  return parsedRows.value.map(row => {
    const colorInfo = row.color ? row.color : '';
    
    // Handle stitches formatting, including repeats
    let stitchesInfo = '';
    
    // Check if this is a repeated stitch pattern
    if (row.stitches && row.stitches.repeated) {
      // Format repeated section with parentheses and repeat count
      const beforeRepeat = Array.isArray(row.stitches.beforeRepeat) ? row.stitches.beforeRepeat.join(', ') : '';
      const repeatedPart = Array.isArray(row.stitches.repeatedStitches) ? row.stitches.repeatedStitches.join(', ') : '';
      const afterRepeat = Array.isArray(row.stitches.afterRepeat) ? row.stitches.afterRepeat.join(', ') : '';
      
      // Get repeat count from the object
      const repeatCount = row.stitches.repeatCount || '0';
      
      // Build stitches parts array and filter out empty segments
      const stitchesParts = [];
      
      if (beforeRepeat) {
        stitchesParts.push(beforeRepeat);
      }
      
      // Format the repeat part with consistent spacing
      if (repeatedPart) {
        stitchesParts.push(`(${repeatedPart}) x${repeatCount}`);
      }
      
      if (afterRepeat) {
        stitchesParts.push(afterRepeat);
      }
      
      // Join the parts that have content with consistent spacing
      stitchesInfo = stitchesParts.join(', ');
    } else if (Array.isArray(row.stitches)) {
      // Regular stitch array
      stitchesInfo = row.stitches.join(', ');
    } else if (typeof row.stitches === 'string') {
      // Handle case where stitches might be a string
      stitchesInfo = row.stitches;
    } else {
      // If we can't parse it, use the original row text after stripping row markers
      const cleanedText = row.text.replace(/^(Round|Row)\s*\d+\s*:?\s*/i, '').trim();
      // Check for repeat patterns in the raw text
      const repeatMatch = cleanedText.match(/\(([^)]+)\)\s*x(\d+)/);
      if (repeatMatch) {
        // Preserve the repeat pattern as is
        const beforeRepeatMatch = cleanedText.match(/^(.*?)\s*\(/);
        const afterRepeatMatch = cleanedText.match(/x\d+\s*(.*?)$/);
        
        const beforeRepeat = beforeRepeatMatch && beforeRepeatMatch[1].trim() ? beforeRepeatMatch[1].trim() + ', ' : '';
        const repeatedPart = repeatMatch[1].trim();
        const repeatCount = repeatMatch[2];
        const afterRepeat = afterRepeatMatch && afterRepeatMatch[1].trim() ? ', ' + afterRepeatMatch[1].trim() : '';
        
        stitchesInfo = `${beforeRepeat}(${repeatedPart}) x${repeatCount}${afterRepeat}`;
      } else {
        stitchesInfo = cleanedText;
      }
    }
    
    return `Row: ${row.number}, Color: ${colorInfo}, Stitches: ${stitchesInfo}`;
  }).join(', ');
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
  { pattern: /\b(\d+)dc\b/i, name: 'dc' },     // double crochet with no space
  { pattern: /\b(\d+)\s*hdc\b/i, name: 'hdc' }, // half double crochet
  { pattern: /\b(\d+)hdc\b/i, name: 'hdc' },    // half double crochet with no space
  { pattern: /\b(\d+)\s*tr\b/i, name: 'tr' },  // treble crochet
  { pattern: /\b(\d+)tr\b/i, name: 'tr' },     // treble crochet with no space
  { pattern: /\b(\d+)\s*dtr\b/i, name: 'dtr' }, // double treble crochet
  { pattern: /\b(\d+)dtr\b/i, name: 'dtr' },    // double treble crochet with no space
  { pattern: /\b(\d+)\s*sl\s*st\b/i, name: 'sl st' }, // slip stitch
  { pattern: /\bch\s*(\d+)\b/i, name: 'ch' },  // chain
  { pattern: /\b(\d+)ch\b/i, name: 'ch' },     // chain with no space
  { pattern: /\bsk\s*(\d+)\b/i, name: 'sk' },  // skip
  { pattern: /\bst\b/i, name: 'st' },          // stitch
  { pattern: /\bsts\b/i, name: 'sts' },        // stitches
  { pattern: /\bsp\b/i, name: 'sp' },          // space
  { pattern: /\b(\d+)bs\b/i, name: 'bs' },     // bobble stitch with no space
  { pattern: /\b(\d+)\s*bs\b/i, name: 'bs' },  // bobble stitch
  { pattern: /\b(\d+)ns\b/i, name: 'ns' },     // net stitch with no space
  { pattern: /\b(\d+)\s*ns\b/i, name: 'ns' }   // net stitch
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
  
  // Check each line against our known patterns
  let foundFormat = false;
  for (const line of lines) {
    if (!line.trim()) continue; // Skip empty lines
    
    for (const pattern of commonRowPatterns) {
      if (pattern.pattern.test(line)) {
        detectedRowFormat.value = pattern.format
        foundFormat = true;
        break;
      }
    }
    if (foundFormat) break;
  }
  
  // If format not found, add a default based on content
  if (!detectedRowFormat.value) {
    // Look for indicators to guess format
    const fullText = patternText.value.toLowerCase();
    if (fullText.includes('round') || fullText.includes('rnd')) {
      detectedRowFormat.value = 'Round #';
    } else {
      detectedRowFormat.value = 'Row #';
    }
  }
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
  
  // First try to parse rows to detect stitches
  const rowRegex = /(?:Round|Row)\s+(\d+)(?:\s*:|:?\s+)([^(]+)/gi
  const rowMatches = Array.from(text.matchAll(rowRegex))
  
  if (rowMatches.length > 0) {
    for (const match of rowMatches) {
      const rowContent = match[2].trim()
      // Skip "With Color X" at the beginning
      const contentWithoutColor = rowContent.replace(/^with\s+color\s+[A-Za-z]+,?\s*/i, '').trim()
      
      // Split by commas and process each stitch section
      const stitchSections = contentWithoutColor.split(',').map(s => s.trim()).filter(Boolean)
      
      for (const section of stitchSections) {
        // Try all stitch patterns
        let matched = false
        for (const pattern of stitchPatterns) {
          const match = section.match(pattern.pattern)
          if (match) {
            const count = match[1] || '1'
            stitches.add(`${count}${pattern.name}`)
            matched = true
            break
          }
        }
        
        // If no specific match, try a more general pattern
        if (!matched) {
          const generalMatch = section.match(/(\d+)([a-zA-Z]+)/)
          if (generalMatch) {
            stitches.add(`${generalMatch[1]}${generalMatch[2].toLowerCase()}`)
          }
        }
      }
    }
  }
  
  // If no stitches found, fall back to checking the entire text
  if (stitches.size === 0) {
    // Handle pattern with parentheses like "Round 57 (3sc, 1dec) x8 (32)"
    const parenthesesMatches = text.match(/\(([^)]+)\)/g);
    
    if (parenthesesMatches && parenthesesMatches.length > 0) {
      for (const parenthesesMatch of parenthesesMatches) {
        const content = parenthesesMatch.replace(/[()]/g, '').trim();
        
        // Skip if it's just a number (likely stitch count)
        if (/^\d+$/.test(content)) {
          continue;
        }
        
        // If there's an "x" with a number (like "x6"), it means we need to repeat these stitches
        const repeatMatch = text.match(/\([^)]+\)\s*x(\d+)/);
        const repeatCount = repeatMatch ? parseInt(repeatMatch[1]) : 1;
        
        // Split by commas and process each stitch
        const stitchParts = content.split(',').map(part => part.trim());
        
        // For each stitch instruction
        for (const part of stitchParts) {
          // Try to match with our patterns
          let matched = false;
          for (const pattern of stitchPatterns) {
            const match = part.match(pattern.pattern);
            if (match) {
              const count = match[1] || '1';
              stitches.add(`${count}${pattern.name}`);
              matched = true;
              break;
            }
          }
          
          // If no specific match, try a more general pattern
          if (!matched) {
            const generalMatch = part.match(/(\d+)([a-zA-Z]+)/);
            if (generalMatch) {
              stitches.add(`${generalMatch[1]}${generalMatch[2].toLowerCase()}`);
            }
          }
        }
        
        // If we found stitches in this set of parentheses, no need to check others
        if (stitches.size > 0) {
          break;
        }
      }
    }
    
    // If no stitches found in parentheses, check the entire text
    if (stitches.size === 0) {
      for (const pattern of stitchPatterns) {
        const matches = Array.from(text.matchAll(new RegExp(pattern.pattern, 'gi')));
        for (const match of matches) {
          const count = match[1] || '1';
          stitches.add(`${count}${pattern.name}`);
        }
      }
      
      // If still no stitches, try a more generic pattern
      if (stitches.size === 0) {
        const genericMatches = Array.from(text.matchAll(/(\d+)([a-zA-Z]{1,3})\b/gi));
        for (const match of genericMatches) {
          stitches.add(`${match[1]}${match[2].toLowerCase()}`);
        }
      }
    }
  }
  
  detectedStitches.value = Array.from(stitches)
}

// Create regex for row format
const createRowRegex = (format) => {
  // Replace known keywords with their regex equivalents
  let regexFormat = format
    .replace(/Round/i, 'Round')
    .replace(/Row/i, 'Row')
    .replace(/R(?!ound)/i, 'R')
    .replace(/Rnd/i, 'Rnd')
  
  // Escape special regex characters
  regexFormat = regexFormat
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  
  // Replace # with capture group for row number
  regexFormat = regexFormat.replace(/#/g, '(\\d+)')
  
  const finalRegex = new RegExp(regexFormat, 'i');
  
  return finalRegex;
}

// Update the parseRows function to handle poorly formatted rows
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
    } else if (patternText.value.includes('Row')) {
      detectedRowFormat.value = 'Row #'
    } else {
      parsedRows.value = []
      return
    }
  }
  
  // First, preprocess the text to handle multiple rounds on the same line
  const text = patternText.value.trim();
  
  // Replace "Round X" with a newline before it if it's not at the beginning of a line
  // This separates rounds that are on the same line
  const preprocessedText = text.replace(/(\S)(Round \d+)/g, '$1\n$2');
  
  const lines = preprocessedText.split('\n');
  
  // Try a simpler approach - match "Round X" directly
  const rowRegex = /Round (\d+)/i;
  
  // Find all rows with "Round X" format
  const foundRows = [];
  
  lines.forEach(line => {
    const matches = [...line.matchAll(new RegExp(rowRegex, 'gi'))];
    
    // If there are multiple Round matches in one line, split them
    if (matches.length > 1) {
      let prevIndex = 0;
      matches.forEach((match, index) => {
        const rowNum = parseInt(match[1]);
        const startPos = match.index;
        const endPos = (index < matches.length - 1) ? matches[index + 1].index : line.length;
        
        const rowText = line.substring(startPos, endPos).trim();
        
        // Look for repeat patterns in the row text directly
        // Example: Round 3 (1sc, 1inc) x6 (18)
        foundRows.push({
          number: rowNum,
          text: rowText,
          color: extractColor(rowText),
          stitches: extractStitches(rowText)
        });
      });
    } 
    // Single round in line
    else if (matches.length === 1) {
      const match = matches[0];
      const rowNum = parseInt(match[1]);
      
      // Look for repeat patterns in the row text directly
      foundRows.push({
        number: rowNum,
        text: line.trim(),
        color: extractColor(line),
        stitches: extractStitches(line)
      });
    }
  });
  
  if (foundRows.length === 0) {
    // Fallback to the more complex regex approach
    const rowPattern = createRowRegex(detectedRowFormat.value || userRowFormat.value);
    
    // Get all text content, normalize line breaks and spaces for regex
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    
    // Find all row patterns in the entire text
    const allRowMatches = [...normalizedText.matchAll(new RegExp(rowPattern, 'gi'))];
    
    // If no matches, we can't parse
    if (allRowMatches.length === 0) {
      parsedRows.value = [];
      return;
    }
    
    // For each match, extract the row number and position
    const rowPositions = allRowMatches.map((match, index) => {
      return {
        number: parseInt(match[1]),
        start: match.index,
        // End position is either the start of the next row or the end of text
        end: (index < allRowMatches.length - 1) ? allRowMatches[index + 1].index : normalizedText.length
      };
    });
    
    // Create row objects from the positions
    const rowsFromRegex = rowPositions.map(pos => {
      // Get the text for this row
      const rowText = normalizedText.substring(pos.start, pos.end).trim();
      
      try {
        const extractedStitches = extractStitches(rowText);
        return {
          number: pos.number,
          text: rowText,
          color: extractColor(rowText),
          stitches: extractedStitches
        };
      } catch (err) {
        return {
          number: pos.number,
          text: rowText,
          color: extractColor(rowText),
          stitches: [] // Fallback to empty stitches
        };
      }
    });
    
    // Sort rows by number and add to foundRows
    rowsFromRegex.sort((a, b) => a.number - b.number);
    foundRows.push(...rowsFromRegex);
  }
  
  // Sort the final combined rows by number
  foundRows.sort((a, b) => a.number - b.number);
  
  // Initialize expanded state for first 3 rows
  const expanded = {};
  foundRows.forEach((row, index) => {
    expanded[index] = index < 3;
  });
  expandedRows.value = expanded;
  
  // Make sure we set parsedRows last
  parsedRows.value = foundRows;
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
  try {
    // If there's another "Round X" or "Row X" in the text, truncate it to only include the current row
    const nextRowMatch = text.match(/(?:Round|Row) \d+/g);
    if (nextRowMatch && nextRowMatch.length > 1) {
      // Find the position of the second "Round X"
      const firstRowPos = text.indexOf(nextRowMatch[0]);
      const secondRowPos = text.indexOf(nextRowMatch[1]);
      
      if (firstRowPos >= 0 && secondRowPos > firstRowPos) {
        text = text.substring(0, secondRowPos).trim();
      }
    }
    
    // Remove stitch count information in parentheses
    text = text.replace(/\([^)]*stitch count[^)]*\)/i, '').trim();
    
    // Remove "FO" or "F.O." instructions
    text = text.replace(/\b(FO|F\.O\.)\b\.*\s*/i, '').trim();
    
    // Special case for patterns like "Round 3 (1sc, 1inc) x6 (18)"
    const directRepeatMatch = text.match(/(?:Round|Row)\s+\d+\s+\(([^)]+)\)\s*x(\d+)/i);
    if (directRepeatMatch) {
      // Extract the repeated content and count directly from the row text
      const repeatedContent = directRepeatMatch[1].trim();
      const repeatCount = directRepeatMatch[2];
      
      // Parse the repeated content to extract individual stitches
      const repeatedStitches = extractStitchesFromText(repeatedContent);
      
      // Return the structured result with the repeat
      return {
        repeated: true,
        beforeRepeat: [],
        repeatedStitches: repeatedStitches,
        afterRepeat: [],
        repeatCount: repeatCount
      };
    }
    
    // Strip out the "Round X" or "Row X" prefix 
    let cleanedText = text.replace(/^(?:Round|Row) \d+\s*:?\s*/, '').trim();
    
    // Remove any "With Color X" prefix
    cleanedText = cleanedText.replace(/With\s+Color\s+[A-Za-z]+,?\s*/i, '').trim();
    
    // Check for repeat pattern like "(1sc, 1inc) x6" and preserve it
    const repeatPatternMatch = cleanedText.match(/\(([^)]+)\)\s*x(\d+)/);
    
    if (repeatPatternMatch) {
      // We have a pattern with repeats like "(1sc, 1inc) x6"
      // We need to preserve this structure instead of flattening it
      
      // First, check if there's a stitch count at the end like "(18)"
      const stitchCountMatch = cleanedText.match(/\(\d+\)$/);
      if (stitchCountMatch) {
        cleanedText = cleanedText.replace(/\s*\(\d+\)$/, '').trim();
      }
      
      // Extract everything before the repeat
      const beforeRepeatMatch = cleanedText.match(/^(.*?)\s*\(/);
      const beforeRepeat = beforeRepeatMatch ? beforeRepeatMatch[1].trim() : '';
      
      // Extract everything after the repeat
      const afterRepeatMatch = cleanedText.match(/x\d+\s*(.*?)$/);
      const afterRepeat = afterRepeatMatch ? afterRepeatMatch[1].trim() : '';
      
      // Extract the repeated part
      const repeatedContent = repeatPatternMatch[1].trim();
      const repeatCount = repeatPatternMatch[2];
      
      // Parse the repeated content to extract individual stitches
      const repeatedStitches = extractStitchesFromText(repeatedContent);
      
      // Parse before and after parts if they exist
      const beforeStitches = beforeRepeat ? extractStitchesFromText(beforeRepeat) : [];
      const afterStitches = afterRepeat ? extractStitchesFromText(afterRepeat) : [];
      
      // Return the structured result
      return {
        repeated: true,
        beforeRepeat: beforeStitches,
        repeatedStitches: repeatedStitches,
        afterRepeat: afterStitches,
        repeatCount: repeatCount
      };
    }
    
    // For patterns without repeats, extract stitches as before
    return extractStitchesFromText(cleanedText);
  } catch (error) {
    console.error("Error extracting stitches:", error);
    return []; // Return empty array on error
  }
}

// Helper function to extract stitch patterns from a given text
const extractStitchesFromText = (text) => {
  try {
    const foundStitches = [];
    
    // First remove any stitch count information in parentheses
    const cleanedText = text.replace(/\([^)]*stitch count[^)]*\)/i, '').trim();
  
    // Split by all commas first
    const allParts = cleanedText.split(',').map(p => p.trim()).filter(Boolean);
    
    for (const part of allParts) {
      // Skip empty parts
      if (!part) continue;
      
      // Check if this part contains a repeat pattern
      if (part.includes(')') && part.includes('x')) {
        // This is a repeat pattern, handle it separately
        const repeatMatch = part.match(/\(([^)]+)\)\s*x(\d+)/);
        if (repeatMatch) {
          const innerContent = repeatMatch[1];
          const innerParts = innerContent.split(',').map(p => p.trim());
          
          for (const innerPart of innerParts) {
            // Remove any trailing punctuation
            const cleanInnerPart = innerPart.replace(/[.,;:!?]+$/, '').trim();
            
            // Try all the stitch patterns
            let matched = false;
            for (const pattern of stitchPatterns) {
              const match = cleanInnerPart.match(pattern.pattern);
              if (match) {
                const count = match[1] || '1';
                foundStitches.push(`${count}${pattern.name}`);
                matched = true;
                break;
              }
            }
            
            // If no specific pattern matched, try a general pattern
            if (!matched) {
              // Look for a number followed by any letters (potential stitch)
              const generalMatch = cleanInnerPart.match(/(\d+)([a-zA-Z]+)/);
              if (generalMatch) {
                foundStitches.push(`${generalMatch[1]}${generalMatch[2].toLowerCase()}`);
              }
            }
          }
        }
        continue;
      }
      
      // Remove any trailing punctuation for non-repeat parts
      const cleanPart = part.replace(/[.,;:!?]+$/, '').trim();
      
      // Try all stitch patterns for non-repeat parts
      let matched = false;
      for (const pattern of stitchPatterns) {
        const match = cleanPart.match(pattern.pattern);
        if (match) {
          const count = match[1] || '1';
          foundStitches.push(`${count}${pattern.name}`);
          matched = true;
          break;
        }
      }
      
      // If no specific pattern matched, try a general pattern
      if (!matched) {
        // Look for a number followed by any letters (potential stitch)
        const generalMatch = cleanPart.match(/(\d+)([a-zA-Z]+)/);
        if (generalMatch) {
          foundStitches.push(`${generalMatch[1]}${generalMatch[2].toLowerCase()}`);
        }
      }
    }
    
    return foundStitches;
  } catch (error) {
    console.error("Error in extractStitchesFromText:", error);
    return [];
  }
}

// Apply user-defined row format
const applyRowFormat = () => {
  if (userRowFormat.value) {
    detectedRowFormat.value = userRowFormat.value;
    showRowConfig.value = false;
    
    // If the user format doesn't contain a '#', add it
    if (!detectedRowFormat.value.includes('#')) {
      detectedRowFormat.value += ' #';
    }
    
    // For testing: Add a sample format that will match the example
    if (userRowFormat.value.toLowerCase() === 'round') {
      userRowFormat.value = 'Round #';
      detectedRowFormat.value = 'Round #';
    }
    
    parseRows();
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

    // Format the pattern using the standardized format
    let formattedPattern = patternText.value;
    
    if (parsedRows.value.length > 0) {
      // Use the formatted pattern from our computed property
      formattedPattern = formattedPatternForDB.value;
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
    'stitch-dec': type === 'dec',
    'stitch-bs': type.includes('bs'),
    'stitch-ns': type.includes('ns')
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

const extractRepeatPattern = (text) => {
  // Look for patterns like (1sc, 1inc) x6
  const repeatMatch = text.match(/\(([^)]+)\)\s*x(\d+)/);
  if (repeatMatch) {
    return `(${repeatMatch[1]}) x${repeatMatch[2]}`;
  }
  return text;
}

const getRepeatCount = (text) => {
  // First check if we got the row text or a pattern object
  if (typeof text === 'object' && text.repeatCount) {
    return text.repeatCount;
  }
  
  // Otherwise extract from text
  const repeatMatch = text.match(/\([^)]+\)\s*x(\d+)/);
  return repeatMatch ? repeatMatch[1] : "";
}

const applyQuickFormat = (format) => {
  userRowFormat.value = format;
  detectedRowFormat.value = format;
  showRowConfig.value = false;
  parseRows();
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

.quick-options {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.option-button {
  padding: 0.5rem 0.75rem;
  background: var(--button-bg, #444);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #555);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.option-button:hover {
  background: var(--button-hover-bg, #555);
  border-color: var(--accent-color, #4f87ff);
}

:root.light .option-button {
  background: #e8e8e8;
  color: #333;
  border: 1px solid #d0d0d0;
}

:root.light .option-button:hover {
  background: #d8d8d8;
  border-color: #2979ff;
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
  padding-left: 0rem;
}

.preview-stitches {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.1);
}

:root.light .preview-stitches {
    background: rgba(0, 0, 0, 0.05);
}

.no-stitches-message {
  padding: 0.5rem;
  color: var(--text-secondary, #aaa);
  font-style: italic;
  font-size: 0.875rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  border: 1px dashed var(--border-color, #444);
}

:root.light .no-stitches-message {
  color: #666;
  background: rgba(0, 0, 0, 0.05);
  border-color: #ddd;
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
  background: #8ed68e; /* Pastel green */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-dc {
  background: #92c4ff; /* Pastel blue */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-hdc {
  background: #c3aadb; /* Pastel purple */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-tr {
  background: #ffbe9d; /* Pastel orange */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-dtr {
  background: #ffabcf; /* Pastel pink */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-ch {
  background: #ffe6a2; /* Pastel yellow */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-sl {
  background: #c0c0c0; /* Pastel gray */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-inc {
  background: #c3e6a5; /* Pastel light green */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-dec {
  background: #ffa7a7; /* Pastel red */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-bs {
  background: #d0b9a2; /* Pastel brown */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stitch-ns {
  background: #adcbd6; /* Pastel blue-gray */
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* Dark theme text overrides for stitch colors to ensure visibility */
:root:not(.light) .stitch-sc,
:root:not(.light) .stitch-dc,
:root:not(.light) .stitch-hdc,
:root:not(.light) .stitch-tr,
:root:not(.light) .stitch-dtr,
:root:not(.light) .stitch-ch,
:root:not(.light) .stitch-sl,
:root:not(.light) .stitch-inc,
:root:not(.light) .stitch-dec,
:root:not(.light) .stitch-bs,
:root:not(.light) .stitch-ns {
  text-shadow: 0px 1px 1px rgba(0,0,0,0.2);
}

/* Repeat Pattern Styles */
.repeat-pattern {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--stitch-bg, #2d2d2d);
  border-radius: 8px;
  border: 1px solid var(--border-color, #444);
}

.repeat-notation {
  font-weight: 500;
  color: var(--text-primary, #fff);
}

:root.light .repeat-pattern {
  background: #e8e8e8;
  border: 1px solid #d0d0d0;
}

:root.light .repeat-notation {
  color: #333;
}

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

/* Light theme overrides */
:root.light .repeat-group {
  background-color: rgba(41, 121, 255, 0.08);
}

:root.light .repeat-bracket,
:root.light .repeat-count {
  color: #2979ff;
}

/* Light theme override */
:root.light .storage-format-preview {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
}

:root.light .storage-format-text {
  color: #333;
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
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style> 