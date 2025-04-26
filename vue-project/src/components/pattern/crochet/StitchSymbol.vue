<template>
  <div 
    class="stitch-symbol" 
    :class="[getStitchClass(), { 'with-count': showCount && count > 1 }]"
    :title="stitch"
  >
    <div v-if="hasSymbol" class="symbol-container">
      <img :src="symbolPath" :alt="stitch" class="symbol-image" />
    </div>
    <div v-else class="fallback-symbol">
      {{ stitchType }}
    </div>
    <div v-if="showCount && count > 1" class="stitch-count">
      {{ count }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { hasStitchSymbol, getStitchSymbolPath } from '../../../assets/crochet-symbols/stitch-mapping.js';

const props = defineProps({
  stitch: {
    type: String,
    required: true
  },
  showCount: {
    type: Boolean,
    default: true
  }
});

// Extract count and stitch type from the stitch string (e.g., "3dc" -> count: 3, type: "dc")
const count = computed(() => {
  const match = props.stitch.match(/^(\d+)/);
  return match ? parseInt(match[1]) : 1;
});

const stitchType = computed(() => {
  // Handle cases where stitch might already be sanitized (no numbers)
  if (!props.stitch.match(/^\d+/)) {
    return props.stitch;
  }
  
  const match = props.stitch.match(/^(\d+)?([a-zA-Z]+)/);
  return match ? match[2] : props.stitch;
});

// Check if we have a symbol for this stitch type
const hasSymbol = computed(() => {
  return hasStitchSymbol(stitchType.value);
});

// Get the path to the stitch symbol
const symbolPath = computed(() => {
  return getStitchSymbolPath(stitchType.value);
});

const getStitchClass = () => {
  const type = stitchType.value.toLowerCase();
  
  // Handle special cases like bs, ns which may not be in the mapping
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
    'ns': 'stitch-ns',
    '1sc': 'stitch-sc',
    '1dc': 'stitch-dc',
    '2sc': 'stitch-sc',
    '2dc': 'stitch-dc',
    '3sc': 'stitch-sc',
    '3dc': 'stitch-dc',
    '4sc': 'stitch-sc',
    '4dc': 'stitch-dc'
  };
  
  return stitchClasses[type] || '';
};
</script>

<style scoped>
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
  font-size: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.with-count {
  position: relative;
}

.symbol-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.symbol-image {
  max-width: 80%;
  max-height: 80%;
  filter: var(--symbol-filter, invert(1));
  transition: filter 0.2s ease;
}

.fallback-symbol {
  font-size: 0.875rem;
  font-weight: 600;
}

.stitch-count {
  position: absolute;
  bottom: 0;
  right: 0;
  background: var(--accent-color, #4f87ff);
  color: white;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  font-size: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:root.light .stitch-symbol {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  color: #333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:root.light .symbol-image {
  filter: brightness(0);
}

:root.light .fallback-symbol {
  color: #333;
}

:root.light .stitch-count {
  background: #2979ff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Stitch type-specific styling */
.stitch-symbol.stitch-sc {
  background: var(--stitch-sc-bg, #e91e63);
  color: white;
}

.stitch-symbol.stitch-dc {
  background: var(--stitch-dc-bg, #4caf50);
  color: white;
}

.stitch-symbol.stitch-hdc {
  background: var(--stitch-hdc-bg, #ff9800);
  color: white;
}

.stitch-symbol.stitch-tr {
  background: var(--stitch-tr-bg, #2196f3);
  color: white;
}

.stitch-symbol.stitch-dtr {
  background: var(--stitch-dtr-bg, #9c27b0);
  color: white;
}

.stitch-symbol.stitch-ch {
  background: var(--stitch-ch-bg, #607d8b);
  color: white;
}

.stitch-symbol.stitch-sl {
  background: var(--stitch-sl-bg, #795548);
  color: white;
}

.stitch-symbol.stitch-inc,
.stitch-symbol.stitch-dec {
  background: var(--stitch-special-bg, #444);
  color: white;
}

.stitch-symbol.stitch-bs,
.stitch-symbol.stitch-ns {
  background: var(--stitch-special-bg, #444);
  color: white;
}

:root.light .stitch-symbol.stitch-sc {
  background: #ffcdd2;
  color: #c2185b;
  border-color: #e91e63;
}

:root.light .stitch-symbol.stitch-dc {
  background: #c8e6c9;
  color: #2e7d32;
  border-color: #4caf50;
}

:root.light .stitch-symbol.stitch-hdc {
  background: #ffe0b2;
  color: #e65100;
  border-color: #ff9800;
}

:root.light .stitch-symbol.stitch-tr {
  background: #bbdefb;
  color: #0d47a1;
  border-color: #2196f3;
}

:root.light .stitch-symbol.stitch-dtr {
  background: #e1bee7;
  color: #6a1b9a;
  border-color: #9c27b0;
}

:root.light .stitch-symbol.stitch-ch {
  background: #cfd8dc;
  color: #37474f;
  border-color: #607d8b;
}

:root.light .stitch-symbol.stitch-sl {
  background: #d7ccc8;
  color: #4e342e;
  border-color: #795548;
}

:root.light .stitch-symbol.stitch-inc,
:root.light .stitch-symbol.stitch-dec,
:root.light .stitch-symbol.stitch-bs,
:root.light .stitch-symbol.stitch-ns {
  background: #f5f5f5;
  color: #333;
  border-color: #9e9e9e;
}
</style>
