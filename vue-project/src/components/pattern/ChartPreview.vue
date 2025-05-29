<template>
  <div class="chart-preview">
    <div v-if="isProcessing" class="processing-overlay">
      <div class="processing-content">
        <div class="spinner"></div>
        <div class="progress-text">{{ progressMessage }}</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <div class="progress-percentage">{{ Math.round(progress) }}%</div>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      <font-awesome-icon icon="exclamation-triangle" class="error-icon" />
      {{ error }}
    </div>
    
    <div class="chart-container" ref="chartContainer">
      <canvas ref="chartCanvas"></canvas>
      
      <div v-if="processedCells.length > 0" class="stitch-overlay">
        <div 
          v-for="(row, rowIndex) in processedCells" 
          :key="`row-${rowIndex}`"
          class="chart-row"
        >
          <div 
            v-for="(cell, colIndex) in row" 
            :key="`cell-${rowIndex}-${colIndex}`"
            class="chart-cell"
            :class="getStitchClass(cell.stitchType)"
            :style="getCellStyle(cell)"
            @click="onCellClick(rowIndex, colIndex, cell)"
          >
            <span class="stitch-symbol">{{ getStitchSymbol(cell.stitchType) }}</span>
            <div v-if="cell.confidence < 0.7" class="low-confidence" :title="`Low confidence: ${Math.round(cell.confidence * 100)}%`">
              <font-awesome-icon icon="exclamation-triangle" />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="selectedCell" class="cell-details">
      <h4>Stitch Details</h4>
      <div class="details-grid">
        <div>Type:</div>
        <div>{{ selectedCell.stitchType.toUpperCase() }}</div>
        <div>Confidence:</div>
        <div>{{ Math.round(selectedCell.confidence * 100) }}%</div>
        <div>Position:</div>
        <div>Row {{ selectedCell.row + 1 }}, Col {{ selectedCell.col + 1 }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useChartProcessing } from '@/services/chartProcessingService';

const props = defineProps({
  imageUrl: {
    type: String,
    required: true
  },
  autoProcess: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['processing-complete', 'error']);

const { progress, progressMessage, isProcessing, error, processChart } = useChartProcessing();

const chartCanvas = ref(null);
const chartContainer = ref(null);
const processedCells = ref([]);
const selectedCell = ref(null);
const canvasContext = ref(null);
const imageElement = new Image();

// Watch for image URL changes
watch(() => props.imageUrl, (newUrl) => {
  if (newUrl) {
    processImage();
  }
}, { immediate: true });

// Process the image when it loads
const processImage = async () => {
  if (!props.imageUrl) return;
  
  try {
    // Load the image
    await new Promise((resolve, reject) => {
      imageElement.onload = resolve;
      imageElement.onerror = () => reject(new Error('Failed to load image'));
      imageElement.src = props.imageUrl;
    });
    
    // Set up canvas
    if (chartCanvas.value) {
      chartCanvas.value.width = imageElement.width;
      chartCanvas.value.height = imageElement.height;
      
      // Draw the image on canvas
      const ctx = chartCanvas.value.getContext('2d');
      ctx.drawImage(imageElement, 0, 0);
      canvasContext.value = ctx;
      
      // Process the chart if autoProcess is true
      if (props.autoProcess) {
        await processChartWithOpenCV();
      }
    }
  } catch (err) {
    console.error('Error processing image:', err);
    emit('error', err.message || 'Failed to process image');
  }
};

// Process the chart using OpenCV and Roboflow
const processChartWithOpenCV = async () => {
  try {
    const result = await processChart(imageElement);
    
    // Add row/col information to each cell
    result.processedCells.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        cell.row = rowIndex;
        cell.col = colIndex;
      });
    });
    
    processedCells.value = result.processedCells;
    emit('processing-complete', result);
  } catch (err) {
    console.error('Error in chart processing:', err);
    emit('error', err.message || 'Failed to process chart');
  }
};

