<template>
  <div v-if="rows.length" class="pattern-preview-section">
    <div class="preview-header">
      <h4>
        Pattern Preview ({{ rows.length }} rows)
        <span v-if="patternShape.type !== 'unknown'" class="pattern-shape-badge" :class="patternShape.type">
          {{ patternShape.type.charAt(0).toUpperCase() + patternShape.type.slice(1) }}
        </span>
      </h4>
      <button @click="$emit('add-new-row')" class="add-row-button">+ Add Row</button>
    </div>
    
    <!-- View mode toggle -->
    <PatternViewToggle v-model:viewMode="viewMode" class="view-toggle" />
    
    <!-- Text-based pattern preview -->
    <div v-if="viewMode === 'text'" class="pattern-preview">
      <div v-for="(row, index) in rows" :key="index" class="preview-row">
        <div class="preview-row-header">
          <span class="preview-row-number">Row {{ row.number }}</span>
          <div v-if="row.color" class="color-indicator" :style="{ backgroundColor: getColorHex(row.color) }"></div>
          <button class="edit-row-button" @click="$emit('edit-row', index)">Edit</button>
        </div>
        <div class="preview-row-content">
          <div v-if="!row.stitches || (Array.isArray(row.stitches) && row.stitches.length === 0)" class="no-stitches-message">
            No stitches detected. Original text: {{ row.text }}
          </div>
          
          <!-- Grid-based preview content for repeated stitch patterns -->
          <div v-else-if="row.stitches.repeated" class="preview-content">
            <!-- Stitches before repeat -->
            <template v-for="(stitch, i) in row.stitches.beforeRepeat" :key="`before-${i}`">
              <div 
                class="preview-stitch" 
                :class="getStitchClass(stitch)"
                :title="stitch"
              >
                {{ stitch }}
              </div>
            </template>
            
            <!-- Repeat pattern with TextStitches.vue-like styling -->
            <div class="repeat-pattern-wrapper">
              <div class="repeat-card">
                <div class="repeat-header">
                  <span class="repeat-label">Repeat</span>
                  <span class="repeat-multiplier">×{{ row.stitches.repeatCount }}</span>
                </div>
                <div class="repeat-content">
                  <template v-for="(stitch, rIndex) in row.stitches.repeatedStitches" :key="`repeat-stitch-${rIndex}`">
                    <div class="repeat-stitch-item">
                      <div class="repeat-stitch" :class="getStitchClass(stitch)">
                        {{ stitch }}
                      </div>
                      <span v-if="rIndex < row.stitches.repeatedStitches.length - 1" class="repeat-comma">,</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
            
            <!-- Stitches after repeat -->
            <template v-for="(stitch, i) in row.stitches.afterRepeat" :key="`after-${i}`">
              <div 
                class="preview-stitch" 
                :class="getStitchClass(stitch)"
                :title="stitch"
              >
                {{ stitch }}
              </div>
            </template>
          </div>
          
          <!-- Grid-based preview content for regular stitch patterns -->
          <div v-else class="preview-content">
            <template v-for="(stitch, i) in row.stitches" :key="i">
              <!-- Handle repeat pattern like "(1sc, 1inc) x6" -->
              <template v-if="typeof stitch === 'string' && stitch.includes('(') && stitch.includes(')') && stitch.includes('x')">
                <div class="repeat-pattern-wrapper">
                  <div class="repeat-card">
                    <div class="repeat-header">
                      <span class="repeat-label">Repeat</span>
                      <span class="repeat-multiplier">×{{ getRepeatCount(stitch) }}</span>
                    </div>
                    <div class="repeat-content">
                      <template v-for="(repeatStitch, rIndex) in getRepeatedStitches(stitch)" :key="`repeat-stitch-${rIndex}`">
                        <div class="repeat-stitch-item">
                          <div class="repeat-stitch" :class="getStitchClass(repeatStitch)">
                            {{ repeatStitch }}
                          </div>
                          <span v-if="rIndex < getRepeatedStitches(stitch).length - 1" class="repeat-comma">,</span>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div 
                  class="preview-stitch" 
                  :class="getStitchClass(stitch)"
                  :title="stitch"
                >
                  {{ stitch }}
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>
    <!-- Chart-based pattern preview -->
    <CrochetNotationView 
      v-else-if="viewMode === 'chart'" 
      :rows="rows" 
      :rawContent="rawContent"
      :collapsed="collapsed"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import PatternViewToggle from './PatternViewToggle.vue';
import CrochetNotationView from './crochet/CrochetNotationView.vue';

// Collapsed state for expand/collapse toggle
const collapsed = ref(false);

