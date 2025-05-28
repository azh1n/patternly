<template>
  <div class="file-uploader">
    <div 
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
        accept=".png,.jpg,.jpeg,.pdf,.docx"
        @change="onFileChange"
      />
      <div class="upload-prompt">
        <font-awesome-icon :icon="['fas', 'cloud-arrow-up']" size="3x" />
        <p class="desktop-text">Drag & drop files here or click to browse</p>
        <p class="mobile-text">Tap to select a file</p>
        <p class="file-types">
          Supported formats: PNG, JPG, PDF, DOCX
          <template v-if="experimentalFeatures">, PDF, DOCX</template>
        </p>
      </div>
    </div>
    
    <div v-if="previewUrl" class="preview-container">
      <h4>Preview</h4>
      <div v-if="isImage" class="image-preview">
        <img :src="previewUrl" alt="Upload preview" />
      </div>
      <div v-else-if="isPdf" class="document-preview">
        <iframe :src="previewUrl" class="pdf-preview"></iframe>
      </div>
      <div v-else-if="isDocx" class="document-preview">
        <div ref="docxPreview" class="docx-preview"></div>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';

const props = defineProps({
  maxSize: {
    type: Number,
    default: 10 * 1024 * 1024, // 10MB
  },
});

const emit = defineEmits(['file-uploaded', 'error']);

const fileInput = ref(null);
const isDragging = ref(false);
const previewUrl = ref('');
const fileType = ref('');
const error = ref('');

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

const onDrop = async (e) => {
  isDragging.value = false;
  error.value = '';
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    await processFile(files[0]);
  }
};

const onFileChange = async (e) => {
  error.value = '';
  const file = e.target.files[0];
  if (file) {
    await processFile(file);
  }
};

const processFile = async (file) => {
  try {
    // Reset previous state
    previewUrl.value = '';
    fileType.value = '';
    error.value = '';
    
    // Validate file size
    if (file.size > props.maxSize) {
      throw new Error(`File is too large. Maximum size is ${props.maxSize / (1024 * 1024)}MB`);
    }
    
    // First try to detect file type using file-type
    let detectedType;
    try {
      detectedType = await fileTypeFromBlob(file);
    } catch (err) {
      console.warn('File type detection failed, falling back to extension check', err);
      detectedType = { mime: getMimeTypeFromExtension(file.name) };
    }
    
    // If we still don't have a type, try to get it from the file's type property
    if (!detectedType || !detectedType.mime) {
      detectedType = { mime: file.type || getMimeTypeFromExtension(file.name) };
    }
    
    const allowedMimeTypes = allowedTypes.value;
    if (!detectedType.mime || !allowedMimeTypes.includes(detectedType.mime)) {
      let errorMsg = 'Unsupported file type. Please upload a PNG or JPG image.';
      if (experimentalFeatures.value) {
        errorMsg = 'Unsupported file type. Please upload a PNG, JPG, PDF, or DOCX file.';
      }
      throw new Error(errorMsg);
    }
    
    fileType.value = detectedType.mime;
    
    // Create preview
    if (isImage.value) {
      previewUrl.value = URL.createObjectURL(file);
    } else if (isPdf.value) {
      // For PDFs, we'll use the browser's built-in PDF viewer
      previewUrl.value = URL.createObjectURL(file);
    } else if (isDocx.value) {
      // For DOCX, we'll use docx-preview
      const arrayBuffer = await file.arrayBuffer();
      await renderAsync(arrayBuffer, document.querySelector('.docx-preview'));
    }
    
    // Emit the file data to parent
    emit('file-uploaded', {
      file,
      type: fileType.value,
      previewUrl: previewUrl.value,
    });
    
  } catch (err) {
    console.error('Error processing file:', err);
    error.value = err.message || 'Failed to process file';
    emit('error', error.value);
  }
};

// Clean up object URLs when component is unmounted
onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
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
  --uploader-text-muted: var(--text-secondary, #666666);
  --uploader-error: #dc3545;
  --uploader-preview-bg: var(--card-bg, #ffffff);
  --uploader-dropzone-bg: var(--card-bg, #ffffff);
  --uploader-dropzone-hover: color-mix(in srgb, var(--primary-color, #4a6cf7) 10%, var(--card-bg, #ffffff));
  --uploader-image-bg: var(--input-bg, #f5f5f5);
  --uploader-document-bg: var(--card-bg, #ffffff);
  --uploader-document-text: var(--text-primary, #333333);
}

.drop-zone {
  border: 2px dashed var(--uploader-border);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: var(--uploader-dropzone-bg);
  color: var(--uploader-text);
}

.drop-zone:hover,
.drop-zone.is-dragover {
  border-color: var(--primary-color);
  background-color: var(--uploader-dropzone-hover);
}

.file-input {
  display: none;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.mobile-text {
  display: none;
}

/* Mobile styles */
@media (max-width: 767px) {
  .desktop-text {
    display: none;
  }
  
  .mobile-text {
    display: block;
  }
}

.file-types {
  font-size: 0.875rem;
  color: var(--uploader-text-muted);
  margin-top: 0.5rem;
}

.preview-container {
  margin-top: 1.5rem;
  border: 1px solid var(--uploader-border);
  border-radius: 8px;
  padding: 1rem;
  background-color: var(--uploader-preview-bg);
}

.preview-container h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--uploader-text);
}

.image-preview {
  max-width: 100%;
  max-height: 400px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--uploader-image-bg);
  border-radius: 4px;
}

.image-preview img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.document-preview {
  width: 100%;
  height: 500px;
  border: 1px solid var(--uploader-border);
  border-radius: 4px;
  overflow: auto;
  background-color: var(--uploader-document-bg);
  color: var(--uploader-document-text);
}

.pdf-preview {
  width: 100%;
  height: 100%;
  border: none;
  background-color: var(--uploader-document-bg);
  color: var(--uploader-document-text);
}

.docx-preview {
  padding: 1rem;
  background-color: var(--uploader-document-bg);
  color: var(--uploader-document-text);
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