// Get CSS class for a stitch type
const getStitchClass = (stitchType) => {
  if (!stitchType) return '';
  return `stitch-${stitchType.toLowerCase().replace(/\s+/g, '-')}`;
};

// Get symbol for a stitch type
const getStitchSymbol = (stitchType) => {
  if (!stitchType) return '?';
  
  const symbols = {
    'sc': '•',
    'dc': '▯',
    'hdc': '▮',
    'ch': 'o',
    'sl': '—',
    'inc': '∧',
    'dec': '∨'
  };
  
  return symbols[stitchType.toLowerCase()] || stitchType.charAt(0).toUpperCase();
};

// Handle cell click
const onCellClick = (row, col, cell) => {
  selectedCell.value = {
    ...cell,
    row,
    col
  };
};

// Get cell style for positioning
const getCellStyle = (cell) => {
  if (!cell) return {};
  
  // Calculate cell size based on container and grid dimensions
  const container = chartContainer.value;
  if (!container) return {};
  
  const cellSize = Math.min(
    container.clientWidth / (processedCells.value[0]?.length || 1),
    40 // Max cell size
  );
  
  return {
    left: `${cell.x - cellSize/2}px`,
    top: `${cell.y - cellSize/2}px`,
    width: `${cellSize}px`,
    height: `${cellSize}px`
  };
};

// Expose methods for parent component
const process = async () => {
  return processChartWithOpenCV();
};

defineExpose({
  process
});
</script>

<style scoped>
.chart-preview {
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--card-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-container {
  position: relative;
  width: 100%;
  max-height: 80vh;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--main-bg);
}

canvas {
  max-width: 100%;
  height: auto;
  display: block;
}

.stitch-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.chart-row {
  display: flex;
  position: absolute;
  pointer-events: auto;
}

.chart-cell {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: auto;
  user-select: none;
  
  &:hover {
    transform: scale(1.1);
    z-index: 10;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  }
  
  &.selected {
    border: 2px solid var(--accent-color);
    box-shadow: 0 0 10px var(--accent-color);
    z-index: 20;
  }
  
  .stitch-symbol {
    font-size: 1.2em;
  }
  
  .low-confidence {
    position: absolute;
    top: 2px;
    right: 2px;
    color: var(--error-color);
    font-size: 0.6em;
  }
}

/* Stitch type specific styles */
.stitch-sc { background-color: rgba(75, 192, 192, 0.2); }
.stitch-dc { background-color: rgba(54, 162, 235, 0.2); }
.stitch-hdc { background-color: rgba(255, 206, 86, 0.2); }
.stitch-ch { background-color: rgba(153, 102, 255, 0.2); }
.stitch-sl { background-color: rgba(255, 99, 132, 0.2); }
.stitch-inc { background-color: rgba(75, 192, 192, 0.3); }
.stitch-dec { background-color: rgba(255, 159, 64, 0.3); }

/* Processing overlay */
.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  color: white;
  flex-direction: column;
  padding: 2rem;
  text-align: center;
}

.processing-content {
  max-width: 400px;
  width: 100%;
  background: var(--card-bg);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: var(--accent-color);
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--border-color);
  border-radius: 4px;
  margin: 1rem 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent-color);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-percentage {
  font-size: 0.9em;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

/* Error message */
.error-message {
  background-color: var(--error-bg);
  color: var(--error-color);
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-icon {
  font-size: 1.2em;
}

/* Cell details */
.cell-details {
  padding: 1rem;
  background-color: var(--card-bg);
  border-top: 1px solid var(--border-color);
}

.cell-details h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.details-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  font-size: 0.9rem;
}

.details-grid > div:nth-child(odd) {
  font-weight: bold;
  color: var(--text-secondary);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .chart-container {
    max-height: 60vh;
  }
  
  .chart-cell {
    font-size: 0.7rem;
  }
  
  .cell-details {
    font-size: 0.9rem;
  }
}
</style>
