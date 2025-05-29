<template>
  <div class="pattern-file-uploader">
    <div 
      class="drop-zone"
      :class="{ 'drag-over': isDragging, 'has-file': file }"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      @click="onClick"
    >
      <input
        ref="fileInput"
        type="file"
        class="file-input"
        accept="image/*"
        @change="onFileChange"
      />
      
      <transition name="fade" mode="out-in">
        <div v-if="!file && !isProcessing" class="upload-prompt">
          <font-awesome-icon :icon="['fas', 'cloud-upload-alt']" class="upload-icon" />
          <p class="upload-text">Drag & drop your knitting chart here or click to browse</p>
          <p class="file-types">Supports: JPG, PNG, GIF (max 10MB)</p>
        </div>
        
        <div v-else-if="isProcessing" class="processing-state">
          <div class="processing-content">
            <div class="spinner"></div>
            <p class="processing-text">Processing your chart...</p>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <p class="progress-text">{{ progressMessage }}</p>
          </div>
        </div>
        
        <div v-else class="file-preview">
          <div class="file-info">
            <font-awesome-icon :icon="['fas', 'file-image']" class="file-icon" />
            <div class="file-details">
              <p class="file-name">{{ file.name }}</p>
              <p class="file-size">{{ formatFileSize(file.size) }}</p>
            </div>
            <button 
              type="button" 
              class="remove-button"
              @click.stop="removeFile"
              aria-label="Remove file"
            >
              <font-awesome-icon :icon="['fas', 'times']" />
            </button>
          </div>
          
          <div class="image-preview">
            <img :src="previewUrl" :alt="file.name" />
          </div>
        </div>
      </transition>
    </div>
    
    <div v-if="error" class="error-message">
      <font-awesome-icon :icon="['fas', 'exclamation-circle']" />
      {{ error }}
    </div>
    
    <!-- Chart Preview Component -->
    <ChartPreview
      v-if="showChartPreview && previewUrl"
      ref="chartPreview"
      :image-url="previewUrl"
      :auto-process="autoProcess"
      @processing-complete="onProcessingComplete"
      @error="onProcessingError"
      class="chart-preview-container"
    />
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, defineProps, defineEmits, defineExpose } from 'vue';
import ChartPreview from '@/components/pattern/ChartPreview.vue';

const props = defineProps({
  autoProcess: {
    type: Boolean,
    default: true
  },
  showChartPreview: {
    type: Boolean,
    default: true
  },
  maxSizeMB: {
    type: Number,
    default: 10
  }
});

const emit = defineEmits(['file-change', 'processing-complete', 'error']);

// Refs
const fileInput = ref(null);
const chartPreview = ref(null);
const file = ref(null);
const previewUrl = ref('');
const isDragging = ref(false);
const isProcessing = ref(false);
const error = ref('');
const progress = ref(0);
const progressMessage = ref('');

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Handle file selection
const onFileChange = async (event) => {
  const selectedFile = event.target.files[0];
  if (!selectedFile) return;
  
  // Reset state
  error.value = '';
  isProcessing.value = false;
  progress.value = 0;
  progressMessage.value = '';
  
  // Validate file size
  if (selectedFile.size > props.maxSizeMB * 1024 * 1024) {
    error.value = `File size exceeds ${props.maxSizeMB}MB limit`;
    emit('error', error.value);
    return;
  }
  
  // Validate file type
  if (!selectedFile.type.startsWith('image/')) {
    error.value = 'Please upload an image file (JPG, PNG, GIF)';
    emit('error', error.value);
    return;
  }
  
  file.value = selectedFile;
  
  // Create preview URL
  previewUrl.value = URL.createObjectURL(selectedFile);
  
  // Emit file change event
  emit('file-change', selectedFile);
  
  // Auto-process if enabled
  if (props.autoProcess) {
    try {
      isProcessing.value = true;
      progressMessage.value = 'Preparing to process chart...';
      
      // Small delay to ensure the preview component is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (chartPreview.value) {
        await processChart();
      }
    } catch (err) {
      console.error('Error during auto-processing:', err);
      error.value = 'Failed to process image: ' + (err.message || 'Unknown error');
      emit('error', error.value);
    } finally {
      isProcessing.value = false;
    }
  }
};

// Process the chart using the ChartPreview component
const processChart = async () => {
  if (chartPreview.value && typeof chartPreview.value.process === 'function') {
    try {
      isProcessing.value = true;
      progressMessage.value = 'Analyzing chart...';
      progress.value = 30;
      
      const result = await chartPreview.value.process();
      emit('processing-complete', result);
      return result;
    } catch (err) {
      console.error('Error processing chart:', err);
      error.value = 'Failed to process chart: ' + (err.message || 'Unknown error');
      emit('error', error.value);
      throw err;
    } finally {
      isProcessing.value = false;
      progress.value = 100;
    }
  }
  return null;
};

// Handle processing completion
const onProcessingComplete = (result) => {
  emit('processing-complete', result);
};

