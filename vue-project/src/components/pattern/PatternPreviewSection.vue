<template>
  <div v-if="rows.length" class="pattern-preview-section">
    <div class="preview-header">
      <h4>
        Pattern Preview ({{ rows.length }} rows)

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
              <!-- Check if this is a repeat pattern like "(1sc, 1inc) x6" -->
              <template v-if="typeof stitch === 'string' && stitch.includes('(') && stitch.includes(')') && stitch.includes('x')">
                <div class="repeat-group">
                  <span class="repeat-bracket left-bracket">(</span>
                  
                  <!-- Extract and display the repeated stitches -->
                  <template v-for="(repeatedStitch, j) in getRepeatedStitches(stitch)" :key="`nested-rep-${i}-${j}`">
                    <div 
                      class="preview-stitch" 
                      :class="getStitchClass(repeatedStitch)"
                      :title="repeatedStitch"
                    >
                      <span class="stitch-count">{{ getStitchCount(repeatedStitch) }}</span>
                      <span class="stitch-type">{{ getStitchType(repeatedStitch) }}</span>
                    </div>
                  </template>
                  
                  <span class="repeat-bracket right-bracket">)</span>
                  <span class="repeat-count">x{{ getRepeatCount(stitch) }}</span>
                </div>
              </template>
              <template v-else>
                <div 
                  class="preview-stitch" 
                  :class="getStitchClass(stitch)"
                  :title="stitch"
                >
                  <span class="stitch-count">{{ getStitchCount(stitch) }}</span>
                  <span class="stitch-type">{{ getStitchType(stitch) }}</span>
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
    summary[type] = (summary[type] || 0) + getStitchCount(stitch);
  };
  if (row.stitches.repeated) {
    row.stitches.beforeRepeat?.forEach(add);
    row.stitches.repeatedStitches?.forEach((stitch) => {
      summary[getStitchType(stitch)] = (summary[getStitchType(stitch)] || 0) + getStitchCount(stitch) * (row.stitches.repeatCount || 1);
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
  
  return colorMap[colorName.toLowerCase()] || colorName;
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

.expand-toggle {
  margin: 0.5rem 0 1rem 0;
  padding: 0.35rem 1.2rem;
  background: var(--accent-color, #4f87ff);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  outline: none;
  display: inline-block;
}
.expand-toggle[aria-pressed="true"] {
  background: var(--accent-hover, #3a6fd9);
}
:root.light .expand-toggle {
  background: #2979ff;
  color: white;
}
:root.light .expand-toggle[aria-pressed="true"] {
  background: #1565c0;
}

.row-summary {
  padding: 0.5rem 1rem;
  background: rgba(76,175,80,0.10);
  color: var(--text-primary, #b2ff59);
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}
:root.light .row-summary {
  background: rgba(76,175,80,0.07);
  color: #2e7d32;
}

.preview-stitches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  border-radius: 8px;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

/* Repeat group styling */
.repeat-group {
  display: flex;
  align-items: center;
  background-color: rgba(79, 135, 255, 0.1);
  border-radius: 8px;
  padding: 0 0.25rem;
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

:root.light .preview-stitches {
  background: rgba(0, 0, 0, 0.05);
}

:root.light .no-stitches-message {
  color: #666;
  background: rgba(0, 0, 0, 0.05);
  border-color: #ddd;
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
