import { ref } from 'vue';
import { useGridProcessing } from './gridProcessingService';

// Global variable to track if OpenCV is loading
let isLoadingOpenCV = false;
let openCVLoadedCallback = null;

// Simple function to load OpenCV script
export function useChartProcessing() {
  const progress = ref(0);
  const progressMessage = ref('Loading...');
  const error = ref(null);
  const isProcessing = ref(false);
  
  // Initialize grid processing service
  const { 
    detectGrid, 
    drawGridLines, 
    extractGridCells,
    cleanup: cleanupGridResources
  } = useGridProcessing();
  
  // Process knitting chart image
  const processChart = async (imageElement) => {
    // Process the chart
    
    // Reset state
    isProcessing.value = true;
    progress.value = 0;
    error.value = null;
    progressMessage.value = 'Initializing...';
    
    // Add global error handler for better debugging
    const handleError = (err, phase) => {
      console.error(`[ChartProcessing] Error during ${phase}:`, err);
      error.value = `Error during ${phase}: ${err.message}`;
      isProcessing.value = false;
      throw err;
    };
    
    let canvas = null;
    let src = null;
    let gridResult = null;
    let gray = null;
    let dst = null;
    
    // Helper function to clean up resources
    const cleanup = () => {
      try {
        // Clean up OpenCV resources
        if (src && typeof src.delete === 'function') src.delete();
        if (gray && typeof gray.delete === 'function') gray.delete();
        if (dst && typeof dst.delete === 'function') dst.delete();
        if (canvas && canvas.remove) canvas.remove();
        
        // Clean up grid resources if they exist
        if (gridResult) {
          // Use the grid processing service's cleanup function
          cleanupGridResources({
            horizontalLines: gridResult.horizontalLines,
            verticalLines: gridResult.verticalLines,
            cells: gridResult.cells
          });
        }
      } catch (e) {
        console.error('[ChartProcessing] Error during cleanup:', e);
      }
    };
    
    try {
      // Validate input
      if (!imageElement || imageElement.tagName !== 'IMG') {
        throw new Error('Invalid image element provided');
      }
      
      // Validate image is loaded
      
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
        // Load OpenCV if needed
        await loadOpenCVScript();
      }
      
      // Make sure OpenCV is fully initialized
      if (!window.cv || !window.cv.Mat) {
        // Wait for OpenCV initialization
        await waitForOpenCVInitialization();
      }
      
      // Verify OpenCV loaded correctly
      if (!window.cv || !window.cv.Mat) {
        throw new Error('Failed to load OpenCV properly');
      }
      
      const cv = window.cv;
      // OpenCV loaded
      
      progress.value = 20;
      progressMessage.value = 'Preparing image...';
      
      // Use the exact dimensions of the original image
      const width = imageElement.naturalWidth || imageElement.width;
      const height = imageElement.naturalHeight || imageElement.height;
      
      // Get original dimensions
      
      if (!width || !height || width <= 0 || height <= 0) {
        throw new Error(`Invalid image dimensions: ${width}x${height}`);
      }
      
      // Set reasonable limits for OpenCV processing to prevent memory issues
      const MAX_DIMENSION = 2000; // Maximum width or height for OpenCV processing
      const MAX_PIXELS = 4000000; // Maximum total pixels (roughly 2000x2000)
      
      let canvasWidth = width;
      let canvasHeight = height;
      let needsResize = false;
      
      // Check if image is too large for OpenCV processing
      const totalPixels = width * height;
      const maxDimension = Math.max(width, height);
      
      if (totalPixels > MAX_PIXELS || maxDimension > MAX_DIMENSION) {
        needsResize = true;
        
        // Calculate resize ratio to fit within limits
        const dimensionRatio = MAX_DIMENSION / maxDimension;
        const pixelRatio = Math.sqrt(MAX_PIXELS / totalPixels);
        const resizeRatio = Math.min(dimensionRatio, pixelRatio, 1.0); // Never upscale
        
        canvasWidth = Math.floor(width * resizeRatio);
        canvasHeight = Math.floor(height * resizeRatio);
        
        console.log(`[ChartProcessing] Large image detected (${width}x${height}=${totalPixels} pixels)`);
        console.log(`[ChartProcessing] Resizing for OpenCV processing: ${canvasWidth}x${canvasHeight} (ratio: ${resizeRatio.toFixed(3)})`);
      } else {
        console.log(`[ChartProcessing] Image size acceptable for direct processing: ${width}x${height}`);
      }
      
      // Validate canvas dimensions
      if (canvasWidth <= 0 || canvasHeight <= 0) {
        throw new Error(`Invalid canvas dimensions: ${canvasWidth}x${canvasHeight}`);
      }
      
      // Create canvas for processing
      canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Could not get 2D context from canvas');
      }
      
      // Set canvas size
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Draw image to canvas - ensure we use the full canvas
      progressMessage.value = 'Drawing image to canvas...';
      
      // Clear canvas first
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw with calculated dimensions (may be resized)
      ctx.drawImage(imageElement, 0, 0, canvasWidth, canvasHeight);
      progress.value = 30;
      
      // Validate canvas has data
      try {
        const imageData = ctx.getImageData(0, 0, Math.min(canvasWidth, 10), Math.min(canvasHeight, 10));
        if (!imageData || !imageData.data || imageData.data.length === 0) {
          throw new Error('Canvas contains no image data');
        }
        console.log('[ChartProcessing] Canvas validation passed');
      } catch (validationError) {
        throw new Error(`Canvas validation failed: ${validationError.message}`);
      }
      
      // Convert to OpenCV format
      try {
        // Use cv.imread directly - simpler and more reliable
        console.log('[ChartProcessing] Reading image into OpenCV...');
        src = cv.imread(canvas);
        
        if (!src || src.empty()) {
          throw new Error('Failed to load image into OpenCV');
        }
        
        console.log(`[ChartProcessing] Image loaded: ${src.cols}x${src.rows} channels=${src.channels()}`);
        
        // Create a grayscale copy for processing
        progressMessage.value = 'Converting to grayscale...';
        progress.value = 30;
        
        // Create a grayscale copy
        gray = new cv.Mat();
        console.log('[ChartProcessing] Converting to grayscale...');
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        
        console.log(`[ChartProcessing] Grayscale conversion complete: ${gray.cols}x${gray.rows}`);
        
        // Detect grid in the image
        progressMessage.value = 'Detecting grid structure...';
        progress.value = 40;
        
        // Use the grid processing service to detect grid
        try {
          console.log('[ChartProcessing] Starting grid detection...');
          gridResult = await detectGrid(cv, gray.clone()); // Clone gray to avoid issues with the original being deleted
          console.log('[ChartProcessing] Grid detection completed:', gridResult);
        } catch (gridError) {
          console.warn('[ChartProcessing] Grid detection failed:', gridError);
          // Continue without grid detection
          gridResult = null;
        }
        
        // Use the original image for the final output
        progressMessage.value = 'Preparing final image...';
        progress.value = 50;
        
        // Create a copy of the source image for drawing
        console.log('[ChartProcessing] Creating destination image...');
        dst = new cv.Mat();
        src.copyTo(dst);
        
        console.log(`[ChartProcessing] Destination image created: ${dst.cols}x${dst.rows}`);
        
        // Draw grid lines if we have any
        if (gridResult && 
            gridResult.horizontalLines && gridResult.horizontalLines.length > 0 && 
            gridResult.verticalLines && gridResult.verticalLines.length > 0 && 
            gridResult.gridArea) {
          try {
            console.log('[ChartProcessing] Drawing grid lines...');
            // Draw grid lines with thinner lines (1px)
            drawGridLines(cv, dst, gridResult.horizontalLines, gridResult.verticalLines, gridResult.gridArea, 1);
            console.log('[ChartProcessing] Grid lines drawn successfully');
          } catch (drawError) {
            console.warn('[ChartProcessing] Error drawing grid lines:', drawError);
            // Continue without grid visualization
          }
        } else {
          console.log('[ChartProcessing] No grid found or insufficient grid data, skipping grid drawing');
        }
        
        // Convert back to canvas
        progressMessage.value = 'Finalizing image...';
        console.log('[ChartProcessing] Converting back to canvas...');
        cv.imshow(canvas, dst);
        console.log('[ChartProcessing] Canvas conversion complete');
        progress.value = 80;
        
        // Clean up OpenCV resources
        try {
          console.log('[ChartProcessing] Cleaning up intermediate resources...');
          if (gray && !gray.isDeleted) {
            gray.delete();
            gray = null;
          }
          if (dst && !dst.isDeleted) {
            dst.delete();
            dst = null;
          }
        } catch (cleanupError) {
          console.warn('[ChartProcessing] Error cleaning up resources:', cleanupError);
        }
      } catch (e) {
        // Handle OpenCV processing errors
        console.error('[ChartProcessing] Error processing chart:', e);
        console.error('[ChartProcessing] Error type:', typeof e);
        console.error('[ChartProcessing] Error details:', e.stack || e.message || e);
        
        // Try to clean up any resources that might have been created
        try {
          if (gray && typeof gray.delete === 'function' && !gray.isDeleted) {
            gray.delete();
            gray = null;
          }
          if (dst && typeof dst.delete === 'function' && !dst.isDeleted) {
            dst.delete();
            dst = null;
          }
        } catch (cleanupError) {
          console.warn('[ChartProcessing] Error during cleanup in catch block:', cleanupError);
        }
        
        throw new Error(`Failed to process image: ${e.message || e}`);
      }
      
      // Convert to blob
  
      progressMessage.value = 'Creating result image...';
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('Failed to create blob'));
          resolve(blob);
        }, 'image/png', 0.9);
      });
      
      progress.value = 100;
      progressMessage.value = 'Complete';
  
      // Processing complete
      progress.value = 95;
      
      // Extract grid cells if grid was detected
      let gridCells = [];
      let cellImages = [];
      
      if (gridResult && gridResult.cells && gridResult.cells.length > 0) {
        progressMessage.value = 'Extracting grid cells...';
        gridCells = gridResult.cells;
        
        try {
          // Extract each cell as a separate image
          cellImages = extractGridCells(cv, src, gridResult.cells);
        } catch (extractError) {
          console.warn('[ChartProcessing] Error extracting grid cells:', extractError);
          // Continue without cell extraction
          cellImages = [];
        }
      }
      
      // Return the processed image with the expected structure
      isProcessing.value = false;
      return {
        success: true,
        blob: blob,
        gridCells: gridCells,
        cellImages: cellImages
      };
      
    } catch (err) {
      console.error('[ChartProcessing] Error:', err);
      error.value = err.message;
      return {
        success: false,
        error: err.message,
        blob: null,
        gridCells: [],
        cellImages: []
      };
    } finally {
      cleanup();
      isProcessing.value = false;
    }
  };
  
  // This function has been moved to gridProcessingService.js
  
  // Find the chart region in the image (excluding text areas)
  const findChartRegion = (cv, grayImage) => {
    try {
      // For knitting charts, we need to detect content areas first
      const binary = new cv.Mat();
      
      // Use binary thresholding to separate content from background
      cv.threshold(grayImage, binary, 180, 255, cv.THRESH_BINARY_INV);
      
      // Apply morphological operations to enhance content
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      const morphed = new cv.Mat();
      cv.morphologyEx(binary, morphed, cv.MORPH_CLOSE, kernel);
      kernel.delete();
      binary.delete();
      
      // Find contours in the image
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      morphed.delete();
      
      // If no contours found, return null
      if (contours.size() === 0) {
        hierarchy.delete();
        contours.delete();
        return null;
      }
      
      // Find the largest contour by area
      let maxArea = 0;
      let maxContourIndex = -1;
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        
        if (area > maxArea) {
          maxArea = area;
          maxContourIndex = i;
        }
      }
      
      // If the largest contour is too small, return null
      if (maxArea < 1000 || maxContourIndex === -1) {
        hierarchy.delete();
        contours.delete();
        return null;
      }
      
      // Get the bounding rectangle for the largest contour
      const maxContour = contours.get(maxContourIndex);
      const rect = cv.boundingRect(maxContour);
      
      // Clean up
      hierarchy.delete();
      contours.delete();
      
      // Create a region of interest (ROI) from the original image
      const roi = grayImage.roi(rect);
      
      // Add region coordinates to the ROI for later reference
      roi.regionX = rect.x;
      roi.regionY = rect.y;
      
      return roi;
    } catch (e) {
      console.error('Error finding chart region:', e);
      return null;
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
    
    // Safety timeout - only used if initialization gets stuck
    const timeoutId = setTimeout(() => {
      console.log('[ChartProcessing] OpenCV initialization timed out, resolving anyway');
      resolve();
    }, 10000);
    
    // Make sure we clear the timeout when we resolve normally
    const originalResolve = resolve;
    resolve = (...args) => {
      clearTimeout(timeoutId);
      originalResolve(...args);
    };
  });
}
