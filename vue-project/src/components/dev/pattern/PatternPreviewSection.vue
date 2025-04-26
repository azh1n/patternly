<template>
  <div v-if="rows.length" class="pattern-preview-section">
    <div class="preview-header">
      <h4>
        Pattern Preview ({{ rows.length }} rows)
        <span v-if="patternShape && patternShape.type !== 'unknown'" class="pattern-shape-badge" :class="patternShape.type">
          {{ patternShape.type === 'circular' ? 'Circular' : 'Rectangular' }}
          <span class="confidence">({{ Math.round(patternShape.confidence * 100) }}%)</span>
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
    
    <!-- Crochet chart notation view -->
    <CrochetNotationView 
      v-else-if="viewMode === 'chart'" 
      :rows="rows" 
      :rawContent="rawContent"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import PatternViewToggle from './PatternViewToggle.vue';
import CrochetNotationView from './crochet/CrochetNotationView.vue';

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
</script>

<style scoped>
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