const props = defineProps({
  rows: {
    type: Array,
    required: true
  },
  patternShape: {
    type: Object,
    default: () => ({ type: 'unknown', confidence: 0 })
  },
  rawContent: {
    type: String,
    default: ''
  }
});

defineEmits(['add-new-row', 'edit-row']);

// View mode state (text or chart)
const viewMode = ref('text');

// Helper for collapsed summary
function getRowSummary(row) {
  if (!row.stitches || !Array.isArray(row.stitches) || row.stitches.length === 0) {
    return row.text || 'No stitches';
  }
  // Simple summary: count by stitch type
  const summary = {};
  const add = (stitch) => {
    const type = getStitchType(stitch);
    summary[type] = (summary[type] || 0) + parseInt(getStitchCount(stitch));
  };
  if (row.stitches.repeated) {
    row.stitches.beforeRepeat?.forEach(add);
    row.stitches.repeatedStitches?.forEach((stitch) => {
      summary[getStitchType(stitch)] = (summary[getStitchType(stitch)] || 0) + parseInt(getStitchCount(stitch)) * (parseInt(row.stitches.repeatCount) || 1);
    });
    row.stitches.afterRepeat?.forEach(add);
  } else {
    row.stitches.forEach(add);
  }
  return Object.entries(summary).map(([type, count]) => `${count} ${type}`).join(', ');
}

// Helper functions for stitch display
const getStitchCount = (stitch) => {
  const match = stitch.match(/^(\d+)/);
  return match ? match[1] : '1';
};

const getStitchType = (stitch) => {
  const match = stitch.match(/^(\d+)([a-zA-Z]+)/);
  return match ? match[2] : stitch;
};

const getStitchClass = (stitch) => {
  const type = getStitchType(stitch);
  const lowerType = type.toLowerCase();
  
  // Map common stitch types to classes
  const stitchClasses = {
    'sc': 'stitch-sc',
    'dc': 'stitch-dc',
    'hdc': 'stitch-hdc',
    'tr': 'stitch-tr',
    'dtr': 'stitch-dtr',
    'ch': 'stitch-ch',
    'sl': 'stitch-sl',
    'inc': 'stitch-inc',
    'dec': 'stitch-dec',
    'bs': 'stitch-bs',
    'ns': 'stitch-ns'
  };
  
  return stitchClasses[lowerType] || '';
};

// Helper function to get color hex
const getColorHex = (colorName) => {
  const colorMap = {
    'red': '#ff5252',
    'blue': '#4f87ff',
    'green': '#4caf50',
    'yellow': '#ffc107',
    'purple': '#9c27b0',
    'pink': '#e91e63',
    'orange': '#ff9800',
    'teal': '#009688',
    'brown': '#795548',
    'gray': '#9e9e9e',
    'black': '#000000',
    'white': '#ffffff'
  };
  
  return colorMap[colorName?.toLowerCase()] || colorName;
};

// Helper function to check if a stitch is a repeat pattern
const isRepeatPattern = (stitch) => {
  return typeof stitch === 'string' && stitch.includes('(') && stitch.includes(')') && stitch.includes('x');
};

// Helper function to get repeated stitches from a repeat pattern
const getRepeatedStitches = (stitch) => {
  if (!isRepeatPattern(stitch)) return [];
  
  // Extract the part inside parentheses
  const match = stitch.match(/\(([^)]+)\)\s*x(\d+)/);
  if (!match) return [];
  
  const repeatedContent = match[1];
  // Split by commas to get individual stitches
  return repeatedContent.split(',').map(s => s.trim());
};

// Helper function to get repeat count from a repeat pattern
const getRepeatCount = (stitch) => {
  if (!isRepeatPattern(stitch)) return 1;
  
  const match = stitch.match(/\(([^)]+)\)\s*x(\d+)/);
  if (!match) return 1;
  
  return parseInt(match[2], 10);
};
</script>

<style scoped>
/* Pattern Preview Styles */
.pattern-preview-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color, #444);
}

