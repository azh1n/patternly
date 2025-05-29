import { ref } from 'vue';

// Global variable to track if OpenCV is loading
let isLoadingOpenCV = false;
let openCVLoadedCallback = null;

// Simple function to load OpenCV script
export function useChartProcessing() {
  const progress = ref(0);
  const progressMessage = ref('Loading...');
  const error = ref(null);
  const isProcessing = ref(false);
  
  // Process knitting chart image
  const processChart = async (imageElement) => {
    console.log('[ChartProcessing] Starting processChart');
    
    // Reset state
    isProcessing.value = true;
    progress.value = 0;
    error.value = null;
    progressMessage.value = 'Initializing...';
    
    let canvas = null;
    let src = null;
    let dst = null;
    
    // Helper function to clean up resources
    const cleanup = () => {
      try {
        if (src && typeof src.delete === 'function') src.delete();
        if (dst && typeof dst.delete === 'function') dst.delete();
        if (canvas && canvas.remove) canvas.remove();
      } catch (e) {
        console.error('[ChartProcessing] Error during cleanup:', e);
      }
    };
    
    try {
      // Validate input
      if (!imageElement || imageElement.tagName !== 'IMG') {
        throw new Error('Invalid image element provided');
      }
      
      console.log('[ChartProcessing] Processing image:', {
        complete: imageElement.complete,
        width: imageElement.naturalWidth,
        height: imageElement.naturalHeight
      });
      
      // Wait for image to load if needed
      if (!imageElement.complete) {
        progressMessage.value = 'Waiting for image to load...';
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Image loading timed out')), 10000);
          imageElement.onload = () => { clearTimeout(timeout); resolve(); };
          imageElement.onerror = () => { clearTimeout(timeout); reject(new Error('Image failed to load')); };
        });
      }
      
      progress.value = 10;
      progressMessage.value = 'Loading OpenCV...';
      
      // Load OpenCV - simple approach
      if (!window.cv) {
        console.log('[ChartProcessing] Loading OpenCV script...');
        await loadOpenCVScript();
      }
      
      // Make sure OpenCV is fully initialized
      if (!window.cv || !window.cv.Mat) {
        console.log('[ChartProcessing] Waiting for OpenCV to initialize...');
        await waitForOpenCVInitialization();
      }
      
      // Verify OpenCV loaded correctly
      if (!window.cv || !window.cv.Mat) {
        throw new Error('Failed to load OpenCV properly');
      }
      
      const cv = window.cv;
      console.log('[ChartProcessing] OpenCV loaded successfully');
      
      progress.value = 20;
      progressMessage.value = 'Preparing image...';
      
      // Create canvas for processing
      canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Could not get 2D context from canvas');
      }
      
      // Set canvas size to match image
      const width = imageElement.naturalWidth || imageElement.width;
      const height = imageElement.naturalHeight || imageElement.height;
      
      console.log(`[ChartProcessing] Image dimensions: ${width}x${height}`);
      
      if (!width || !height || width <= 0 || height <= 0) {
        throw new Error(`Invalid image dimensions: ${width}x${height}`);
      }
      
      // Limit maximum dimensions to prevent memory issues
      const maxDimension = 3000;
      let scale = 1;
      if (width > maxDimension || height > maxDimension) {
        scale = Math.min(maxDimension / width, maxDimension / height);
        console.log(`[ChartProcessing] Scaling down by ${scale.toFixed(2)}`);
      }
      
      const canvasWidth = Math.floor(width * scale);
      const canvasHeight = Math.floor(height * scale);
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Draw image to canvas
      progressMessage.value = 'Processing image...';
      console.log(`[ChartProcessing] Drawing image to canvas...`);
      ctx.drawImage(imageElement, 0, 0, canvasWidth, canvasHeight);
      progress.value = 30;
      
      // Convert to OpenCV format
      console.log('[ChartProcessing] Converting to OpenCV format...');
      src = cv.imread(canvas);
      
      if (!src || src.empty()) {
        throw new Error('Failed to load image into OpenCV');
      }
      
      console.log(`[ChartProcessing] OpenCV image: ${src.cols}x${src.rows}`);
      progressMessage.value = 'Converting to grayscale...';
      progress.value = 50;
      
      // Process image (convert to grayscale)
      dst = new cv.Mat();
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
      
      // Convert back to canvas
      console.log('[ChartProcessing] Converting back to canvas...');
      progressMessage.value = 'Finalizing image...';
      cv.imshow(canvas, dst);
      progress.value = 80;
      
      // Convert to blob
      console.log('[ChartProcessing] Creating blob...');
      progressMessage.value = 'Creating result image...';
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('Failed to create blob'));
          resolve(blob);
        }, 'image/png', 0.9);
      });
      
      progress.value = 100;
      progressMessage.value = 'Complete';
      console.log('[ChartProcessing] Processing complete');
      return { success: true, blob };
      
    } catch (err) {
      console.error('[ChartProcessing] Error:', err);
      error.value = err.message;
      return {
        success: false,
        error: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      };
    } finally {
      cleanup();
      isProcessing.value = false;
    }
  };
  
  return {
    progress,
    progressMessage,
    error,
    isProcessing,
    processChart
  };
}

// Load OpenCV script
function loadOpenCVScript() {
  return new Promise((resolve, reject) => {
    if (window.cv) {
      resolve();
      return;
    }
    
    if (isLoadingOpenCV) {
      // If already loading, wait for it
      openCVLoadedCallback = resolve;
      return;
    }
    
    isLoadingOpenCV = true;
    console.log('[ChartProcessing] Loading OpenCV script...');
    
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.5.5/opencv.js';
    script.async = true;
    
    script.onload = () => {
      console.log('[ChartProcessing] OpenCV script loaded');
      resolve();
      
      if (openCVLoadedCallback) {
        openCVLoadedCallback();
        openCVLoadedCallback = null;
      }
    };
    
    script.onerror = (err) => {
      console.error('[ChartProcessing] Error loading OpenCV script:', err);
      isLoadingOpenCV = false;
      reject(new Error('Failed to load OpenCV script'));
    };
    
    document.head.appendChild(script);
  });
}

// Wait for OpenCV to be fully initialized
function waitForOpenCVInitialization() {
  return new Promise((resolve) => {
    // If OpenCV is already initialized
    if (window.cv && window.cv.Mat) {
      resolve();
      return;
    }
    
    console.log('[ChartProcessing] Setting up OpenCV initialization listener');
    
    // Set up initialization handler
    if (window.cv) {
      window.cv.onRuntimeInitialized = () => {
        console.log('[ChartProcessing] OpenCV initialized via cv.onRuntimeInitialized');
        resolve();
      };
    } else {
      // Fallback to Module
      window.Module = window.Module || {};
      window.Module.onRuntimeInitialized = () => {
        console.log('[ChartProcessing] OpenCV initialized via Module.onRuntimeInitialized');
        resolve();
      };
    }
    
    // Safety timeout
    setTimeout(() => {
      console.log('[ChartProcessing] OpenCV initialization timed out, resolving anyway');
      resolve();
    }, 5000);
  });
}
