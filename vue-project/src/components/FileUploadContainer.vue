<template>
  <div class="file-upload-container" :class="{ 'has-file': currentFile, 'has-chart': hasProcessedChart }">
    <div 
      v-if="!currentFile"
      class="drop-zone"
      :class="{ 'is-dragover': isDragging }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="onClick"
    >
      <input
        ref="fileInput"
        type="file"
        class="file-input"
        :accept="acceptTypes"
        @change="onFileChange"
      />
      <div class="upload-prompt">
        <font-awesome-icon :icon="['fas', 'cloud-arrow-up']" size="3x" />
        <p class="desktop-text">Drag & drop files here or click to browse</p>
        <p class="mobile-text">Tap to select a file</p>
        <p class="file-types">
          {{ acceptDescription }}
        </p>
      </div>
    </div>
    
    <FileUploader 
      :file="currentFile" 
      :previewAlt="fileName || 'File preview'"
      @error="onPreviewError"
      @processing-start="onProcessingStart"
      @processing-complete="onProcessingComplete"
    />
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import FileUploader from './FileUploader.vue';

const props = defineProps({
  accept: {
    type: String,
    default: '.png,.jpg,.jpeg,.pdf,.docx'
  },
  maxSize: {
    type: Number,
    default: 25 * 1024 * 1024 // 25MB
  }
});

const emit = defineEmits(['file-selected', 'error', 'grid-detected']);

const fileInput = ref(null);
const isDragging = ref(false);
const currentFile = ref(null);
const fileName = ref('');
const error = ref('');
const hasProcessedChart = ref(false);
const detectedGridCells = ref([]);
const extractedCellImages = ref([]);

const acceptTypes = computed(() => {
  return props.accept;
});

const acceptDescription = computed(() => {
  const types = [];
  if (props.accept.includes('.png') || props.accept.includes('.jpg') || props.accept.includes('.jpeg')) {
    types.push('Images');
  }
  if (props.accept.includes('.pdf')) {
    types.push('PDFs');
  }
  if (props.accept.includes('.docx')) {
    types.push('Word Documents');
  }
  return `Supported formats: ${types.join(', ')}`;
});

const onClick = () => {
  fileInput.value.click();
};

const onDragOver = (e) => {
  isDragging.value = true;
  e.stopPropagation();
  e.preventDefault();
};

const onDragLeave = () => {
  isDragging.value = false;
};

const onDrop = (e) => {
  isDragging.value = false;
  error.value = '';
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
};

const onFileChange = (e) => {
  error.value = '';
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
};

const onPreviewError = (err) => {
  error.value = err;
  emit('error', err);
};

const onProcessingStart = (file) => {
  // Reset chart processing state when starting new processing
  hasProcessedChart.value = false;
};

const onProcessingComplete = (result) => {
  // Check if this is a processed chart (from PDF)
  if (currentFile.value && currentFile.value.type === 'application/pdf') {
    hasProcessedChart.value = true;
    
    // Store grid detection results if available
    if (result.gridCells && result.gridCells.length > 0) {
      detectedGridCells.value = result.gridCells;
    }
    
    // Store cell images if available
    if (result.cellImages && result.cellImages.length > 0) {
      extractedCellImages.value = result.cellImages;
      
      // If we have cell images, we can prepare them for Roboflow analysis
      if (extractedCellImages.value.length > 0) {
        // Emit an event with the cell images for Roboflow analysis
        emit('grid-detected', {
          cells: detectedGridCells.value,
          images: extractedCellImages.value
        });
      }
    }
  }
};

const handleFile = (file) => {
  // Check file size
  if (file.size > props.maxSize) {
    error.value = `File is too large. Maximum size is ${props.maxSize / (1024 * 1024)}MB.`;
    emit('error', error.value);
    return;
  }
  
  // Check file type
  const fileExtension = file.name.split('.').pop().toLowerCase();
  const acceptedExtensions = props.accept
    .split(',')
    .map(ext => ext.trim().replace('.', '').toLowerCase());
    
  if (!acceptedExtensions.includes(fileExtension)) {
    error.value = `File type .${fileExtension} is not supported.`;
    emit('error', error.value);
    return;
  }
  
  // If we get here, the file is valid
  currentFile.value = file;
  fileName.value = file.name;
  emit('file-selected', file);
};
</script>

<style scoped>
.file-upload-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  transition: max-width 0.3s ease-in-out;
}

.file-upload-container.has-chart {
  max-width: 100%;
}

.file-upload-container.has-file {
  max-width: 800px;
}

.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: var(--card-bg);
  margin-bottom: 1.5rem;
}

.drop-zone.is-dragover {
  border-color: var(--accent-color);
  background-color: color-mix(in srgb, var(--accent-color) 5%, transparent);
}

.upload-prompt {
  color: var(--text-secondary);
}

.upload-prompt svg {
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.file-input {
  display: none;
}

.mobile-text {
  display: none;
}

.file-types {
  font-size: 0.9em;
  margin-top: 1rem;
  color: var(--text-muted);
}

.error-message {
  color: var(--error-color);
  margin-top: 1rem;
  text-align: center;
  font-size: 0.9em;
}

/* Mobile styles */
@media (max-width: 767px) {
  .desktop-text {
    display: none;
  }
  
  .mobile-text {
    display: block;
  }
  
  .drop-zone {
    padding: 1.5rem 1rem;
  }
}
</style>