.pattern-meta {
  background: var(--meta-bg, #232323);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid var(--border-color, #333);
  max-width: 480px;
}
:root.light .pattern-meta {
  background: #fff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.meta-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-primary, #fff);
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.meta-label {
  color: var(--text-secondary, #aaa);
  font-size: 1rem;
  min-width: 70px;
  font-weight: 500;
}
.meta-value {
  font-size: 1.05rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent-color, #4CAF50);
}
.pattern-badge {
  background: rgba(76,175,80,0.10);
  border-radius: 6px;
  padding: 0.15rem 0.7rem 0.15rem 0.5rem;
  border: 1px solid rgba(76,175,80,0.18);
  color: var(--accent-color, #4CAF50);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.pattern-badge .meta-icon {
  color: var(--accent-color, #4CAF50);
  margin-right: 0.15rem;
}
.confidence {
  font-size: 0.9em;
  opacity: 0.7;
  margin-left: 0.3rem;
}
.shape-btn.linear {
  background: var(--accent-color, #4CAF50);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.25rem 1.1rem 0.25rem 0.7rem;
  font-size: 1.05rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  box-shadow: 0 1px 6px rgba(76,175,80,0.08);
  transition: background 0.18s;
  cursor: pointer;
}
.shape-btn.linear:hover {
  background: var(--accent-hover, #388e3c);
}
.shape-btn .meta-icon {
  color: #fff;
  margin-right: 0.15rem;
}
@media (max-width: 600px) {
  .pattern-meta {
    padding: 1rem 0.5rem;
    max-width: 100%;
  }
  .meta-title {
    font-size: 1.05rem;
  }
  .meta-row, .meta-label, .meta-value {
    font-size: 0.98rem;
  }
}

.pattern-preview-section h4 {
  margin: 0 0 1rem;
  color: var(--text-primary, #fff);
  font-size: 1.125rem;
}

.view-toggle {
  margin-bottom: 1rem;
}

.pattern-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--card-bg, #2a2a2a);
  border-radius: 8px;
  border: 1px solid var(--border-color, #444);
  max-height: 500px;
  overflow-y: auto;
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
  display: inline-block;
}

.edit-row-button {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  background: transparent;
  color: var(--accent-color, #4f87ff);
  border: 1px solid var(--accent-color, #4f87ff);
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-row-button:hover {
  background: var(--accent-color, #4f87ff);
  color: white;
}

.preview-row-content {
  padding-left: 0rem;
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

/* New grid-based preview styles */
.preview-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 50px));
  gap: 10px;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--card-bg, #2a2a2a);
  border-radius: 6px;
  justify-content: start;
  overflow-x: visible;
  grid-auto-flow: row;
}

.preview-stitch {
  font-size: 0.9rem;
  color: var(--text-primary, #fff);
  position: relative;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin: 0;
  width: 50px;
  height: 35px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--stitch-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border-color, #444);
}

/* Style for different stitch types */
.stitch-sc {
  background-color: var(--sc-bg, #4caf5022);
  border-color: var(--sc-border, #4caf5044);
}

.stitch-dc {
  background-color: var(--dc-bg, #2196f322);
  border-color: var(--dc-border, #2196f344);
}

.stitch-hdc {
  background-color: var(--hdc-bg, #00bcd422);
  border-color: var(--hdc-border, #00bcd444);
}

.stitch-tr {
  background-color: var(--tr-bg, #9c27b022);
  border-color: var(--tr-border, #9c27b044);
}

.stitch-inc {
  background-color: var(--inc-bg, #4caf5033);
  border-color: var(--inc-border, #4caf5055);
}

.stitch-dec {
  background-color: var(--dec-bg, #f4433622);
  border-color: var(--dec-border, #f4433644);
}

.stitch-bs {
  background-color: var(--bs-bg, #ff980022);
  border-color: var(--bs-border, #ff980044);
}

.stitch-ns {
  background-color: var(--ns-bg, #90caf922);
  border-color: var(--ns-border, #90caf944);
}

/* Add scaling for wider stitch codes */
.preview-stitch[class*="dc"],
.preview-stitch[class*="bs"],
.preview-stitch[class*="inc"],
.preview-stitch[class*="dec"] {
  font-size: 0.85rem;
}

/* Further scale down text for 2-digit numbers */
.preview-stitch:is([class*="10"][class*="dc"], [class*="11"][class*="dc"], [class*="20"][class*="dc"], [class*="22"][class*="dc"]) {
  font-size: 0.8rem;
}

/* Even smaller for 3-digit numbers */
.preview-stitch:is([class*="30"][class*="dc"]) {
  font-size: 0.75rem;
}

/* New styles for repeat pattern matching TextStitches.vue */
.repeat-pattern-wrapper {
  /* Always span the full grid width for repeat patterns to prevent horizontal scrolling */
  grid-column: 1 / -1 !important;
  width: 100%;
}

.repeat-card {
  width: 100%;
  background: rgba(60, 60, 70, 0.15);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.repeat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: rgba(60, 60, 70, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.repeat-label {
  font-size: 0.55rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.repeat-multiplier {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--accent-color, #4f87ff);
}

.repeat-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
}

.repeat-stitch-item {
  display: flex;
  align-items: center;
}

.repeat-stitch {
  width: 40px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  background-color: var(--stitch-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border-color, #444);
}

.repeat-comma {
  margin: 0 2px;
  color: rgba(255, 255, 255, 0.6);
}

/* Stitch colors for repeat patterns */
.repeat-stitch.stitch-sc {
  background-color: var(--sc-bg, #4caf5022);
  border-color: var(--sc-border, #4caf5044);
}

.repeat-stitch.stitch-dc {
  background-color: var(--dc-bg, #2196f322);
  border-color: var(--dc-border, #2196f344);
}

.repeat-stitch.stitch-hdc {
  background-color: var(--hdc-bg, #00bcd422);
  border-color: var(--hdc-border, #00bcd444);
}

.repeat-stitch.stitch-tr {
  background-color: var(--tr-bg, #9c27b022);
  border-color: var(--tr-border, #9c27b044);
}

.repeat-stitch.stitch-inc {
  background-color: var(--inc-bg, #4caf5033);
  border-color: var(--inc-border, #4caf5055);
}

.repeat-stitch.stitch-dec {
  background-color: var(--dec-bg, #f4433622);
  border-color: var(--dec-border, #f4433644);
}

.repeat-stitch.stitch-bs {
  background-color: var(--bs-bg, #ff980022);
  border-color: var(--bs-border, #ff980044);
}

.repeat-stitch.stitch-ns {
  background-color: var(--ns-bg, #90caf922);
  border-color: var(--ns-border, #90caf944);
}

/* Preview Header */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.preview-header h4 {
  margin: 0;
}

.add-row-button {
  padding: 0.25rem 0.75rem;
  background: var(--accent-color, #4f87ff);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.add-row-button:hover {
  background: var(--accent-hover, #3a6fd9);
}

/* Pattern shape badge styles */
.pattern-shape-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  font-weight: normal;
  vertical-align: middle;
}

.pattern-shape-badge.circular {
  background-color: rgba(76, 175, 80, 0.2);
  color: var(--accent-color, #4CAF50);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.pattern-shape-badge.rectangular {
  background-color: rgba(33, 150, 243, 0.2);
  color: #2196F3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.pattern-shape-badge .confidence {
  font-size: 0.7rem;
  opacity: 0.8;
  margin-left: 0.25rem;
}

/* Mobile styles */
@media (max-width: 767px) {
  .preview-header {
    padding: 0.75rem;
  }
  
  .preview-header h4 {
    font-size: 1rem;
  }
  
  .pattern-preview {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .preview-row-header {
    padding: 0.6rem 0.75rem;
  }
  
  .preview-row-content {
    padding: 0.75rem;
  }
  
  .preview-content {
    grid-template-columns: repeat(auto-fill, minmax(42px, 42px));
    gap: 6px;
    padding: 0.5rem;
    overflow-x: visible;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  
  .preview-stitch {
    font-size: 0.85rem;
    width: 42px;
    height: 32px;
  }
  
  .repeat-pattern-wrapper {
    min-width: unset;
  }
  
  .repeat-card {
    min-width: 100%;
  }
  
  .repeat-header {
    padding: 3px 6px;
  }
  
  .repeat-content {
    padding: 6px;
  }
  
  .repeat-stitch {
    width: 36px;
    height: 26px;
    font-size: 0.8rem;
  }
  
  .preview-content::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  
  .preview-content::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }
}

/* Light theme overrides */
:root.light .pattern-preview {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:root.light .preview-row-number {
  color: #2979ff;
}

:root.light .color-indicator {
  border: 1px solid rgba(0, 0, 0, 0.1);
}

:root.light .no-stitches-message {
  color: #666;
  background: rgba(0, 0, 0, 0.05);
  border-color: #ddd;
}

:root.light .preview-content {
  background: #f9f9f9;
}

:root.light .repeat-card {
  background: rgba(240, 240, 240, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

:root.light .repeat-header {
  background: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

:root.light .repeat-label {
  color: rgba(0, 0, 0, 0.7);
}

:root.light .repeat-comma {
  color: rgba(0, 0, 0, 0.6);
}

:root.light .repeat-stitch {
  color: #333;
  background-color: rgba(0, 0, 0, 0.03);
  border-color: #e0e0e0;
}

:root.light .pattern-shape-badge.circular {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

:root.light .pattern-shape-badge.rectangular {
  background-color: rgba(33, 150, 243, 0.1);
  color: #2196F3;
  border: 1px solid rgba(33, 150, 243, 0.2);
}
</style>
