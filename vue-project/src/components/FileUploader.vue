<template>
  <div class="file-uploader-container">
    <!-- Full-page Loading Overlay -->
    <div v-if="isProcessing" class="processing-overlay">
      <div class="processing-content">
        <div class="spinner">
          <div class="spinner-inner"></div>
        </div>
        <h3>Processing Document</h3>
        <p>This may take several minutes for complex documents</p>
        
        <!-- Progress Section -->
        <div class="progress-section">
          <div class="progress-info">
            <span class="progress-message">{{ progressMessage || 'Initializing...' }}</span>
            <span class="progress-percent" v-if="progress > 0">{{ Math.round(progress) }}%</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${progress}%`, opacity: progress > 0 ? 1 : 0 }"
            ></div>
          </div>
        </div>
        
        <!-- Error Display -->
        <div v-if="processingError" class="error-message">
          {{ processingError }}
        </div>
      </div>
    </div>

    <div class="file-uploader">
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
      <div v-else-if="!isProcessing" class="no-preview">
        <font-awesome-icon :icon="['fas', 'file']" size="3x" />
        <span>No file selected</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch, defineEmits, onMounted, watchEffect } from 'vue';

// PDF.js loading state
const isPdfJsLoaded = ref(false);
const pdfjsLib = ref(null);

// Load PDF.js dynamically
const loadPdfJs = () => {
  return new Promise((resolve) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    // Use a more reliable CDN URL without integrity check
    script.src = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.min.js';
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      const lib = window['pdfjs-dist/build/pdf'];
      // Use the same CDN for the worker
      lib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
      console.log('PDF.js loaded successfully');
      window.pdfjsLib = lib; // Cache for future use
      resolve(lib);
    };
    
    script.onerror = (error) => {
      console.error('Failed to load PDF.js:', error);
      resolve(null);
    };
    
    document.head.appendChild(script);
  });
};

// Initialize PDF.js when component mounts
onMounted(async () => {
  try {
    if (typeof window === 'undefined') return;
    
    const lib = await loadPdfJs();
    if (lib) {
      pdfjsLib.value = lib;
      isPdfJsLoaded.value = true;
      console.log('PDF.js initialized in component');
    } else {
      console.error('Failed to load PDF.js');
    }
  } catch (error) {
    console.error('Error initializing PDF.js:', error);
  }
});
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
      // For PDFs, first convert to image, then process
      let pdfUrl = null;
      let loadingTask = null;
      
      try {
        if (!isPdfJsLoaded.value || !pdfjsLib.value) {
          // Try to load PDF.js
          const lib = await loadPdfJs();
          if (lib) {
            pdfjsLib.value = lib;
            isPdfJsLoaded.value = true;
          } else {
            throw new Error('PDF.js library failed to load. Please check your internet connection and try again.');
          }
        }
        
        // Step 1: Create object URL for the PDF
        progressMessage.value = 'Preparing PDF...';
        console.log('[FileUploader] Creating object URL for PDF...');
        pdfUrl = URL.createObjectURL(file);
        
        if (!pdfUrl) {
          throw new Error('Failed to create object URL for PDF');
        }
        
        // Step 2: Load the PDF document
        progressMessage.value = 'Loading PDF document...';
        console.log('[FileUploader] Loading PDF document...');
        loadingTask = pdfjsLib.value.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@3.0.279/cmaps/',
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;
        console.log(`[FileUploader] PDF loaded: ${pdf.numPages} pages`);
        
        if (pdf.numPages === 0) {
          throw new Error('PDF contains no pages');
        }
        
        // Step 3: Get the first page
        progressMessage.value = 'Rendering PDF page...';
        console.log('[FileUploader] Getting first page...');
        const page = await pdf.getPage(1);
        
        // Step 4: Set up viewport and canvas
        console.log('[FileUploader] Setting up viewport and canvas...');
        
        // Get the original page dimensions
        const origViewport = page.getViewport({ scale: 1.0 });
        console.log(`[FileUploader] Original PDF dimensions: ${origViewport.width}x${origViewport.height}`);
        
        // Use a higher scale for better quality
        const scale = 2.0;
        const viewport = page.getViewport({ 
          scale: scale,
          rotation: 0
        });
        
        console.log(`[FileUploader] Scaled viewport dimensions: ${viewport.width}x${viewport.height}`);
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        // Set canvas size to match the viewport exactly
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        console.log(`[FileUploader] Canvas dimensions set to: ${canvas.width}x${canvas.height}`);
        
        // Step 5: Render PDF page to canvas
        progressMessage.value = 'Converting PDF to image...';
        console.log('[FileUploader] Rendering PDF page to canvas...');
        
        // Fill with white background first
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render the PDF page
        try {
          console.time('renderPDF');
          await page.render({
            canvasContext: context,
            viewport: viewport,
            intent: 'print', // Better quality rendering
            background: 'transparent'
          }).promise;
          console.timeEnd('renderPDF');
          console.log('[FileUploader] PDF rendered successfully');
        } catch (renderError) {
          console.error('[FileUploader] Error rendering PDF:', renderError);
          throw new Error(`Failed to render PDF: ${renderError.message}`);
        }
        
        // Step 6: Convert canvas to blob for processing
        progressMessage.value = 'Preparing image for processing...';
        console.log('[FileUploader] Converting canvas to blob...');
        
        const blob = await new Promise((resolve, reject) => {
          try {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob from canvas'));
                  return;
                }
                console.log(`[FileUploader] Created blob of size: ${blob.size} bytes`);
                resolve(blob);
              },
              'image/png',
              0.95 // High quality
            );
          } catch (blobError) {
            console.error('[FileUploader] Error creating blob:', blobError);
            reject(new Error('Failed to convert canvas to blob'));
          }
        });
        
        // Step 7: Create an image element for processing
        console.log('[FileUploader] Creating image element...');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Step 8: Wait for the image to load
        progressMessage.value = 'Loading image for processing...';
        console.log('[FileUploader] Loading image from blob...');
        
        // Debug: Save canvas data directly to see what we're working with
        console.log('[FileUploader] Canvas data before creating image:', {
          width: canvas.width,
          height: canvas.height,
          hasContext: !!context,
          dataURL: canvas.toDataURL ? canvas.toDataURL().substring(0, 100) + '...' : 'N/A'
        });
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Image loading timed out'));
          }, 30000); // 30 second timeout
          
          img.onload = () => {
            clearTimeout(timeout);
            console.log(`[FileUploader] Image loaded: ${img.width}x${img.height}`);
            URL.revokeObjectURL(img.src); // Clean up
            resolve();
          };
          
          img.onerror = (err) => {
            clearTimeout(timeout);
            console.error('[FileUploader] Error loading image:', err);
            reject(new Error('Failed to load image for processing'));
          };
          
          try {
            // Create a new object URL from the blob
            const objectUrl = URL.createObjectURL(blob);
            console.log('[FileUploader] Created object URL for image:', objectUrl);
            img.src = objectUrl;
          } catch (urlError) {
            clearTimeout(timeout);
            console.error('[FileUploader] Error creating object URL:', urlError);
            reject(new Error('Failed to create image URL'));
          }
        });
        
        console.log('[FileUploader] Image loaded successfully');
        
        // Process the image element
        progressMessage.value = 'Processing chart...';
        console.log('[FileUploader] Starting chart processing with image dimensions:', {
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete
        });
        
        const result = await processChart(img);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to process image');
        }
        
        if (!result.blob) {
          throw new Error('No processed image data received');
        }
        
        // Create object URL from processed image blob
        const processedUrl = URL.createObjectURL(result.blob);
        console.log('[FileUploader] Created URL for processed image:', processedUrl);
        previewUrl.value = processedUrl;
        emit('processing-complete', result.blob);
        
      } catch (err) {
        console.error('Error processing PDF:', err);
        // Fall back to showing the original PDF
        previewUrl.value = URL.createObjectURL(file);
        processingError.value = `PDF processing failed: ${err.message || 'Unknown error'}. Showing original.`;
        console.error('PDF processing error details:', err);
        emit('error', processingError.value);
      } finally {
        // Clean up resources
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        if (loadingTask) loadingTask.destroy();
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
/* Processing Overlay */
.processing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--card-bg-rgb), 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.processing-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

.processing-content h3 {
  margin: 1rem 0 0.5rem;
  color: var(--text-primary);
}

.processing-content p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

/* Spinner */
.spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto 1.5rem;
  position: relative;
}

.spinner-inner {
  width: 100%;
  height: 100%;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Progress Section */
.progress-section {
  margin-top: 2rem;
  width: 100%;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9em;
}

.progress-message {
  color: var(--text-secondary);
}

.progress-percent {
  color: var(--accent-color);
  font-weight: 500;
}

.progress-bar {
  height: 6px;
  background-color: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent-color);
  border-radius: 3px;
  transition: width 0.3s ease, opacity 0.3s ease;
}

/* Error Message */
.error-message {
  margin-top: 1.5rem;
  padding: 0.75rem 1rem;
  background-color: rgba(var(--error-color-rgb), 0.1);
  border-left: 3px solid var(--error-color);
  color: var(--error-color);
  text-align: left;
  border-radius: 4px;
  font-size: 0.9em;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .processing-content {
    width: 85%;
    padding: 1.5rem;
  }
  
  .spinner {
    width: 50px;
    height: 50px;
  }
  
  .processing-content h3 {
    font-size: 1.2rem;
  }
  
  .processing-content p {
    font-size: 0.9rem;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .processing-overlay {
    background-color: rgba(10, 10, 12, 0.95);
  }
  
  .processing-content {
    background: var(--card-bg);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
}
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
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--card-bg);
  border-radius: 8px;
  overflow: auto; /* Allow scrolling if needed */
  position: relative;
  min-height: 300px;
  max-height: 80vh; /* Limit height on larger screens */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-preview {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--card-bg);
  padding: 1rem;
}

.image-preview img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
  border-radius: 4px;
  /* Support for dark mode */
  filter: var(--img-filter, none);
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
    min-height: 250px;
  }
  
  .image-preview {
    padding: 0.5rem;
  }
  
  .image-preview img {
    max-width: 100%;
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
/* Theme variables */
:root {
  --uploader-error: #dc3545;
  --img-filter: none;
  --preview-shadow: rgba(0, 0, 0, 0.1);
}

:root.dark {
  --uploader-error: #ff6b6b;
  --img-filter: brightness(0.95);
  --preview-shadow: rgba(0, 0, 0, 0.3);
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --uploader-error: #ff6b6b;
    --img-filter: brightness(0.95);
    --preview-shadow: rgba(0, 0, 0, 0.3);
  }
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
