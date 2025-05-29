<template>
  <div class="file-uploader">
    <!-- Image Processing Progress -->
    <ImageProcessingProgress
      v-if="isProcessing"
      :progress="progress"
      :progress-message="progressMessage"
      :error="processingError"
    />
    
    <!-- Preview Container -->
    <div v-if="previewUrl && !isProcessing" class="preview-container">
      <div v-if="isImage" class="image-preview">
        <img :src="previewUrl" :alt="previewAlt" />
      </div>
      <div v-else-if="isPdf" class="document-preview">
        <iframe 
          :src="previewUrl + '#toolbar=0&navpanes=0'" 
          class="pdf-preview" 
          :title="previewAlt"
          frameborder="0"
        ></iframe>
      </div>
      <div v-else-if="isDocx" class="document-preview">
        <div ref="docxPreview" class="docx-preview"></div>
      </div>
      <div v-else class="file-icon">
        <font-awesome-icon :icon="['fas', 'file']" size="3x" />
        <span class="file-name">{{ fileName }}</span>
      </div>
    </div>
    
    <!-- No Preview State -->
    <div v-if="!previewUrl && !isProcessing" class="no-preview">
      <font-awesome-icon :icon="['fas', 'file']" size="3x" />
      <span>No file selected</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch, defineEmits, onMounted, watchEffect } from 'vue';
import { renderAsync } from 'docx-preview';
import { useUserSettings } from '@/services/userSettings';
import { useImageProcessing } from '@/services/imageProcessingService';
import { useChartProcessing } from '@/services/chartProcessingService';
import ImageProcessingProgress from './ImageProcessingProgress.vue';

const props = defineProps({
  file: {
    type: File,
    default: null
  },
  previewAlt: {
    type: String,
    default: 'File preview'
  }
});

const emit = defineEmits(['error', 'processing-complete', 'processing-error']);

const { experimentalFeatures } = useUserSettings();
const { 
  progress: imageProgress, 
  progressMessage: imageProgressMessage, 
  isProcessing: imageProcessing, 
  error: imageError, 
  processImage 
} = useImageProcessing();

const { 
  progress: chartProgress, 
  progressMessage: chartProgressMessage, 
  isProcessing: chartProcessing, 
  error: chartError, 
  processChart 
} = useChartProcessing();

const previewUrl = ref('');
const fileType = ref('');
const fileName = ref('');
const error = ref('');

// Use source refs directly for state that needs to be modified
const progress = ref(0);
const progressMessage = ref('');
const isProcessing = ref(false);
const processingError = ref(null);

// Update state based on processing services
watchEffect(() => {
  if (chartProcessing.value || imageProcessing.value) {
    progress.value = chartProcessing.value ? chartProgress.value : imageProgress.value;
    progressMessage.value = chartProcessing.value ? chartProgressMessage.value : imageProgressMessage.value;
    isProcessing.value = true;
    processingError.value = chartError.value || imageError.value;
  } else {
    isProcessing.value = false;
  }
});

// File type detection - using startsWith for broader image type checking
const isImage = computed(() => fileType.value && fileType.value.startsWith('image/'));
const isPdf = computed(() => experimentalFeatures.value && fileType.value === 'application/pdf');
const isDocx = computed(() => 
  experimentalFeatures.value && 
  (fileType.value === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
   fileType.value === 'application/msword')
);

const clearPreview = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
  fileType.value = '';
  fileName.value = '';
};

