<!-- Modal component for adding new knitting patterns -->
<template>
  <div v-if="modelValue" class="pattern-modal-overlay" @click="closeModal">
    <div class="pattern-modal" @click.stop>
      <div class="modal-header">
        <h2>Add New Pattern</h2>
        <button class="close-button" @click="closeModal" aria-label="Close modal">×</button>
      </div>
      
      <div class="modal-body">
        <!-- File Upload Section - Only show if experimental features are enabled -->
        <template v-if="experimentalFeatures">
          <div class="upload-section">
            <FileUploadContainer 
              @file-selected="handleFileUpload"
              @error="handleUploadError"
              accept=".png,.jpg,.jpeg,.pdf,.docx"
            />
          </div>
          
          <div class="divider">
            <span>OR</span>
          </div>
        </template>
        
        <!-- Getting Started Guide -->
        <div v-if="!patternText.trim() && !patternName.trim()" class="getting-started">
          <div class="getting-started-header">
            <div class="icon-container">
              <span class="icon">📋</span>
            </div>
            <h3>How to Add a Pattern</h3>
          </div>
          <ol class="steps-list">
            <li>
              <strong>Name your pattern</strong> - Give your pattern a descriptive name
            </li>
            <li>
              <strong>Paste your pattern instructions</strong> - Copy from any source and paste into the instructions field
            </li>
            <li>
              <strong>Review the preview</strong> - We'll automatically detect rows, colors, and stitches
            </li>
            <li>
              <strong>Make adjustments if needed</strong> - You can define formats, map colors, or edit rows
            </li>
            <li>
              <strong>Save your pattern</strong> - Click "Save Pattern" when you're happy with the result
            </li>
          </ol>
        </div>

        <div class="modal-columns">
          <!-- Left Column: Input -->  
          <div class="modal-column input-column">
            <h3 class="column-title">
              <span class="title-icon">✏️</span>
              Pattern Input
            </h3>
            
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
              <label for="patternText">
                Pattern Instructions
                <span class="label-hint">Paste your pattern exactly as written</span>
              </label>
              <textarea
                id="patternText" 
                v-model="patternText" 
                placeholder="Paste your pattern here..."
                class="form-textarea"
                @input="analyzePattern"
              ></textarea>
            </div>

            <!-- Configuration Panel -->
            <div v-if="showRowConfig || showColorConfig" class="config-panel">
              <!-- Row Format Configuration -->
              <div v-if="showRowConfig" class="config-section">
                <div class="section-header">
                  <span class="section-icon">🔢</span>
                  <h4>Define Row Format</h4>
                </div>
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
                  <button @click="applyQuickFormat('Round #')" class="option-button">
                    <span class="option-icon">⭕</span>
                    Round #
                  </button>
                  <button @click="applyQuickFormat('Row #')" class="option-button">
                    <span class="option-icon">↔️</span>
                    Row #
                  </button>
                </div>
                <div class="examples">
                  <p>Examples: "Row #", "Round #", "R#", "Rnd #"</p>
                </div>
              </div>
  
              <!-- Color Configuration -->
              <div v-if="showColorConfig" class="config-section">
                <div class="section-header">
                  <span class="section-icon">🎨</span>
                  <h4>Define Color Format</h4>
                </div>
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
                  <p>Examples: "Black", "Orange", "Color A", etc.</p>
                </div>
                
                <!-- Color Mapping Section -->
                <div v-if="detectedColors.length > 0" class="color-mapping-section">
                  <div class="section-header">
                    <span class="section-icon">🔄</span>
                    <h4>Map Colors</h4>
                  </div>
                  <p class="help-text">Assign specific colors to the color references in your pattern</p>
                  <div class="color-grid">
                    <div v-for="(color, index) in detectedColors" :key="index" class="color-mapping-item">
                      <div class="color-mapping-label">{{ color }}:</div>
                      <div class="color-mapping-input">
                        <select 
                          v-model="colorMappings[color]" 
                          class="color-select"
                        >
                          <option value="">Select a color</option>
                          <option value="#ff5252">Red</option>
                          <option value="#4caf50">Green</option>
                          <option value="#2196f3">Blue</option>
                          <option value="#ffc107">Yellow</option>
                          <option value="#9c27b0">Purple</option>
                          <option value="#ff9800">Orange</option>
                          <option value="#e91e63">Pink</option>
                          <option value="#00bcd4">Turquoise</option>
                          <option value="#333333">Black</option>
                          <option value="#ffffff">White</option>
                          <option value="#795548">Brown</option>
                          <option value="#607d8b">Gray</option>
                        </select>
                        <div 
                          class="color-preview" 
                          :style="{ backgroundColor: colorMappings[color] || '#888888' }"
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div class="color-mapping-actions">
                    <button @click="applyColorMappings" class="apply-button">Apply Color Mappings</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Preview -->  
          <div class="modal-column preview-column">
            <h3 class="column-title">
              <span class="title-icon">👁️</span>
              Pattern Preview
              <span v-if="patternText.trim() && parsedRows.length" class="pattern-stats">
                {{ parsedRows.length }} rows detected
              </span>
            </h3>
  
            <!-- Detection Results -->
            <div v-if="patternText" class="detection-card">
              <div class="detection-header">Pattern Analysis</div>
              <div class="detection-body">
                <div class="detection-item">
                  <span class="detection-label">Row Format:</span>
                  <span class="detection-value">
                    <span v-if="detectedRowFormat" class="detection-success">{{ detectedRowFormat }}</span>
                    <span v-else class="detection-warning">Not detected</span>
                  </span>
                  <button v-if="!detectedRowFormat" class="action-button" @click="showRowConfig = true">
                    Define Format
                  </button>
                </div>

                <div class="detection-item">
                  <span class="detection-label">Colors:</span>
                  <span class="detection-value">
                    <template v-if="detectedColors.length">
                      <template v-for="(color, index) in detectedColors" :key="index">
                        <span 
                          class="color-chip"
                          :style="{ backgroundColor: getColorHex(getMappedColorName(color)) }"
                        ></span>
                        <span class="color-name">{{ getMappedColorName(color) }}</span>
                        <span v-if="index < detectedColors.length - 1" class="color-separator">, </span>
                      </template>
                    </template>
                    <span v-else class="detection-warning">Not detected</span>
                  </span>
                  <button 
                    v-if="!detectedColors.length" 
                    class="action-button" 
                    @click="showColorConfig = true"
                  >
                    Define Colors
                  </button>
                  <button 
                    v-if="detectedColors.length" 
                    class="action-button" 
                    @click="openColorMapping"
                  >
                    Map Colors
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Fallback for when rows couldn't be parsed -->
            <div v-if="patternText.trim() && !parsedRows.length" class="parsed-rows">
              <div class="no-rows-alert">
                <div class="alert-icon">⚠️</div>
                <h4>No Rows Detected</h4>
                <p>We couldn't parse your pattern automatically. Try defining the row format manually.</p>
              </div>
              <div class="help-text">This often happens with non-standard patterns. Please check if your pattern follows the usual format (Row 1: ... or Round 1: ...), or define your own row format below.</div>
              <div class="quick-config-panel">
                <div class="config-section">
                  <div class="section-header">
                    <span class="section-icon">🔢</span>
                    <h4>Define Row Format</h4>
                  </div>
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
                    <button @click="applyQuickFormat('Round #')" class="option-button">
                      <span class="option-icon">⭕</span>
                      Round #
                    </button>
                    <button @click="applyQuickFormat('Row #')" class="option-button">
                      <span class="option-icon">↔️</span>
                      Row #
                    </button>
                  </div>
                </div>
              </div>
            </div>
                    
            <!-- Unparsed Content Section -->
            <UnparsedContentSection
              :unparsedContent="unparsedContent"
              :showUnparsedContent="showUnparsedContent"
              :isVisible="patternText.trim() && unparsedContent.trim()"
              @add-new-row="addNewRow"
              @ignore-unparsed-content="ignoreUnparsedContent"
              @toggle-show="showUnparsedContent = !showUnparsedContent"
            />

            <!-- Pattern Preview Section -->
            <PatternPreviewSection 
              v-if="parsedRows.length" 
              :rows="parsedRows" 
              :patternShape="detectedPatternShape"
              @add-new-row="addNewRow" 
              @edit-row="editRow"
            />
          </div>
        </div>
        
        <!-- Error Messages -->
        <div v-if="errorMessage" class="error-message">
          <div class="error-icon">❌</div>
          <div class="error-content">
            <div class="error-title">Error</div>
            <div class="error-text">{{ errorMessage }}</div>
          </div>
        </div>
  
        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            @click="savePattern"
            class="save-button"
            :disabled="!canSave"
          >
            <span class="button-icon">💾</span>
            {{ isLoading ? 'Saving...' : 'Save Pattern' }}
          </button>
          <button @click="closeModal" class="cancel-button">
            <span class="button-icon">✕</span>
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Row Edit Modal -->
  <RowEditModal 
    v-model="showRowEditModal"
    :row="editingRow"
    :is-new-row="editingRowIndex === -2"
    @save="handleRowSave"
  />