// Handle processing errors
const onProcessingError = (err) => {
  console.error('Chart processing error:', err);
  error.value = 'Failed to process chart: ' + (err.message || 'Unknown error');
  emit('error', error.value);
};

// Update progress
const updateProgress = (value, message) => {
  progress.value = value;
  if (message) {
    progressMessage.value = message;
  }
};

// Drag and drop handlers
const onDragOver = (e) => {
  e.preventDefault();
  isDragging.value = true;
};

const onDragLeave = () => {
  isDragging.value = false;
};

const onDrop = (e) => {
  e.preventDefault();
  isDragging.value = false;
  
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    const fileInput = {
      target: {
        files: e.dataTransfer.files
      }
    };
    onFileChange(fileInput);
  }
};

const onClick = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

// Remove file
const removeFile = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  file.value = null;
  previewUrl.value = '';
  error.value = '';
  isProcessing.value = false;
  progress.value = 0;
  progressMessage.value = '';
  
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// Clean up
onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});

// Expose methods to parent component
defineExpose({
  processChart,
  removeFile,
  getFile: () => file.value,
  getPreviewUrl: () => previewUrl.value
});
</script>

<style scoped>
.pattern-file-uploader {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  --uploader-bg: var(--card-bg, #ffffff);
  --uploader-border: var(--border-color, #e0e0e0);
  --uploader-border-hover: var(--accent-color, #4a6fa5);
  --uploader-text: var(--text-secondary, #666);
  --uploader-text-hover: var(--text-primary, #333);
  --uploader-error: var(--error-color, #e74c3c);
  --uploader-accent: var(--accent-color, #4a6fa5);
  --uploader-accent-light: rgba(74, 111, 165, 0.1);
}

.drop-zone {
  border: 2px dashed var(--uploader-border);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: var(--uploader-bg);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--uploader-border-hover);
  background-color: var(--uploader-accent-light);
}

.drop-zone.has-file {
  padding: 1rem;
  min-height: auto;
}

.file-input {
  display: none;
}

.upload-prompt {
  color: var(--uploader-text);
  transition: color 0.3s ease;
  padding: 1rem;
  z-index: 1;
  max-width: 90%;
}

.drop-zone:hover .upload-prompt {
  color: var(--uploader-text-hover);
}

.upload-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--uploader-accent);
  transition: transform 0.3s ease;
}

.drop-zone:hover .upload-icon {
  transform: translateY(-3px);
}

.upload-text {
  font-size: 1.1rem;
  margin: 0.5rem 0;
  font-weight: 500;
  color: var(--text-primary);
}

.file-types {
  font-size: 0.9rem;
  margin: 0.5rem 0 0;
  opacity: 0.8;
  color: var(--text-secondary);
}

/* Processing State */
.processing-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 10;
  padding: 2rem;
  text-align: center;
}

.processing-content {
  width: 100%;
  max-width: 300px;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--uploader-accent);
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.processing-text {
  font-weight: 500;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--uploader-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background-color: var(--uploader-accent);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* File Preview */
.file-preview {
  width: 100%;
  z-index: 1;
}

.file-info {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: var(--card-bg);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.file-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
  color: var(--uploader-accent);
}

.file-details {
  flex: 1;
  text-align: left;
  overflow: hidden;
  min-width: 0;
}

.file-name {
  margin: 0;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.file-size {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.remove-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  margin-left: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 32px;
  height: 32px;
}

.remove-button:hover {
  background-color: var(--uploader-border);
  color: var(--uploader-error);
}

.image-preview {
  width: 100%;
  max-height: 400px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid var(--uploader-border);
  margin-top: 1rem;
  background-color: #f8f9fa;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

/* Error Message */
.error-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--error-bg, #fde8e8);
  color: var(--error-color, #e74c3c);
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-left: 3px solid var(--error-color, #e74c3c);
}

.error-message svg {
  flex-shrink: 0;
}

/* Chart Preview Container */
.chart-preview-container {
  margin-top: 1.5rem;
  border: 1px solid var(--uploader-border);
  border-radius: 8px;
  overflow: hidden;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .drop-zone {
    padding: 1.5rem 1rem;
    min-height: 180px;
  }
  
  .upload-icon {
    font-size: 2rem;
  }
  
  .upload-text {
    font-size: 1rem;
  }
  
  .file-types {
    font-size: 0.8rem;
  }
  
  .file-info {
    padding: 0.5rem;
  }
  
  .file-icon {
    font-size: 1.25rem;
    margin-right: 0.75rem;
  }
  
  .file-name {
    font-size: 0.95rem;
  }
  
  .file-size {
    font-size: 0.8rem;
  }
  
  .processing-state {
    padding: 1rem;
  }
  
  .processing-text {
    font-size: 0.95rem;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .processing-state {
    background-color: rgba(30, 30, 35, 0.95);
  }
  
  .spinner {
    border-top-color: var(--uploader-accent);
  }
  
  .image-preview {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
