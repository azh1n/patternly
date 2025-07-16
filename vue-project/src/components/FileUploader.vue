<template>
  <div class="file-uploader-container" :class="{ 
    'processing-active': isProcessing || (previewUrl && isChartProcessed),
    'fullscreen-mode': isFullScreen
  }" ref="previewContainer">
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

    <!-- File Uploader (only shown when no file is loaded) -->
    <div v-if="!isProcessing && !previewUrl" class="file-uploader">
      <!-- No Preview State -->
      <div class="no-preview">
        <font-awesome-icon :icon="['fas', 'file']" size="3x" />
        <span>No file selected</span>
      </div>
    </div>
    
    <!-- Preview Containers (shown when a file is loaded and not processing) -->
    <div v-if="previewUrl && !isProcessing" class="content-container">
      <!-- Image Preview (for processed charts) -->
      <button v-if="isFullScreen" @click="toggleFullScreen" class="fullscreen-close" aria-label="Exit full screen">
        <font-awesome-icon :icon="['fas', 'times']" />
      </button>
      <div v-if="isChartProcessed" class="chart-container">
        <div class="chart-preview" @wheel.prevent="handleWheel" @mousedown="startPan" @mousemove="handlePan" @mouseup="stopPan" @mouseleave="stopPan" @touchstart="startPan" @touchmove="handlePan" @touchend="stopPan">
          <div class="zoom-container" :style="zoomTransform">
            <img :src="previewUrl" :alt="previewAlt" ref="imageRef" />
          </div>
          <div class="zoom-controls">
            <button @click="zoomIn" aria-label="Zoom in" class="zoom-button" :class="{ 'disabled': zoomState.scale >= zoomState.maxScale }">
              <span class="icon">+</span>
            </button>
            <button @click="zoomOut" aria-label="Zoom out" class="zoom-button" :class="{ 'disabled': zoomState.scale <= zoomState.minScale }">
              <span class="icon">−</span>
            </button>
            <button @click="resetZoom" aria-label="Reset zoom" class="zoom-button" :class="{ 'disabled': zoomState.scale === 1 && !isFullScreen }">
              <span class="icon">↔</span>
            </button>
            <button @click="toggleFullScreen" aria-label="Toggle full screen" class="zoom-button fullscreen-button" :class="{ 'active': isFullScreen }">
              <span class="icon">{{ isFullScreen ? '⤵' : '⤢' }}</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Regular Image Preview -->
      <button v-else-if="isFullScreen" @click="toggleFullScreen" class="fullscreen-close" aria-label="Exit full screen">
        <font-awesome-icon :icon="['fas', 'times']" />
      </button>
      <div v-else-if="isImage && !isChartProcessed" class="preview-container">
        <div class="image-preview" @wheel.prevent="handleWheel" @mousedown="startPan" @mousemove="handlePan" @mouseup="stopPan" @mouseleave="stopPan" @touchstart="startPan" @touchmove="handlePan" @touchend="stopPan">
          <div class="zoom-container" :style="zoomTransform">
            <img :src="previewUrl" :alt="previewAlt" ref="imageRef" />
          </div>
          <div class="zoom-controls">
            <button @click="zoomIn" aria-label="Zoom in" class="zoom-button" :class="{ 'disabled': zoomState.scale >= zoomState.maxScale }">
              <span class="icon">+</span>
            </button>
            <button @click="zoomOut" aria-label="Zoom out" class="zoom-button" :class="{ 'disabled': zoomState.scale <= zoomState.minScale }">
              <span class="icon">−</span>
            </button>
            <button @click="resetZoom" aria-label="Reset zoom" class="zoom-button" :class="{ 'disabled': zoomState.scale === 1 && !isFullScreen }">
              <span class="icon">↔</span>
            </button>
            <button @click="toggleFullScreen" aria-label="Toggle full screen" class="zoom-button fullscreen-button" :class="{ 'active': isFullScreen }">
              <span class="icon">{{ isFullScreen ? '⤵' : '⤢' }}</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- PDF Preview -->
      <div v-else-if="isPdf" class="preview-container">
        <div class="document-preview">
          <iframe 
            :src="previewUrl + '#toolbar=0&navpanes=0'" 
            class="pdf-preview" 
            :title="previewAlt"
            frameborder="0"
          ></iframe>
        </div>
      </div>
      
      <!-- Word Document Preview -->
      <div v-else-if="isDocx" class="preview-container">
        <div class="document-preview">
          <div ref="docxPreview" class="docx-preview"></div>
        </div>
      </div>
      
      <!-- Generic File Preview -->
      <div v-else class="preview-container">
        <div class="file-icon">
          <font-awesome-icon :icon="['fas', 'file']" size="3x" />
          <span class="file-name">{{ fileName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch, defineEmits, onMounted, watchEffect, reactive } from 'vue';

// Full screen state
const isFullScreen = ref(false);
const previewContainer = ref(null);

// Zoom and pan state
const zoomState = reactive({
  scale: 1,
  posX: 0,
  posY: 0,
  isPanning: false,
  lastX: 0,
  lastY: 0,
  maxScale: 10,  // Increased from 4 to 10 for more zoom
  minScale: 0.2,  // Reduced from 0.5 to 0.2 for more zoom out
  scaleStep: 0.3,  // Increased step for faster zooming
  originalScale: 1
});

const imageRef = ref(null);

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

const emit = defineEmits(['processing-complete', 'error', 'processing-start']);

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
const isChartProcessed = ref(false); // Track if a chart has been processed
const gridCells = ref([]); // Store detected grid cells
const cellImages = ref([]); // Store extracted cell images
const processingError = ref(null);

// Update state based on processing services
watchEffect(() => {
  if (chartProcessing.value || imageProcessing.value) {
    progress.value = 0;
    isProcessing.value = true;
    progressMessage.value = 'Initializing...';
    emit('processing-start');
    progress.value = chartProcessing.value ? chartProgress.value : imageProgress.value;
    progressMessage.value = chartProcessing.value ? chartProgressMessage.value : imageProgressMessage.value;
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
  }
  previewUrl.value = '';
  processingError.value = null;
  fileName.value = '';
  isChartProcessed.value = false; // Reset chart processed state
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
  
  // Emit processing start event
  emit('processing-start', file);

  try {
    // Process different file types
    if (isImage.value) {
      // For images, process them like charts to enable grid detection
      try {
        progressMessage.value = 'Loading image...';
        
        // Create image element for processing
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Load the image
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Image loading timed out'));
          }, 30000); // 30 second timeout
          
          img.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          img.onerror = (err) => {
            clearTimeout(timeout);
            reject(new Error('Failed to load image for processing'));
          };
          
          try {
            // Create object URL from the file
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
          } catch (urlError) {
            clearTimeout(timeout);
            reject(new Error('Failed to create image URL'));
          }
        });
        
        // Process the image with chart processing (includes grid detection)
        progressMessage.value = 'Processing chart...';
        console.log(`[FileUploader] Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
        
        const result = await processChart(img);
        
        if (!result.success) {
          console.warn('[FileUploader] Chart processing failed, falling back to original image');
          // Fall back to showing original image
          previewUrl.value = URL.createObjectURL(file);
          isChartProcessed.value = false; // Ensure we use regular image display
          processingError.value = `Chart processing failed: ${result.error || 'Unknown error'}. Showing original image.`;
          emit('error', processingError.value);
          return;
        }
        
        if (!result.blob) {
          console.warn('[FileUploader] No processed image blob received, falling back to original');
          // Fall back to showing original image
          previewUrl.value = URL.createObjectURL(file);
          isChartProcessed.value = false; // Ensure we use regular image display
          processingError.value = 'No processed image received. Showing original image.';
          emit('error', processingError.value);
          return;
        }
        
        console.log('[FileUploader] Chart processing completed successfully');
        
        // Store grid detection results if available
        if (result.gridCells && result.gridCells.length > 0) {
          gridCells.value = result.gridCells;
          progressMessage.value = `Detected ${result.gridCells.length} grid cells`;
          console.log(`[FileUploader] Grid cells detected: ${result.gridCells.length}`);
        }
        
        // Store cell images if available
        if (result.cellImages && result.cellImages.length > 0) {
          cellImages.value = result.cellImages;
          console.log(`[FileUploader] Cell images extracted: ${result.cellImages.length}`);
        }
        
        // Create object URL from processed image blob
        const processedUrl = URL.createObjectURL(result.blob);
        previewUrl.value = processedUrl;
        isChartProcessed.value = true; // Mark chart as processed
        
        console.log('[FileUploader] Image processing complete, preview URL created');
        
        emit('processing-complete', {
          blob: result.blob,
          gridCells: gridCells.value,
          cellImages: cellImages.value
        });
        
        // Clean up the temporary image URL
        URL.revokeObjectURL(img.src);
        
      } catch (err) {
        console.error('Error processing image:', err);
        // Fall back to regular image preview
        previewUrl.value = URL.createObjectURL(file);
        isChartProcessed.value = false; // Ensure we use regular image display
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
        // Create object URL for PDF
        pdfUrl = URL.createObjectURL(file);
        
        if (!pdfUrl) {
          throw new Error('Failed to create object URL for PDF');
        }
        
        // Step 2: Load the PDF document
        progressMessage.value = 'Loading PDF document...';
        // Load PDF document
        loadingTask = pdfjsLib.value.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@3.0.279/cmaps/',
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;
        // PDF loaded successfully
        
        if (pdf.numPages === 0) {
          throw new Error('PDF contains no pages');
        }
        
        // Step 3: Get the first page
        progressMessage.value = 'Rendering PDF page...';
        // Get first page
        const page = await pdf.getPage(1);
        
        // Step 4: Set up viewport and canvas
        // Set up viewport and canvas
        
        // Get the original page dimensions
        const origViewport = page.getViewport({ scale: 1.0 });

        
        // Use a higher scale for better quality
        const scale = 2.0;
        const viewport = page.getViewport({ 
          scale: scale,
          rotation: 0
        });
        

        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        // Set canvas size to match the viewport exactly
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        

        
        // Step 5: Render PDF page to canvas
        progressMessage.value = 'Converting PDF to image...';
        // Render PDF page to canvas
        
        // Fill with white background first
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render the PDF page
        try {
          await page.render({
            canvasContext: context,
            viewport: viewport,
            intent: 'print', // Better quality rendering
            background: 'transparent'
          }).promise;
          // PDF rendered successfully
        } catch (renderError) {
          // Error rendering PDF
          throw new Error(`Failed to render PDF: ${renderError.message}`);
        }
        
        // Step 6: Convert canvas to blob for processing
        progressMessage.value = 'Preparing image for processing...';
        // Convert canvas to blob
        
        const blob = await new Promise((resolve, reject) => {
          try {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob from canvas'));
                  return;
                }
                // Blob created successfully
                resolve(blob);
              },
              'image/png',
              0.95 // High quality
            );
          } catch (blobError) {
            // Error creating blob
            reject(new Error('Failed to convert canvas to blob'));
          }
        });
        
        // Step 7: Create an image element for processing
        // Create image element
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Step 8: Wait for the image to load
        progressMessage.value = 'Loading image for processing...';
        // Load image from blob
        
        // Debug: Save canvas data directly to see what we're working with
        // Prepare image from canvas
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Image loading timed out'));
          }, 30000); // 30 second timeout
          
          img.onload = () => {
            clearTimeout(timeout);
            // Image loaded
            URL.revokeObjectURL(img.src); // Clean up
            resolve();
          };
          
          img.onerror = (err) => {
            clearTimeout(timeout);
            // Error loading image
            reject(new Error('Failed to load image for processing'));
          };
          
          try {
            // Create a new object URL from the blob
            const objectUrl = URL.createObjectURL(blob);
            // Created object URL
            img.src = objectUrl;
          } catch (urlError) {
            clearTimeout(timeout);
            // Error creating object URL
            reject(new Error('Failed to create image URL'));
          }
        });
        
        // Image loaded successfully
        
        // Process the image element
        progressMessage.value = 'Processing chart...';
        // Start chart processing
        
        const result = await processChart(img);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to process image');
        }
        
        if (!result.blob) {
          throw new Error('No processed image data received');
        }
        
        // Store grid detection results if available
        if (result.gridCells && result.gridCells.length > 0) {
          gridCells.value = result.gridCells;
          progressMessage.value = `Detected ${result.gridCells.length} grid cells`;
        }
        
        // Store cell images if available
        if (result.cellImages && result.cellImages.length > 0) {
          cellImages.value = result.cellImages;
        }
        
        // Create object URL from processed image blob
        const processedUrl = URL.createObjectURL(result.blob);
        // Created URL for processed image
        previewUrl.value = processedUrl;
        isChartProcessed.value = true; // Mark chart as processed
        emit('processing-complete', {
          blob: result.blob,
          gridCells: gridCells.value,
          cellImages: cellImages.value
        });
        
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
    
    // If there was an error and no chart was processed, reset the flag
    if (processingError.value && !previewUrl.value) {
      isChartProcessed.value = false;
    }
  }
}

// Zoom and pan functionality
const zoomTransform = computed(() => ({
  transform: `scale(${zoomState.scale}) translate(${zoomState.posX / zoomState.scale}px, ${zoomState.posY / zoomState.scale}px)`,
  transformOrigin: 'center center',
  transition: 'transform 0.1s ease-out',
  willChange: 'transform',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  maxWidth: 'none',  // Allow image to expand beyond container
  maxHeight: 'none', // Allow image to expand beyond container
  minWidth: '100%',  // Ensure minimum size matches container
  minHeight: '100%'  // Ensure minimum size matches container
}));

const zoomIn = () => {
  if (zoomState.scale < zoomState.maxScale) {
    zoomState.scale = Math.min(zoomState.scale + zoomState.scaleStep, zoomState.maxScale);
  }
};

const zoomOut = () => {
  if (zoomState.scale > zoomState.minScale) {
    zoomState.scale = Math.max(zoomState.scale - zoomState.scaleStep, zoomState.minScale);
  }
};

const toggleFullScreen = () => {
  isFullScreen.value = !isFullScreen.value;
  
  if (isFullScreen.value) {
    // Store the current scale when entering full screen
    zoomState.originalScale = zoomState.scale;
    // Reset position for full screen
    zoomState.posX = 0;
    zoomState.posY = 0;
    // Adjust scale for full screen
    zoomState.scale = Math.max(1, zoomState.scale);
    
    // Add a class to the body to prevent scrolling
    document.body.classList.add('modal-fullscreen');
  } else {
    // Restore the original scale when exiting full screen
    zoomState.scale = zoomState.originalScale;
    // Remove the fullscreen class
    document.body.classList.remove('modal-fullscreen');
  }
};

const resetZoom = () => {
  zoomState.scale = 1;
  zoomState.posX = 0;
  zoomState.posY = 0;
  // Only reset originalScale if not in fullscreen
  if (!isFullScreen.value) {
    zoomState.originalScale = 1;
  } else {
    // In fullscreen, keep the original scale for toggling back
    zoomState.originalScale = 1;
  }
};

const handleWheel = (e) => {
  e.preventDefault();
  
  // Get the position of the mouse relative to the image
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calculate the position relative to the image's natural dimensions
  const xPercent = x / rect.width;
  const yPercent = y / rect.height;
  
  // Store the current scale before updating
  const oldScale = zoomState.scale;
  
  // Determine zoom direction and calculate new scale
  const delta = -Math.sign(e.deltaY);
  const scaleFactor = 1 + (delta * zoomState.scaleStep * 0.8); // Increased multiplier for faster zoom
  let newScale = zoomState.scale * scaleFactor;
  
  // Clamp the scale within min/max bounds
  newScale = Math.max(zoomState.minScale, Math.min(newScale, zoomState.maxScale));
  
  // Only update if scale changed
  if (newScale !== oldScale) {
    zoomState.scale = newScale;
    
    // Calculate the focal point (where the cursor is relative to the image)
    const focalX = (x - rect.width / 2) / oldScale;
    const focalY = (y - rect.height / 2) / oldScale;
    
    // Calculate the new position to keep the focal point under the cursor
    zoomState.posX = (x - rect.width / 2) - (focalX * newScale);
    zoomState.posY = (y - rect.height / 2) - (focalY * newScale);
  }
};

const startPan = (e) => {
  if (zoomState.scale <= 1) return;
  
  zoomState.isPanning = true;
  if (e.type === 'mousedown') {
    zoomState.lastX = e.clientX;
    zoomState.lastY = e.clientY;
  } else if (e.type === 'touchstart' && e.touches.length === 1) {
    zoomState.lastX = e.touches[0].clientX;
    zoomState.lastY = e.touches[0].clientY;
  }
  
  // Prevent text selection while panning
  e.preventDefault();
};

const handlePan = (e) => {
  if (!zoomState.isPanning || zoomState.scale <= 1) return;
  
  let clientX, clientY;
  
  if (e.type === 'mousemove') {
    clientX = e.clientX;
    clientY = e.clientY;
  } else if (e.type === 'touchmove' && e.touches.length === 1) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    return;
  }
  
  // Calculate the change in position
  const deltaX = clientX - zoomState.lastX;
  const deltaY = clientY - zoomState.lastY;
  
  // Update the position
  zoomState.posX += deltaX;
  zoomState.posY += deltaY;
  
  // Update the last position
  zoomState.lastX = clientX;
  zoomState.lastY = clientY;
  
  e.preventDefault();
};

const stopPan = () => {
  zoomState.isPanning = false;
};

// Reset zoom and full screen when file changes
watch(() => props.file, () => {
  resetZoom();
  isFullScreen.value = false;
  document.body.classList.remove('modal-fullscreen');
});

// Clean up full screen state when component is unmounted
onBeforeUnmount(() => {
  document.body.classList.remove('modal-fullscreen');
});

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
/* Full screen styles */
:global(.modal-fullscreen) {
  overflow: hidden;
}

.fullscreen-mode {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
  padding: 20px !important;
  z-index: 9999 !important;
  background-color: var(--card-bg) !important;
  border-radius: 0 !important;
  display: flex !important;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.fullscreen-mode .zoom-container,
.fullscreen-mode .image-preview,
.fullscreen-mode .chart-preview {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 0 !important;
  box-shadow: none !important;
  background-color: var(--card-bg) !important;
  z-index: 9998 !important;
  margin: 0 !important;
  padding: 0 !important;
}

.fullscreen-mode .zoom-controls {
  position: fixed;
  bottom: 30px;
  right: 30px;
  transform: scale(1.1);
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 10000;
}

.fullscreen-mode .zoom-button {
  width: 40px;
  height: 40px;
}

.fullscreen-button.active {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

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

/* Container transitions when processing is active */
.file-uploader-container.processing-active {
  max-width: 100%;
  transition: max-width 0.3s ease-in-out;
}

/* Content container for all preview types */
.content-container {
  width: 100%;
  transition: all 0.3s ease;
}

/* Full-width chart container */
.chart-container {
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  touch-action: none;
  cursor: grab;
}

.chart-preview:active {
  cursor: grabbing;
}

.chart-preview img {
  max-width: none;  /* Allow image to expand beyond container */
  max-height: none; /* Allow image to expand beyond container */
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 6px;
  pointer-events: none;
  user-select: none;
  transform-origin: center center;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  border-radius: 8px;
  background-color: var(--card-bg, #2a2a2a);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  touch-action: none;
  cursor: grab;
}

.preview-container:active {
  cursor: grabbing;
}

.image-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.zoom-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.image-preview img {
  max-width: none;  /* Allow image to expand beyond container */
  max-height: none; /* Allow image to expand beyond container */
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 6px;
  pointer-events: none;
  user-select: none;
  transform-origin: center center;
}

.zoom-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  padding: 6px;
  border: 1px solid var(--border-color);
  backdrop-filter: blur(8px);
  background-color: rgba(var(--card-bg-rgb), 0.8);
}

:root.dark .zoom-controls {
  background-color: rgba(40, 40, 40, 0.9);
  border-color: var(--border-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.zoom-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--button-bg, #f0f0f0);
  border: 1px solid var(--button-border, #d0d0d0);
  border-radius: 6px;
  color: var(--button-text, #333);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}

.zoom-button .icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 16px;
  font-weight: bold;
}

:root.dark .zoom-button {
  background: var(--button-bg-dark, #2d3748);
  border-color: var(--button-border-dark, #4a5568);
  color: var(--button-text-dark, #e2e8f0);
}

.zoom-button:not(.disabled):hover {
  background: var(--button-hover-bg, #e0e0e0);
  color: var(--button-hover-text, #000);
  transform: scale(1.05);
  border-color: var(--button-hover-border, #b0b0b0);
}

:root.dark .zoom-button:not(.disabled):hover {
  background: var(--button-hover-bg-dark, #4a5568);
  color: var(--button-hover-text-dark, #fff);
  border-color: var(--button-hover-border-dark, #718096);
}

.zoom-button:not(.disabled):active {
  transform: scale(0.95);
  background: var(--button-active-bg, #d0d0d0);
}

:root.dark .zoom-button:not(.disabled):active {
  background: var(--button-active-bg-dark, #4a5568);
}

.zoom-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  background: var(--button-disabled-bg, #f0f0f0);
  color: var(--button-disabled-text, #a0a0a0);
  border-color: var(--button-disabled-border, #e0e0e0);
}

:root.dark .zoom-button.disabled {
  background: var(--button-disabled-bg-dark, #2d3748);
  color: var(--button-disabled-text-dark, #6b7280);
  border-color: var(--button-disabled-border-dark, #4a5568);
}

.zoom-button:hover:not(.disabled) {
  background: var(--input-bg);
  transform: scale(1.05);
}

.fullscreen-button {
  margin-top: 4px;
  border-top: 1px solid var(--border-color) !important;
  border-radius: 0 0 6px 6px !important;
  position: relative;
  overflow: hidden;
}

.fullscreen-button:not(.disabled):hover {
  background: var(--accent-color, #4f46e5);
  color: white;
  border-color: var(--accent-color, #4f46e5);
}

:root.dark .fullscreen-button:not(.disabled):hover {
  background: var(--accent-color-dark, #6366f1);
  border-color: var(--accent-color-dark, #6366f1);
}

.fullscreen-button.active {
  background: var(--accent-color, #4f46e5);
  color: white;
  border-color: var(--accent-color, #4f46e5);
}

:root.dark .fullscreen-button.active {
  background: var(--accent-color-dark, #6366f1);
  border-color: var(--accent-color-dark, #6366f1);
}

/* Full screen close button for mobile */
.fullscreen-close {
  display: none;
  position: fixed;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  background: var(--button-bg, #ffffff);
  border: 1px solid var(--button-border, #e2e8f0);
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary, #1a202c);
}

:root.dark .fullscreen-close {
  background: var(--button-bg-dark, #2d3748);
  border-color: var(--button-border-dark, #4a5568);
  color: var(--text-primary-dark, #e2e8f0);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.fullscreen-close:hover {
  background: var(--button-hover-bg, #f7fafc);
  transform: scale(1.1);
  border-color: var(--button-hover-border, #cbd5e0);
}

:root.dark .fullscreen-close:hover {
  background: var(--button-hover-bg-dark, #4a5568);
  border-color: var(--button-hover-border-dark, #718096);
}

.fullscreen-close:active {
  transform: scale(0.95);
  background: var(--button-active-bg, #edf2f7);
}

:root.dark .fullscreen-close:active {
  background: var(--button-active-bg-dark, #4a5568);
}

.fullscreen-close svg {
  width: 18px;
  height: 18px;
}

.fullscreen-mode .fullscreen-close {
  display: flex;
}

/* Touch device optimizations */
@media (hover: none) {
  .zoom-controls {
    bottom: 8px;
    right: 8px;
  }
  
  .zoom-button {
    width: 44px;
    height: 44px;
  }
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
  .chart-container {
    min-height: 250px;
  }
  
  .chart-preview {
    padding: 0.5rem;
  }
  
  .chart-preview img {
    max-width: 100%;
  }
  
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