</template>
  
<script setup>
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import FileUploadContainer from './FileUploadContainer.vue'
import FileUploader from './FileUploader.vue'
import CrochetNotationView from './pattern/crochet/CrochetNotationView.vue'
import { detectPatternShape } from '@/utils/patternShapeDetector'
import { usePatternStore } from '@/stores/pattern'
import { auth } from '@/firebase'
import RowEditModal from './pattern/RowEditModal.vue'
import UnparsedContentSection from './pattern/UnparsedContentSection.vue'
import PatternPreviewSection from './pattern/PatternPreviewSection.vue'
import { useUserSettings } from '@/services/userSettings'

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

// Store and settings
const patternStore = usePatternStore()
const { experimentalFeatures } = useUserSettings()

// Form state
const patternText = ref('')
const patternName = ref('')
const uploadedImage = ref(null)

// Handle file upload
const handleFileUpload = async (fileData) => {
  try {
    // Store the uploaded file for processing
    uploadedImage.value = fileData
    
    // If it's an image, we'll need to process it with OCR or other methods
    if (fileData.type.startsWith('image/')) {
      // TODO: Process image with OCR or other methods
      console.log('Processing image:', fileData)
      // For now, we'll just show a message
      errorMessage.value = 'Image processing coming soon! For now, please paste your pattern text below.'
    } 
    // If it's a PDF or DOCX, we can extract text
    else if (fileData.type === 'application/pdf' || 
             fileData.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // TODO: Extract text from PDF/DOCX
      errorMessage.value = 'Document processing coming soon! For now, please paste your pattern text below.'
    }
  } catch (error) {
    console.error('Error processing uploaded file:', error)
    errorMessage.value = 'Error processing uploaded file. Please try again or paste your pattern text below.'
  }
}