const processFile = async (file) => {
  if (!file) {
    clearPreview();
    return;
  }

  // Clear previous preview and errors
  clearPreview();
  processingError.value = null;
  isProcessing.value = true;
  fileType.value = file.type || getMimeTypeFromExtension(file.name);
  fileName.value = file.name;

  try {
    // Process different file types
    if (isImage.value) {
      // For images, use OpenCV processing
      try {
        // Process with OpenCV
        progressMessage.value = 'Processing image...';
        const processedImage = await processImage(file);
        previewUrl.value = URL.createObjectURL(processedImage);
        emit('processing-complete', processedImage);
      } catch (err) {
        console.error('Error processing image with OpenCV:', err);
        // Fall back to regular image preview
        previewUrl.value = URL.createObjectURL(file);
        processingError.value = 'Image processing failed, showing original';
        emit('error', processingError.value);
      }
    } else if (isPdf.value) {
      // For PDFs, use Roboflow processing
      try {
        progressMessage.value = 'Processing PDF...';
        const processedPdf = await processChart(file);
        previewUrl.value = URL.createObjectURL(processedPdf);
        emit('processing-complete', processedPdf);
      } catch (err) {
        console.error('Error processing PDF with Roboflow:', err);
        previewUrl.value = URL.createObjectURL(file);
        processingError.value = 'PDF processing failed, showing original';
        emit('error', processingError.value);
      }
    } else if (isDocx.value) {
      // For Word docs, use docx-preview
      try {
        progressMessage.value = 'Rendering document...';
        const result = await renderAsync(file, document.querySelector('.docx-preview'));
        emit('processing-complete', result);
      } catch (err) {
        console.error('Error rendering Word document:', err);
        processingError.value = 'Document preview not available';
        emit('error', processingError.value);
      }
    } else {
      // For other file types, just create a preview URL
      progressMessage.value = 'Loading file...';
      previewUrl.value = URL.createObjectURL(file);
      emit('processing-complete', file);
    }
  } catch (err) {
    console.error('Error processing file:', err);
    processingError.value = 'Failed to process file';
    emit('error', processingError.value);
  } finally {
    isProcessing.value = false;
    progressMessage.value = '';
    progress.value = 0;
  }
}

// Watch for file prop changes
watch(() => props.file, async (newFile) => {
  if (newFile) {
    await processFile(newFile);
  } else {
    clearPreview();
  }
}, { immediate: true });

const allowedTypes = computed(() => {
  const types = [
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];
  
  // Only include document types if experimental features are enabled
  if (experimentalFeatures.value) {
    types.push(
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    );
  }
  
  return types;
});



// Clean up object URLs when component is unmounted
onBeforeUnmount(() => {
  clearPreview();
});

// Add type checking for the file object
const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

// Add a fallback MIME type detection based on file extension
const getMimeTypeFromExtension = (filename) => {
  const extension = getFileExtension(filename);
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return mimeTypes[extension] || 'application/octet-stream';
};
</script>

<style scoped>
.file-uploader {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  --uploader-bg: var(--card-bg, #ffffff);
  --uploader-border: var(--border-color, #e0e0e0);
  --uploader-text: var(--text-primary, #333333);
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16/9;
  position: relative;
}

.image-preview {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--card-bg);
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.document-preview {
  width: 100%;
  height: 100%;
  border: 1px solid var(--border-color);
  overflow: hidden;
  background: white;
}

.pdf-preview {
  width: 100%;
  height: 100%;
  border: none;
  /* Hide PDF viewer controls and scrollbars */
  position: relative;
  overflow: hidden;
}

/* Hide scrollbars for WebKit browsers */
.pdf-preview::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbars for Firefox */
.pdf-preview {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.docx-preview {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 1rem;
  background: white;
}

.file-icon, .no-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  height: 100%;
  color: var(--text-secondary);
  padding: 2rem;
  text-align: center;
}

.file-name {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.9em;
  word-break: break-all;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .preview-container {
    aspect-ratio: 1;
  }
  
  .file-icon, .no-preview {
    padding: 1rem;
  }
  
  .file-name {
    font-size: 0.8em;
  }
}

.error-message {
  margin-top: 1rem;
  color: var(--uploader-error);
  font-size: 0.875rem;
}
/* Dark mode is handled by the theme service */
:root {
  --uploader-error: #dc3545;
}

:root.dark {
  --uploader-error: #ff6b6b;
}

/* Document preview theming */
.document-preview {
  background-color: var(--card-bg, #ffffff) !important;
  color: var(--text-primary, #333333) !important;
}

.document-preview * {
  color: var(--text-primary, #333333) !important;
}

.document-preview table {
  border-color: var(--border-color, #e0e0e0) !important;
}

.document-preview th,
.document-preview td {
  border-color: var(--border-color, #e0e0e0) !important;
  background-color: var(--card-bg, #ffffff) !important;
}

/* Ensure PDF background matches theme */
.pdf-preview {
  background-color: var(--card-bg, #ffffff) !important;
}
</style>
