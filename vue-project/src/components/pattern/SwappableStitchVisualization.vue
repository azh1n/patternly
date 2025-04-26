<template>
  <div class="swappable-stitch-visualization">
    <div class="visualization-header">
      <h4>Pattern Chart Notation</h4>
      <StitchVisualizationToggle
        v-model:visualizationType="visualizationType"
        class="visualization-toggle"
      />
    </div>

    <!-- Main visualization container -->
    <div class="visualization-container">
      <!-- Colored blocks visualization -->
      <ColorBlockStitches
        v-if="visualizationType === 'color'"
        :currentRow="currentRow"
        :maxStitchesPerView="maxStitchesPerView"
        :initialStitchesPerView="initialStitchesPerView"
        ref="activeVisualization"
      />

      <!-- Symbol-based visualization -->
      <SymbolStitches
        v-else
        :currentRow="currentRow"
        :maxStitchesPerView="maxStitchesPerView"
        :initialStitchesPerView="initialStitchesPerView"
        ref="activeVisualization"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import StitchVisualizationToggle from './stitches/StitchVisualizationToggle.vue';
import ColorBlockStitches from './stitches/ColorBlockStitches.vue';
import SymbolStitches from './stitches/SymbolStitches.vue';

const props = defineProps({
  currentRow: {
    type: Object,
    default: () => ({})
  },
  maxStitchesPerView: {
    type: Number,
    default: 5
  },
  initialStitchesPerView: {
    type: Number,
    default: 3
  }
});

// Local state for visualization type (color or symbol)
const visualizationType = ref('color'); // Default to color blocks

// Reference to the active visualization component
const activeVisualization = ref(null);

// Expose methods from the active visualization
defineExpose({
  // Proxy to the active visualization's currentStitchIndex
  get currentStitchIndex() {
    return activeVisualization.value?.currentStitchIndex || 0;
  },
  // Proxy to the active visualization's stitchesPerView
  get stitchesPerView() {
    return activeVisualization.value?.stitchesPerView || props.initialStitchesPerView;
  },
  // Proxy to the active visualization's displayRepeatedStitchesSeparately
  get displayRepeatedStitchesSeparately() {
    return activeVisualization.value?.displayRepeatedStitchesSeparately !== undefined
      ? activeVisualization.value.displayRepeatedStitchesSeparately
      : true;
  }
});
</script>

<style scoped>
.swappable-stitch-visualization {
  margin-top: 2rem;
  padding: 1rem;
  border-radius: 8px;
  background: var(--card-bg, #2a2a2a);
  border: 1px solid var(--border-color, #444);
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.visualization-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.visualization-header h4 {
  margin: 0;
  color: var(--text-primary, #fff);
  font-size: 1.125rem;
}

/* Light theme overrides */
:root.light .swappable-stitch-visualization {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

@media (max-width: 767px) {
  .visualization-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .visualization-toggle {
    width: 100%;
  }
}
</style> 