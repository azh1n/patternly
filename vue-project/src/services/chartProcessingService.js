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
      
      // Limits for a single OpenCV processing pass
      const MAX_DIMENSION = 3000;
      const MAX_PIXELS = 8000000;
      const TILE_OVERLAP = 80; // pixels of overlap between tiles to avoid splitting grid lines

      const totalPixels = width * height;
      const maxDimension = Math.max(width, height);
      const needsTiling = totalPixels > MAX_PIXELS || maxDimension > MAX_DIMENSION;

      if (needsTiling) {
        // ── TILED PROCESSING ──
        // Split the image into tiles that each fit within the OpenCV limits,
        // process each tile independently, then merge the grid results.
        const tilesX = Math.ceil(width / MAX_DIMENSION);
        const tilesY = Math.ceil(height / MAX_DIMENSION);
        const tileW = Math.ceil(width / tilesX);
        const tileH = Math.ceil(height / tilesY);
        const totalTiles = tilesX * tilesY;

        console.log(`[ChartProcessing] Large image (${width}x${height}=${totalPixels}px), tiling into ${tilesX}x${tilesY} = ${totalTiles} tiles (each ~${tileW}x${tileH})`);

        // Merged result across all tiles
        gridResult = {
          horizontalLines: [],
          verticalLines: [],
          cells: [],
          gridFound: false,
          gridArea: null,
          medianCellWidth: 0,
          medianCellHeight: 0
        };

        let tilesProcessed = 0;

        for (let ty = 0; ty < tilesY; ty++) {
          for (let tx = 0; tx < tilesX; tx++) {
            const tileIndex = ty * tilesX + tx + 1;
            progressMessage.value = `Processing tile ${tileIndex}/${totalTiles}...`;
            progress.value = 20 + Math.floor((tilesProcessed / totalTiles) * 50);

            // Compute tile bounds with overlap
            const sx = Math.max(0, tx * tileW - TILE_OVERLAP);
            const sy = Math.max(0, ty * tileH - TILE_OVERLAP);
            const ex = Math.min(width, (tx + 1) * tileW + TILE_OVERLAP);
            const ey = Math.min(height, (ty + 1) * tileH + TILE_OVERLAP);
            const tw = ex - sx;
            const th = ey - sy;

            console.log(`[ChartProcessing] Tile ${tileIndex}: (${sx},${sy}) ${tw}x${th}`);

            // Draw tile to a temporary canvas
            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = tw;
            tileCanvas.height = th;
            const tileCtx = tileCanvas.getContext('2d', { willReadFrequently: true });
            tileCtx.drawImage(imageElement, sx, sy, tw, th, 0, 0, tw, th);

            // Process this tile through OpenCV
            let tileSrc = null;
            let tileGray = null;
            try {
              tileSrc = cv.imread(tileCanvas);
              tileGray = new cv.Mat();
              cv.cvtColor(tileSrc, tileGray, cv.COLOR_RGBA2GRAY);

              const tileResult = await detectGrid(cv, tileGray.clone(), { assumeFullGrid: true });

              if (tileResult && tileResult.gridFound) {
                gridResult.gridFound = true;

                // Offset all line positions by the tile origin
                for (const line of tileResult.horizontalLines) {
                  gridResult.horizontalLines.push({
                    ...line,
                    x1: line.x1 + sx,
                    x2: line.x2 + sx,
                    y1: line.y1 + sy,
                    y2: line.y2 + sy
                  });
                }
                for (const line of tileResult.verticalLines) {
                  gridResult.verticalLines.push({
                    ...line,
                    x1: line.x1 + sx,
                    x2: line.x2 + sx,
                    y1: line.y1 + sy,
                    y2: line.y2 + sy
                  });
                }

                // Track median cell size (average across tiles)
                if (tileResult.medianCellWidth > 0) {
                  gridResult.medianCellWidth = gridResult.medianCellWidth > 0
                    ? (gridResult.medianCellWidth + tileResult.medianCellWidth) / 2
                    : tileResult.medianCellWidth;
                }
                if (tileResult.medianCellHeight > 0) {
                  gridResult.medianCellHeight = gridResult.medianCellHeight > 0
                    ? (gridResult.medianCellHeight + tileResult.medianCellHeight) / 2
                    : tileResult.medianCellHeight;
                }

                // Expand gridArea to encompass all tiles
                if (tileResult.gridArea) {
                  const ta = tileResult.gridArea;
                  const offsetArea = {
                    x: ta.x + sx,
                    y: ta.y + sy,
                    width: ta.width,
                    height: ta.height
                  };
                  if (!gridResult.gridArea) {
                    gridResult.gridArea = offsetArea;
                  } else {
                    const ga = gridResult.gridArea;
                    const newX = Math.min(ga.x, offsetArea.x);
                    const newY = Math.min(ga.y, offsetArea.y);
                    gridResult.gridArea = {
                      x: newX,
                      y: newY,
                      width: Math.max(ga.x + ga.width, offsetArea.x + offsetArea.width) - newX,
                      height: Math.max(ga.y + ga.height, offsetArea.y + offsetArea.height) - newY
                    };
                  }
                }
              }

              console.log(`[ChartProcessing] Tile ${tileIndex} done: ${tileResult.gridFound ? 'grid found' : 'no grid'}, ${tileResult.verticalLines?.filter(l => !l.isGridBorder).length || 0} vert, ${tileResult.horizontalLines?.filter(l => !l.isGridBorder).length || 0} horiz`);
            } catch (tileError) {
              console.warn(`[ChartProcessing] Tile ${tileIndex} failed:`, tileError);
            } finally {
              if (tileGray) tileGray.delete();
              if (tileSrc) tileSrc.delete();
              tileCanvas.remove();
            }

            tilesProcessed++;
          }
        }

        // Deduplicate lines in overlap zones
        if (gridResult.gridFound) {
          const dedupeDistance = Math.max(5, (gridResult.medianCellWidth || 10) * 0.3);

          // Deduplicate vertical lines by x-position
          const vLines = gridResult.verticalLines
            .filter(l => !l.isGridBorder)
            .map(l => ({ position: l.x1, confidence: l.confidence || 0.5, original: l }));
          const vSorted = [...vLines].sort((a, b) => a.position - b.position);
          const vDeduped = [];
          for (const line of vSorted) {
            const last = vDeduped.length > 0 ? vDeduped[vDeduped.length - 1] : null;
            if (last && line.position - last.position < dedupeDistance) {
              if (line.confidence > last.confidence) {
                vDeduped[vDeduped.length - 1] = line;
              }
            } else {
              vDeduped.push(line);
            }
          }

          // Deduplicate horizontal lines by y-position
          const hLines = gridResult.horizontalLines
            .filter(l => !l.isGridBorder)
            .map(l => ({ position: l.y1, confidence: l.confidence || 0.5, original: l }));
          const hSorted = [...hLines].sort((a, b) => a.position - b.position);
          const hDeduped = [];
          for (const line of hSorted) {
            const last = hDeduped.length > 0 ? hDeduped[hDeduped.length - 1] : null;
            if (last && line.position - last.position < dedupeDistance) {
              if (line.confidence > last.confidence) {
                hDeduped[hDeduped.length - 1] = line;
              }
            } else {
              hDeduped.push(line);
            }
          }

          // Keep border lines + deduped internal lines
          const borderV = gridResult.verticalLines.filter(l => l.isGridBorder);
          const borderH = gridResult.horizontalLines.filter(l => l.isGridBorder);
          gridResult.verticalLines = [...borderV, ...vDeduped.map(d => d.original)];
          gridResult.horizontalLines = [...borderH, ...hDeduped.map(d => d.original)];

          const finalV = gridResult.verticalLines.filter(l => !l.isGridBorder).length;
          const finalH = gridResult.horizontalLines.filter(l => !l.isGridBorder).length;
          console.log(`[ChartProcessing] After tile merge + dedup: ${finalV} vertical, ${finalH} horizontal lines`);
        }

        // Draw results on a full-size canvas
        progressMessage.value = 'Preparing final image...';
        progress.value = 75;

        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imageElement, 0, 0, width, height);

        // Clean image on canvas (no lines drawn) — editor overlay handles visualization
        progress.value = 80;

      } else {
        // ── SINGLE-PASS PROCESSING (image fits within limits) ──
        let canvasWidth = width;
        let canvasHeight = height;
        console.log(`[ChartProcessing] Image size acceptable for direct processing: ${width}x${height}`);

        canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Could not get 2D context from canvas');
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        progressMessage.value = 'Drawing image to canvas...';
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
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
          console.log('[ChartProcessing] Reading image into OpenCV...');
          src = cv.imread(canvas);

          if (!src || src.empty()) {
            throw new Error('Failed to load image into OpenCV');
          }

          console.log(`[ChartProcessing] Image loaded: ${src.cols}x${src.rows} channels=${src.channels()}`);

          progressMessage.value = 'Converting to grayscale...';
          progress.value = 30;

          gray = new cv.Mat();
          console.log('[ChartProcessing] Converting to grayscale...');
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

          console.log(`[ChartProcessing] Grayscale conversion complete: ${gray.cols}x${gray.rows}`);

          // Detect grid in the image
          progressMessage.value = 'Detecting grid structure...';
          progress.value = 40;

          try {
            console.log('[ChartProcessing] Starting grid detection...');
            gridResult = await detectGrid(cv, gray.clone());
            console.log('[ChartProcessing] Grid detection completed:', gridResult);
          } catch (gridError) {
            console.warn('[ChartProcessing] Grid detection failed:', gridError);
            gridResult = null;
          }

          progressMessage.value = 'Preparing final image...';
          progress.value = 50;

          console.log('[ChartProcessing] Creating destination image...');
          dst = new cv.Mat();
          src.copyTo(dst);

          console.log(`[ChartProcessing] Destination image created: ${dst.cols}x${dst.rows}`);

          // Clean image stays on canvas (no lines drawn) — editor overlay handles visualization

          progressMessage.value = 'Finalizing image...';
          progress.value = 80;

          try {
            console.log('[ChartProcessing] Cleaning up intermediate resources...');
            if (gray && !gray.isDeleted) { gray.delete(); gray = null; }
            if (dst && !dst.isDeleted) { dst.delete(); dst = null; }
          } catch (cleanupError) {
            console.warn('[ChartProcessing] Error cleaning up resources:', cleanupError);
          }
        } catch (e) {
          console.error('[ChartProcessing] Error processing chart:', e);
          try {
            if (gray && typeof gray.delete === 'function' && !gray.isDeleted) { gray.delete(); gray = null; }
            if (dst && typeof dst.delete === 'function' && !dst.isDeleted) { dst.delete(); dst = null; }
          } catch (cleanupError) {
            console.warn('[ChartProcessing] Error during cleanup in catch block:', cleanupError);
          }
          throw new Error(`Failed to process image: ${e.message || e}`);
        }
      }
      
      // Convert to blob
  
      progressMessage.value = 'Creating result image...';
      console.log('[ChartProcessing] About to call canvas.toBlob(). Canvas:', canvas?.width, 'x', canvas?.height, 'context:', !!canvas?.getContext('2d'));
      const blob = await new Promise((resolve, reject) => {
        try {
          canvas.toBlob(blob => {
            console.log('[ChartProcessing] toBlob callback fired, blob:', !!blob, blob?.size);
            if (!blob) return reject(new Error('Failed to create blob'));
            resolve(blob);
          }, 'image/png', 0.9);
          console.log('[ChartProcessing] toBlob() called (async, waiting for callback)');
        } catch (toBlobError) {
          console.error('[ChartProcessing] toBlob() threw:', toBlobError);
          reject(toBlobError);
        }
      });
      
      progress.value = 100;
      progressMessage.value = 'Complete';
      console.log('[ChartProcessing] About to return result. gridResult:', !!gridResult, 'gridFound:', gridResult?.gridFound, 'blob size:', blob?.size);

      // Return clean image + grid detection result (cell extraction deferred to confirmGridLines)
      isProcessing.value = false;
      return {
        success: true,
        blob: blob,
        gridResult: gridResult || null,
        imageWidth: width,
        imageHeight: height
      };

    } catch (err) {
      console.error('[ChartProcessing] CATCH block error:', err, err?.stack);
      error.value = err.message;
      return {
        success: false,
        error: err.message,
        blob: null,
        gridResult: null,
        imageWidth: 0,
        imageHeight: 0
      };
    } finally {
      console.log('[ChartProcessing] FINALLY block running');
      cleanup();
      console.log('[ChartProcessing] FINALLY cleanup done');
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
  
  // Stage 2: Confirm grid lines and extract cells
  // Called after the user has reviewed/edited lines in the GridLineEditor
  const confirmGridLines = async (imageElement, editedGridResult) => {
    isProcessing.value = true;
    progress.value = 0;
    error.value = null;
    progressMessage.value = 'Preparing to extract cells...';

    let canvas = null;
    let src = null;
    let dst = null;

    try {
      // Ensure OpenCV is loaded (should be cached from processChart)
      if (!window.cv || !window.cv.Mat) {
        progressMessage.value = 'Loading OpenCV...';
        await loadOpenCVScript();
        await waitForOpenCVInitialization();
      }

      if (!window.cv || !window.cv.Mat) {
        throw new Error('Failed to load OpenCV');
      }

      const cv = window.cv;
      const width = imageElement.naturalWidth || imageElement.width;
      const height = imageElement.naturalHeight || imageElement.height;

      progress.value = 20;
      progressMessage.value = 'Reading image...';

      // Read clean image into OpenCV
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(imageElement, 0, 0, width, height);

      src = cv.imread(canvas);
      if (!src || src.empty()) {
        throw new Error('Failed to load image into OpenCV');
      }

      progress.value = 40;
      progressMessage.value = 'Drawing grid lines...';

      // Draw lines on a copy for the visual result
      dst = new cv.Mat();
      src.copyTo(dst);

      if (editedGridResult.horizontalLines?.length > 0 &&
          editedGridResult.verticalLines?.length > 0) {
        drawGridLines(cv, dst, editedGridResult.horizontalLines, editedGridResult.verticalLines, editedGridResult.gridArea, 1);
      }

      cv.imshow(canvas, dst);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/png', 0.9);
      });

      progress.value = 60;
      progressMessage.value = 'Extracting grid cells...';

      // Extract cells from the CLEAN source image (not the one with lines drawn)
      let gridCells = [];
      let cellImages = [];
      let gridDimensions = null;

      try {
        const extractResult = extractGridCells(cv, src, editedGridResult);
        if (extractResult && extractResult.cells) {
          gridCells = extractResult.cells;
          cellImages = extractResult.cells;
          gridDimensions = extractResult.gridDimensions;
          console.log(`[ChartProcessing] Extracted ${gridCells.length} cells`);
        }
      } catch (extractError) {
        console.warn('[ChartProcessing] Error extracting grid cells:', extractError);
      }

      progress.value = 100;
      progressMessage.value = 'Complete';
      isProcessing.value = false;

      return {
        success: true,
        blob,
        gridCells,
        cellImages,
        gridDimensions
      };
    } catch (err) {
      console.error('[ChartProcessing] confirmGridLines error:', err);
      error.value = err.message;
      isProcessing.value = false;
      return {
        success: false,
        error: err.message,
        blob: null,
        gridCells: [],
        cellImages: []
      };
    } finally {
      if (src && typeof src.delete === 'function') src.delete();
      if (dst && typeof dst.delete === 'function') dst.delete();
      if (canvas && canvas.remove) canvas.remove();
    }
  };

  return {
    progress,
    progressMessage,
    error,
    isProcessing,
    processChart,
    confirmGridLines
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
