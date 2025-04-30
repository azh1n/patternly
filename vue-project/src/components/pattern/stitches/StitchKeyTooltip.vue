<template>
  <div :class="['stitch-key-tooltip', isDarkMode ? 'dark-theme' : 'light-theme']">
    <h5>Stitch Key</h5>
    <div class="key-items">
      <div v-for="(symbol, abbr) in stitches" 
           :key="`key-${abbr}`" 
           class="key-item">
        <div class="stitch-symbol" :class="getStitchClass(abbr)">
          <template v-if="checkSymbolExists(abbr)">
            <img 
              :src="getSymbolPath(abbr)" 
              :alt="abbr" 
              class="stitch-svg"
            />
          </template>
          <template v-else>
            {{ abbr }}
          </template>
        </div>
        <span class="key-label">{{ symbol.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTheme } from '@/services/theme';
import { hasStitchSymbol, getStitchSymbolPath } from '@/assets/crochet-symbols/stitch-mapping.js';

// Get theme state
const { isDarkMode } = useTheme();

// Props
const props = defineProps({
  stitches: {
    type: Object,
    required: true
  }
});

// Helper functions
function getStitchClass(stitch) {
  if (!stitch) return '';
  
  // Extract the stitch type (removing any number prefix)
  const type = stitch.toString().replace(/^\d+/, '');
  
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
  
  return stitchClasses[type] || '';
}

function checkSymbolExists(stitch) {
  return hasStitchSymbol(stitch);
}

function getSymbolPath(stitch) {
  return getStitchSymbolPath(stitch);
}
</script>

<style scoped>
.stitch-key-tooltip {
  position: absolute;
  bottom: 100%;
  right: 0;
  width: 420px;
  border-radius: 6px;
  padding: 0.75rem;
  z-index: 100;
}

/* Light theme styles */
.stitch-key-tooltip.light-theme {
  background-color: #FFFFFF !important;
  border: 1px solid #E0E0E0 !important;
  color: #333333 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.stitch-key-tooltip.light-theme h5 {
  color: #333333 !important;
}

.stitch-key-tooltip.light-theme .key-item {
  background-color: rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

.stitch-key-tooltip.light-theme .key-label {
  color: #333333 !important;
}

/* Dark theme styles */
.stitch-key-tooltip.dark-theme {
  background-color: #333333 !important;
  border: 1px solid #444444 !important;
  color: #FFFFFF !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.stitch-key-tooltip.dark-theme h5 {
  color: #FFFFFF !important;
}

.stitch-key-tooltip.dark-theme .key-item {
  background-color: rgba(0, 0, 0, 0.15) !important;
  border-color: transparent !important;
}

.stitch-key-tooltip.dark-theme .key-label {
  color: #FFFFFF !important;
}

/* Structure styles */
.stitch-key-tooltip h5 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  text-align: center;
}

.key-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-start;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  width: calc(50% - 0.375rem);
  min-width: 180px;
}

.key-label {
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 140px;
}

/* Stitch symbol styling */
.stitch-symbol {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: var(--stitch-bg, #333);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stitch-svg {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

@media (max-width: 767px) {
  .stitch-key-tooltip {
    width: 340px;
    left: auto;
    right: 0;
  }
  
  .key-item {
    width: 100%;
    font-size: 0.7rem;
    min-width: 0;
  }
  
  .key-label {
    font-size: 0.7rem;
    min-width: 0;
  }
  
  .stitch-symbol {
    width: 34px;
    height: 34px;
  }
}
</style> 