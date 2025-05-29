<template>
  <div class="pattern-upload-demo">
    <div class="container">
      <h1>Knitting Chart Processor</h1>
      <p class="subtitle">Upload a knitting chart image to automatically detect stitches and generate a pattern</p>
      
      <div class="upload-section">
        <PatternFileUploader
          ref="patternUploader"
          :auto-process="true"
          @file-change="onFileChange"
          @processing-complete="onProcessingComplete"
          @error="onError"
        />
      </div>
      
      <div v-if="processingResult" class="results-section">
        <h2>Processing Results</h2>
        <div class="results-grid">
          <div class="result-card">
            <h3>Detected Stitches</h3>
            <div class="stitch-count">
              <span class="count">{{ stitchCount }}</span>
              <span class="label">Total Stitches</span>
            </div>
            <div class="stitch-types">
              <div v-for="(count, type) in stitchTypes" :key="type" class="stitch-type">
                <span class="type">{{ type.toUpperCase() }}</span>
                <span class="count">{{ count }}</span>
              </div>
            </div>
          </div>
          
          <div class="result-card">
            <h3>Pattern Details</h3>
            <div class="detail-item">
              <span class="label">Rows:</span>
              <span class="value">{{ processingResult.grid?.length || 0 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Stitches per Row:</span>
              <span class="value">{{ processingResult.grid?.[0]?.length || 0 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Confidence:</span>
              <span class="value">{{ processingConfidence }}%</span>
            </div>
          </div>
        </div>
        
        <div class="actions">
          <button class="btn primary" @click="savePattern">
            <font-awesome-icon :icon="['fas', 'save']" />
            Save Pattern
          </button>
          <button class="btn secondary" @click="startOver">
            <font-awesome-icon :icon="['fas', 'redo']" />
            Start Over
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import PatternFileUploader from '@/components/PatternFileUploader.vue';

const patternUploader = ref(null);
const processingResult = ref(null);
const error = ref('');

// Computed properties
const stitchCount = computed(() => {
  if (!processingResult.value?.processedCells) return 0;
  return processingResult.value.processedCells.flat().length;
});

const stitchTypes = computed(() => {
  if (!processingResult.value?.processedCells) return {};
  
  const types = {};
  processingResult.value.processedCells.flat().forEach(cell => {
    if (cell.stitchType) {
      types[cell.stitchType] = (types[cell.stitchType] || 0) + 1;
    }
  });
  
  return types;
});

const processingConfidence = computed(() => {
  if (!processingResult.value?.processedCells?.flat().length) return 0;
  
  const cells = processingResult.value.processedCells.flat();
  const totalConfidence = cells.reduce((sum, cell) => sum + (cell.confidence || 0), 0);
  return Math.round((totalConfidence / cells.length) * 100);
});

// Event handlers
const onFileChange = (file) => {
  console.log('File changed:', file);
  if (!file) {
    processingResult.value = null;
  }
};

const onProcessingComplete = (result) => {
  console.log('Processing complete:', result);
  processingResult.value = result;
  error.value = '';
  
  // Scroll to results
  setTimeout(() => {
    const resultsSection = document.querySelector('.results-section');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, 300);
};

const onError = (err) => {
  console.error('Error:', err);
  error.value = err;
};

// Actions
const savePattern = () => {
  if (processingResult.value) {
    // Here you would typically save the pattern to your database
    // For now, we'll just show an alert
    alert('Pattern saved successfully!');
    console.log('Saving pattern:', processingResult.value);
  }
};

const startOver = () => {
  if (patternUploader.value) {
    patternUploader.value.removeFile();
  }
  processingResult.value = null;
  error.value = '';
};
</script>

<style scoped>
.pattern-upload-demo {
  padding: 2rem 1rem;
  background-color: var(--main-bg);
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

h1 {
  text-align: center;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.subtitle {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.upload-section {
  max-width: 800px;
  margin: 0 auto 3rem;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
}

.results-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  margin-top: 2rem;
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

h2 {
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.result-card {
  background: var(--card-bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

h3 {
  color: var(--text-primary);
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
}

.stitch-count {
  text-align: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  border-left: 4px solid var(--accent-color);
}

.stitch-count .count {
  display: block;
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--accent-color);
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stitch-count .label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stitch-types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
}

.stitch-type {
  background: var(--card-bg);
  padding: 0.75rem;
  border-radius: 6px;
  text-align: center;
  border: 1px solid var(--border-color);
}

.stitch-type .type {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.stitch-type .count {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item .label {
  color: var(--text-secondary);
}

.detail-item .value {
  font-weight: 500;
  color: var(--text-primary);
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 1rem;
}

.btn.primary {
  background-color: var(--accent-color);
  color: white;
}

.btn.primary:hover {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

.btn.secondary {
  background-color: var(--card-bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn.secondary:hover {
  background-color: var(--border-color);
  transform: translateY(-1px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .upload-section {
    padding: 1.5rem 1rem;
  }
  
  .results-section {
    padding: 1.5rem 1rem;
  }
  
  .results-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .actions {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .btn {
    width: 100%;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .result-card {
    background: var(--card-bg-secondary);
  }
  
  .stitch-type {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .btn.secondary {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .btn.secondary:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
