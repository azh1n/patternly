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
import { getStitchSymbolPath, hasStitchSymbol } from '@/assets/crochet-symbols/stitch-mapping';

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
  const match = props.stitch.match(/^(\d+)?([a-zA-Z]+)/);
  return match ? match[2] : props.stitch;
});

const hasSymbol = computed(() => {
  return hasStitchSymbol(stitchType.value);
});

const symbolPath = computed(() => {
  return getStitchSymbolPath(stitchType.value);
});

const getStitchClass = () => {
  const type = stitchType.value;
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
  height: 50px;
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
  bottom: 2px;
  right: 2px;
  background: var(--accent-color, #4f87ff);
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
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
.stitch-symbol.stitch-sc,
.stitch-symbol.stitch-dc,
.stitch-symbol.stitch-hdc,
.stitch-symbol.stitch-tr,
.stitch-symbol.stitch-dtr {
  background: var(--stitch-bg, #333);
}

:root.light .stitch-symbol.stitch-sc,
:root.light .stitch-symbol.stitch-dc,
:root.light .stitch-symbol.stitch-hdc,
:root.light .stitch-symbol.stitch-tr,
:root.light .stitch-symbol.stitch-dtr {
  background: #ffffff;
}

.stitch-symbol.stitch-ch,
.stitch-symbol.stitch-sl {
  background: var(--stitch-special-bg, #444);
}

:root.light .stitch-symbol.stitch-ch,
:root.light .stitch-symbol.stitch-sl {
  background: #ffffff;
}

/* Fallback styles for non-matched stitches */
.stitch-symbol.stitch-bs,
.stitch-symbol.stitch-ns {
  background: var(--stitch-special-bg, #444);
}

:root.light .stitch-symbol.stitch-bs,
:root.light .stitch-symbol.stitch-ns {
  background: #ffffff;
}
</style>