// Handle upload errors
const handleUploadError = (error) => {
  errorMessage.value = error || 'Error uploading file. Please try again.'
}
const errorMessage = ref('')

// UI state
const showAnalysis = ref(true)
const showRowConfig = ref(false)
const showColorConfig = ref(false)
const expandedRows = ref({})
const showRowEditModal = ref(false)
const showUnparsedContent = ref(true)

// Pattern shape detection
const detectedPatternShape = ref({ type: 'unknown', confidence: 0 })

// Pattern analysis state
const detectedRowFormat = ref('')
const userRowFormat = ref('')
const detectedColors = ref([])
const userColorFormat = ref('')
const detectedStitches = ref([])
const parsedRows = ref([])
const unparsedContent = ref('')

// Color mapping state
const colorMappings = ref({}) // Maps color identifiers to hex values

// Row editing state
const editingRowIndex = ref(-1)
const editingRow = ref(null)

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
  
  try {
    const formattedRows = parsedRows.value.map(row => {
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
        // Process the array of stitches which might contain repeat patterns
        const formattedStitches = row.stitches.map(stitch => {
          // Check if this stitch is a repeat pattern
          if (typeof stitch === 'string' && stitch.includes('(') && stitch.includes(')') && stitch.includes('x')) {
            // It's already in the correct format, return it as-is
            return stitch;
          }
          // Return normal stitch as-is
          return stitch;
        });
        
        // Join all stitches with commas
        stitchesInfo = formattedStitches.join(', ');
      } else if (typeof row.stitches === 'string') {
        // Handle case where stitches might be a string
        stitchesInfo = row.stitches;
      } else {
        // If we can't parse it, use the original row text after stripping row markers
        const cleanedText = row.text ? row.text.replace(/^(Round|Row)\s*\d+\s*:?\s*/i, '').trim() : '';
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
      
      // Remove any problematic characters like ellipses that might cause issues
      stitchesInfo = stitchesInfo.replace(/…/g, '...');
      
      // Ensure the row ends with a comma
      return `Row: ${row.number}, Color: ${colorInfo}, Stitches: ${stitchesInfo},`;
    }).join('\n'); // Just use newline since we're adding commas to each row
    
    return formattedRows;
  } catch (error) {
    console.error('Error formatting pattern for DB:', error);
    // Return a basic representation of the pattern if there's an error
    return patternText.value;
  }
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

// Watch for changes in parsed rows to update color detection and pattern shape
watch(parsedRows, () => {
  detectColors();
  detectedPatternShape.value = detectPatternShape(parsedRows.value, patternText.value);
}, { deep: true });

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
  colorMappings.value = {}
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
    
    // Extract unparsed content
    extractUnparsedContent()
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
      detectedRowFormat.value = 'Round #';
    } else if (patternText.value.includes('Row')) {
      detectedRowFormat.value = 'Row #';
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
  
  // After parsing rows, extract unparsed content
  extractUnparsedContent();
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
    
    // Parse the text to find all repeated patterns and regular stitches
    return parseRepeatedPatterns(cleanedText);
  } catch (error) {
    console.error("Error extracting stitches:", error);
    return []; // Return empty array on error
  }
}

