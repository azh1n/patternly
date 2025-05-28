<template>
  <div class="file-uploader">
    <div v-if="previewUrl" class="preview-container">
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
    <div v-else class="no-preview">
      <font-awesome-icon :icon="['fas', 'file']" size="3x" />
      <span>No file selected</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch } from 'vue';
import { renderAsync } from 'docx-preview';
import { useUserSettings } from '@/services/userSettings';

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

const emit = defineEmits(['error']);

const { experimentalFeatures } = useUserSettings();
const previewUrl = ref('');
const fileType = ref('');
const fileName = ref('');
const error = ref('');

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

  // Clear previous preview
  clearPreview();
  error.value = '';

  try {
    // Check file type
    fileType.value = file.type || getMimeTypeFromExtension(file.name);
    fileName.value = file.name;

    // Process different file types
    if (isImage.value || isPdf.value) {
      // For images and PDFs, create object URL for preview
      previewUrl.value = URL.createObjectURL(file);
    } else if (isDocx.value) {
      // For DOCX files, use docx-preview
      const arrayBuffer = await file.arrayBuffer();
      await renderAsync(arrayBuffer, document.querySelector('.docx-preview'));
    }
  } catch (err) {
    error.value = 'Failed to process file';
    emit('error', error.value);
    console.error('Error processing file:', err);
  }
};

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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }
  
  return types;
});

const isImage = computed(() => fileType.value.startsWith('image/'));
const isPdf = computed(() => experimentalFeatures.value && fileType.value === 'application/pdf');
const isDocx = computed(() => 
  experimentalFeatures.value && 
  fileType.value === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
);



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