// Helper function to parse a pattern string that may contain multiple repeat patterns
const parseRepeatedPatterns = (text) => {
  // Remove stitch count at the end like "(18)"
  text = text.replace(/\(\d+\)$/, '').trim();
  
  // Find all repeat pattern matches
  const repeatRegex = /\(([^)]+)\)\s*x(\d+)/g;
  let matches = [];
  let match;
  
  while ((match = repeatRegex.exec(text)) !== null) {
    matches.push({
      fullMatch: match[0],
      repeatedContent: match[1],
      repeatCount: parseInt(match[2], 10),
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  // If no repeat patterns found, return regular stitches
  if (matches.length === 0) {
    return extractStitchesFromText(text);
  }
  
  // If exactly one repeat pattern and it covers most of the content, use the simplified structure
  if (matches.length === 1) {
    const repeatMatch = matches[0];
    
    // Extract parts before and after the repeat
    const beforeText = text.substring(0, repeatMatch.startIndex).trim();
    const afterText = text.substring(repeatMatch.endIndex).trim();
    
    // Extract stitches from each part
    const beforeStitches = beforeText ? extractStitchesFromText(beforeText) : [];
    const repeatedStitches = extractStitchesFromText(repeatMatch.repeatedContent);
    const afterStitches = afterText ? extractStitchesFromText(afterText) : [];
    
    return {
      repeated: true,
      beforeRepeat: beforeStitches,
      repeatedStitches: repeatedStitches,
      afterRepeat: afterStitches,
      repeatCount: repeatMatch.repeatCount
    };
  }
  
  // For multiple repeat patterns, we need a different approach
  // We'll treat it as a flat array of stitches but preserve the repeat patterns
  
  // Sort matches by their starting position in the text
  matches.sort((a, b) => a.startIndex - b.startIndex);
  
  // Split the text into parts: regular stitches and repeat patterns
  let parts = [];
  let lastIndex = 0;
  
  for (const repeatMatch of matches) {
    // Add any text before this repeat pattern
    if (repeatMatch.startIndex > lastIndex) {
      const beforeText = text.substring(lastIndex, repeatMatch.startIndex).trim();
      if (beforeText) {
        // Split by commas and extract individual stitches
        const beforeParts = beforeText.split(',').map(part => part.trim()).filter(Boolean);
        for (const part of beforeParts) {
          parts.push(part);
        }
      }
    }
    
    // Add the repeat pattern as is
    parts.push(repeatMatch.fullMatch);
    
    // Update the last index
    lastIndex = repeatMatch.endIndex;
  }
  
  // Add any text after the last repeat pattern
  if (lastIndex < text.length) {
    const afterText = text.substring(lastIndex).trim();
    if (afterText) {
      // Split by commas and extract individual stitches
      const afterParts = afterText.split(',').map(part => part.trim()).filter(Boolean);
      for (const part of afterParts) {
        parts.push(part);
      }
    }
  }
  
  // Process each part and convert to standard stitch format
  const processedParts = parts.map(part => {
    // If this is a repeat pattern, keep it as is
    if (part.match(/\([^)]+\)\s*x\d+/)) {
      return part;
    }
    
    // Otherwise normalize the stitch code
    return normalizeStitchCode(part);
  }).filter(Boolean);
  
  return processedParts;
}

// Helper function to normalize a stitch code
const normalizeStitchCode = (code) => {
  if (!code) return null;
  
  // Clean the code
  const cleanCode = code.replace(/[.,;:!?]+$/, '').trim();
  
  // Try all stitch patterns
  for (const pattern of stitchPatterns) {
    const match = cleanCode.match(pattern.pattern);
    if (match) {
      const count = match[1] || '1';
      return `${count}${pattern.name}`;
    }
  }
  
  // If no specific pattern matched, try a general pattern
  const generalMatch = cleanCode.match(/(\d+)([a-zA-Z]+)/);
  if (generalMatch) {
    return `${generalMatch[1]}${generalMatch[2].toLowerCase()}`;
  }
  
  return null;
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
      
      // Remove any trailing punctuation
      const cleanPart = part.replace(/[.,;:!?]+$/, '').trim();
      
      // Normalize the stitch code
      const normalizedStitch = normalizeStitchCode(cleanPart);
      if (normalizedStitch) {
        foundStitches.push(normalizedStitch);
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

// Get the mapped color name for a given color
const getMappedColorName = (color) => {
  // Check if this color has a mapping
  for (const [mappedColor, colorValue] of Object.entries(colorMappings.value)) {
    if (color.toLowerCase() === mappedColor.toLowerCase() && colorValue) {
      // Return the actual color name instead of the ambiguous one
      return getColorNameFromHex(colorValue)
    }
  }
  // If no mapping found, return the original color
  return color
}

// Apply color mappings when user clicks the Apply button
const applyColorMappings = () => {
  // Update the actual color values in each row
  parsedRows.value = parsedRows.value.map(row => {
    // Clone the row to avoid mutating the original
    const updatedRow = { ...row }
    
    // Check if this row has a color that needs to be mapped
    if (updatedRow.color) {
      // Find if any of our color mappings apply to this row's color
      for (const [mappedColor, colorValue] of Object.entries(colorMappings.value)) {
        if (updatedRow.color.toLowerCase().includes(mappedColor.toLowerCase()) && colorValue) {
          // Get the color name from the selected value
          const colorName = getColorNameFromHex(colorValue)
          // Replace the ambiguous color with the actual color name
          updatedRow.color = colorName
          break
        }
      }
    }
    
    return updatedRow
  })
  
  // Show a confirmation and close the color config panel
  showColorConfig.value = false
}

// Open color mapping section
const openColorMapping = () => {
  showColorConfig.value = true
  // Use setTimeout to ensure the DOM is updated before scrolling
  setTimeout(() => {
    // Find the color mapping section and scroll to it
    const colorMappingSection = document.querySelector('.color-mapping-section')
    if (colorMappingSection) {
      colorMappingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }, 100)
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

    // Ensure we have a name
    if (!patternName.value.trim()) {
      errorMessage.value = 'Please enter a pattern name.'
      return
    }

    // Format the pattern using the standardized format
    let formattedPattern = patternText.value;
    
    if (parsedRows.value.length > 0) {
      // Use the formatted pattern from our computed property
      formattedPattern = formattedPatternForDB.value;
    }

    // Ensure content isn't truncated (check for "...")
    if (formattedPattern.includes('…')) {
      formattedPattern = formattedPattern.replace(/…/g, '...');
    }

    // Create a clean pattern data object with required fields
    const patternData = {
      name: patternName.value.trim(),
      content: formattedPattern,
      userId: auth.currentUser.uid,
      timestamp: new Date()
    };

    // Emit the pattern data
    emit('pattern-added', patternData);
    
    // Close the modal
    closeModal();
  } catch (error) {
    console.error('Error saving pattern:', error);
    errorMessage.value = 'Error saving pattern: ' + error.message;
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

// Color mapping for hex values to color names and vice versa
const colorMap = {
  // Hex to name mapping
  '#ff5252': 'Red',
  '#4caf50': 'Green',
  '#2196f3': 'Blue',
  '#ffc107': 'Yellow',
  '#9c27b0': 'Purple',
  '#ff9800': 'Orange',
  '#e91e63': 'Pink',
  '#00bcd4': 'Turquoise',
  '#333333': 'Black',
  '#ffffff': 'White',
  '#795548': 'Brown',
  '#607d8b': 'Gray',
  
  // Name to hex mapping
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

// Get color name from hex value
const getColorNameFromHex = (hexValue) => {
  return colorMap[hexValue] || 'Custom Color'
}

const getColorHex = (color) => {
  if (!color) return '#888888';
  
  // First check if we have a user-defined mapping for this color
  for (const [mappedColor, colorValue] of Object.entries(colorMappings.value)) {
    if (color.toLowerCase() === mappedColor.toLowerCase() && colorValue) {
      // Return the actual color value instead of the ambiguous one
      return colorValue;
    }
  }
  
  // Check for exact match in our color map
  if (colorMap[color]) {
    return colorMap[color];
  }
  
  // Check for color names (case insensitive)
  for (const [key, value] of Object.entries(colorMap)) {
    if (typeof value === 'string' && value.startsWith('#') && 
        color.toLowerCase() === key.toLowerCase()) {
      return value;
    }
  }
  
  // Check for partial matches (for 'Color A' type formats)
  for (const [key, value] of Object.entries(colorMap)) {
    if (!key.startsWith('#') && 
        color.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return '#888888'; // Default gray
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

// Extract content that couldn't be parsed into rows
const extractUnparsedContent = () => {
  if (!patternText.value.trim() || !parsedRows.value.length) {
    // If there's no pattern text or no parsed rows, set all content as unparsed
    unparsedContent.value = patternText.value.trim()
    return
  }
  
  // Get all the text that was successfully parsed into rows
  const parsedTexts = new Set()
  
  // For each parsed row, add its text to the set
  parsedRows.value.forEach(row => {
    if (row.text) {
      parsedTexts.add(row.text.trim())
    }
  })
  
  // Split the original text into lines
  const lines = patternText.value.split('\n')
  
  // Filter out lines that were successfully parsed
  const unparsedLines = lines.filter(line => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return false // Skip empty lines
    
    // Check if this line or a part of it was parsed
    for (const parsedText of parsedTexts) {
      if (parsedText.includes(trimmedLine) || trimmedLine.includes(parsedText)) {
        return false
      }
    }
    
    return true
  })
  
  // Join the unparsed lines
  unparsedContent.value = unparsedLines.join('\n')
}

// Add a new row manually
const addNewRow = () => {
  // Set up for adding a new row
  editingRowIndex.value = -2 // Special value to indicate new row
  
  // Determine the next row number
  const nextRowNumber = parsedRows.value.length > 0 
    ? Math.max(...parsedRows.value.map(row => row.number)) + 1 
    : 1
  
  // Create a basic row object with just the number
  editingRow.value = {
    number: nextRowNumber,
    text: `Row ${nextRowNumber}`,
    stitches: []
  }
  
  // Show the edit modal
  showRowEditModal.value = true
}

// Ignore unparsed content
const ignoreUnparsedContent = () => {
  // Clear the unparsed content
  unparsedContent.value = ''
  // Hide the unparsed content section
  showUnparsedContent.value = false
}

// Row editing methods
const editRow = (index) => {
  editingRowIndex.value = index
  editingRow.value = index >= 0 ? { ...parsedRows.value[index] } : null
  
  // Show the edit modal
  showRowEditModal.value = true
}

// Handle save from row edit modal
const handleRowSave = (updatedRow) => {
  // Update or add the row in the parsedRows array
  if (editingRowIndex.value === -2) {
    // Add new row
    parsedRows.value.push(updatedRow)
  } else {
    // Update existing row
    parsedRows.value[editingRowIndex.value] = updatedRow
  }
  
  // Sort rows by number
  parsedRows.value.sort((a, b) => a.number - b.number)
  
  // Reset editing state
  editingRowIndex.value = -1
  editingRow.value = null
}
</script>
  
<style scoped>
/* Media Queries */
@media (max-width: 900px) {
  .modal-columns {
    flex-direction: column;
  }
  
  .preview-column {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid var(--border-color, #444);
    padding-top: 1.5rem;
    margin-top: 1rem;
  }
  
  .getting-started {
    padding: 1.25rem;
  }
}

@media (max-width: 768px) {
  .pattern-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  
  .pattern-modal {
    border-radius: 0;
    max-height: 100vh;
  }
  
  .detection-item {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .detection-label {
    min-width: auto;
    width: 100px;
  }
  
  .color-grid {
    grid-template-columns: 1fr;
  }
}

/* Modal Overlay */
.pattern-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

/* Modal Container */
.pattern-modal {
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--card-bg, #2a2a2a);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: modalAppear 0.3s ease-out;
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Getting Started Guide */
.getting-started {
  background: var(--card-bg-light, rgba(255, 255, 255, 0.05));
  border-radius: 12px;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.getting-started-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--accent-color, #4f87ff);
  border-radius: 50%;
  margin-right: 1rem;
}

.icon {
  font-size: 1.3rem;
}

.steps-list {
  padding-left: 1.5rem;
  margin: 0;
}

.steps-list li {
  margin-bottom: 0.75rem;
  line-height: 1.4;
  color: var(--text-secondary, #ddd);
}

.steps-list li strong {
  color: var(--text-primary, #fff);
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color, #444);
  background: var(--card-bg, #2a2a2a);
  position: sticky;
  top: 0;
  z-index: 10;
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
  transition: all 0.2s;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: var(--text-primary, #fff);
  background: rgba(255, 255, 255, 0.1);
}

/* Modal Body */
.modal-body {
  padding: 1.5rem 2rem 2rem;
}

/* Modal Columns */
.modal-columns {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.modal-column {
  flex: 1;
}

.input-column {
  flex-basis: 40%;
}

.preview-column {
  flex-basis: 60%;
  border-left: 1px solid var(--border-color, #444);
  padding-left: 2rem;
}

.column-title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  color: var(--text-primary, #fff);
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color, #444);
  display: flex;
  align-items: center;
}

.title-icon {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}

.pattern-stats {
  margin-left: auto;
  font-size: 0.875rem;
  font-weight: normal;
  color: var(--text-secondary, #aaa);
  background: rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
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
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label-hint {
  font-size: 0.8rem;
  color: var(--text-secondary, #aaa);
  font-weight: normal;
}

.form-input {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid var(--border-color, #444);
  border-radius: 8px;
  background: var(--input-bg, #333);
  color: var(--text-primary, #fff);
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-color, #4f87ff);
  box-shadow: 0 0 0 2px rgba(79, 135, 255, 0.2);
}

/* File Upload Section */
.upload-section {
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--card-bg, #2a2a2a);
  border: 1px dashed var(--border-color, #444);
  transition: all 0.3s ease;
  color: var(--text-primary, #fff);
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: var(--text-muted, #666);
  font-size: 0.9rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-color, #ddd);
  margin: 0 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .upload-section {
    padding: 1rem;
  }
}

.form-textarea {
  width: 100%;
  min-height: 150px;
  padding: 1rem;
  border: 1px solid var(--border-color, #444);
  border-radius: 8px;
  background: var(--input-bg, #333);
  color: var(--text-primary, #fff);
  font-size: 1rem;
  resize: vertical;
  line-height: 1.5;
  transition: all 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--accent-color, #4f87ff);
  box-shadow: 0 0 0 2px rgba(79, 135, 255, 0.2);
}

/* Detection Card */
.detection-card {
  background: var(--card-bg-light, rgba(255, 255, 255, 0.05));
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.detection-header {
  padding: 0.85rem 1.25rem;
  background: var(--card-bg, rgba(0, 0, 0, 0.2));
  font-weight: 600;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.detection-body {
  padding: 1rem 0;
}

.detection-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 0.85rem 1.25rem;
  gap: 1rem;
}

.detection-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
}

.detection-label {
  color: var(--text-secondary, #aaa);
  font-weight: 500;
  min-width: 100px;
}

.detection-value {
  flex: 1;
  color: var(--text-primary, #fff);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.detection-success {
  color: var(--success-color, #4caf50);
}

.detection-warning {
  color: var(--warning-text, #FFC107);
}

.color-chip {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  margin-right: 4px;
  border: 1px solid var(--border-color, #444);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
  vertical-align: middle;
  flex-shrink: 0;
}

.color-name {
  display: inline-block;
  vertical-align: middle;
}

.color-separator {
  display: inline-block;
  margin: 0 2px;
  color: var(--text-secondary, #aaa);
}

.action-button {
  padding: 0.5rem 0.85rem;
  background: var(--accent-color, #4f87ff);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-button:hover {
  background: var(--accent-hover, #3b6fdf);
  transform: translateY(-1px);
}

.action-button.primary-action {
  font-weight: 600;
  padding: 0.65rem 1.25rem;
}

/* Configuration Panel */
.config-panel, .quick-config-panel {
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: var(--card-bg-light, rgba(255, 255, 255, 0.05));
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.config-section {
  margin-bottom: 1.75rem;
}

.config-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.section-icon {
  margin-right: 0.75rem;
  font-size: 1.2rem;
}

.config-section h4 {
  margin: 0;
  color: var(--text-primary, #fff);
  font-size: 1.125rem;
}

.help-text {
  margin: 0 0 1rem;
  color: var(--text-secondary, #aaa);
  font-size: 0.875rem;
  line-height: 1.4;
}

.input-group {
  display: flex;
  gap: 0.75rem;
}

.apply-button {
  padding: 0.85rem 1.25rem;
  background: var(--accent-color, #4f87ff);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  transition: all 0.2s;
}

.apply-button:hover {
  background: var(--accent-hover, #3b6fdf);
  transform: translateY(-1px);
}

.examples {
  margin-top: 0.75rem;
  color: var(--text-muted, #777);
  font-size: 0.875rem;
  font-style: italic;
}

.quick-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.option-button {
  padding: 0.65rem 1rem;
  background: var(--button-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.option-button:hover {
  background: var(--button-hover-bg, rgba(255, 255, 255, 0.15));
  border-color: var(--accent-color, #4f87ff);
  transform: translateY(-1px);
}

.option-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

/* Color Mapping Styles */
.color-mapping-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.color-mapping-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-mapping-label {
  font-weight: 500;
  color: var(--text-primary, #fff);
}

.color-mapping-input {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.color-select {
  flex: 1;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  background: var(--input-bg, #333);
  color: var(--text-primary, #fff);
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23ccc'%3E%3Cpath d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
  cursor: pointer;
}

.color-preview {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #444);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.color-mapping-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

/* No rows alert */
.no-rows-alert {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  text-align: center;
  background: var(--card-bg-light, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--warning-border, rgba(255, 193, 7, 0.5));
  border-radius: 12px;
  margin: 1rem 0 1.5rem;
}

.alert-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--warning-text, #FFC107);
}

.no-rows-alert h4 {
  margin: 0 0 0.75rem 0;
  color: var(--warning-text, #FFC107);
  font-size: 1.25rem;
}

.no-rows-alert p {
  margin: 0 0 1.5rem 0;
  color: var(--text-secondary, #ddd);
  max-width: 400px;
  line-height: 1.5;
}

/* Error Message */
.error-message {
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: var(--error-bg, rgba(220, 53, 69, 0.1));
  color: var(--error-color, #dc3545);
  border: 1px solid var(--error-border, rgba(220, 53, 69, 0.25));
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.error-icon {
  flex-shrink: 0;
  font-size: 1.25rem;
}

.error-content {
  flex: 1;
}

.error-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.error-text {
  color: var(--error-color-muted, rgba(220, 53, 69, 0.85));
}

/* Action Buttons */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color, #444);
}

.save-button,
.cancel-button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.button-icon {
  font-size: 1.1rem;
}

.save-button {
  background-color: var(--success-color, #28a745);
  color: white;
  border: none;
}

.save-button:hover:not(:disabled) {
  background-color: var(--success-hover, #218838);
  transform: translateY(-2px);
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-button {
  background: var(--button-bg, rgba(255, 255, 255, 0.1));
  color: var(--button-text, #ffffff);
  border: 1px solid var(--button-border, rgba(255, 255, 255, 0.15));
}

.cancel-button:hover {
  background: var(--button-hover-bg, rgba(255, 255, 255, 0.15));
  transform: translateY(-2px);
}

/* Light Theme Overrides */
:root.light .pattern-modal {
  background: #ffffff;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
}

:root.light .modal-header {
  background: #ffffff;
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
  background: rgba(0, 0, 0, 0.05);
}

:root.light .getting-started {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
}

:root.light .steps-list li {
  color: #666;
}

:root.light .steps-list li strong {
  color: #333;
}

:root.light .column-title {
  color: #333;
  border-bottom: 1px solid #e0e0e0;
}

:root.light .pattern-stats {
  color: #666;
  background: rgba(0, 0, 0, 0.05);
}

:root.light .form-group label {
  color: #333;
}

:root.light .label-hint {
  color: #666;
}

:root.light .form-input,
:root.light .form-textarea {
  border: 1px solid #d0d0d0;
  background: #f9f9f9;
  color: #333;
}

:root.light .form-input:focus,
:root.light .form-textarea:focus {
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

:root.light .detection-card {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
}

:root.light .detection-header {
  background: #f1f3f5;
  border-bottom: 1px solid #e0e0e0;
  color: #333;
}

:root.light .detection-item:not(:last-child) {
  border-bottom: 1px solid #eee;
}

:root.light .detection-label {
  color: #666;
}

:root.light .detection-value {
  color: #333;
}

:root.light .detection-success {
  color: #2e7d32;
}

:root.light .detection-warning {
  color: #ff8f00;
}

:root.light .color-chip {
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
}

:root.light .color-separator {
  color: #888;
}

:root.light .config-panel,
:root.light .quick-config-panel {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
}

:root.light .config-section h4 {
  color: #333;
}

:root.light .help-text {
  color: #666;
}

:root.light .option-button {
  background: #f1f3f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

:root.light .option-button:hover {
  background: #e9ecef;
  border-color: #2196f3;
}

:root.light .color-mapping-section {
  border-top: 1px solid #e0e0e0;
}

:root.light .color-mapping-label {
  color: #333;
}

:root.light .color-select {
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  color: #333;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666'%3E%3Cpath d='M6 9L1 4h10z'/%3E%3C/svg%3E");
}

:root.light .color-preview {
  border: 1px solid #e0e0e0;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
}

:root.light .no-rows-alert {
  background: #fffbeb;
  border: 1px solid rgba(255, 193, 7, 0.2);
}

:root.light .no-rows-alert p {
  color: #555;
}

:root.light .action-buttons {
  border-top: 1px solid #e0e0e0;
}

:root.light .cancel-button {
  background: #f1f3f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

:root.light .cancel-button:hover {
  background: #e9ecef;
}

:root.light .error-message {
  background: rgba(220, 53, 69, 0.05);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.15);
}

:root.light .error-text {
  color: rgba(220, 53, 69, 0.85);
}

/* Mobile responsiveness enhancements */
@media (max-width: 480px) {
  .modal-body {
    padding: 1rem;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .form-input, 
  .form-textarea {
    font-size: 0.95rem;
  }
  
  .input-group {
    flex-direction: column;
  }
  
  .apply-button, 
  .action-button {
    width: 100%;
    justify-content: center;
  }
  
  .quick-options {
    flex-direction: column;
  }
  
  .option-button {
    width: 100%;
    justify-content: center;
  }
  
  .action-buttons {
    flex-direction: column-reverse;
  }
  
  .save-button, 
  .cancel-button {
    width: 100%;
    justify-content: center;
  }
}
</style> 