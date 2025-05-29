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
    let dst = null;
    let gridResult = null;
    
    // Helper function to clean up resources
    const cleanup = () => {
      try {
        if (src && typeof src.delete === 'function') src.delete();
        if (dst && typeof dst.delete === 'function') dst.delete();
        if (canvas && canvas.remove) canvas.remove();
        
        // Clean up grid detection resources
        if (gridResult) {
          if (gridResult.edges && typeof gridResult.edges.delete === 'function') gridResult.edges.delete();
          if (gridResult.lines && typeof gridResult.lines.delete === 'function') gridResult.lines.delete();
          if (gridResult.houghLines && typeof gridResult.houghLines.delete === 'function') gridResult.houghLines.delete();
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
      
      // Create canvas for processing
      canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Could not get 2D context from canvas');
      }
      
      // Use the exact dimensions of the original image
      const width = imageElement.naturalWidth || imageElement.width;
      const height = imageElement.naturalHeight || imageElement.height;
      
      // Get original dimensions
      
      if (!width || !height || width <= 0 || height <= 0) {
        throw new Error(`Invalid image dimensions: ${width}x${height}`);
      }
      
      // No scaling - use exact original dimensions
      const canvasWidth = width;
      const canvasHeight = height;
      
  
      
  
      
      // Set canvas size
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Draw image to canvas - ensure we use the full canvas
      progressMessage.value = 'Processing image...';
  
      
      // Clear canvas first
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw with exact dimensions
      ctx.drawImage(imageElement, 0, 0, canvasWidth, canvasHeight);
      progress.value = 30;
      
      // Convert to OpenCV format
  
      
      try {
        // Use cv.imread directly - simpler and more reliable
        src = cv.imread(canvas);
        
        if (!src || src.empty()) {
          throw new Error('Failed to load image into OpenCV');
        }
        
        // First create a grayscale copy for grid detection
        progressMessage.value = 'Detecting grid structure...';
        progress.value = 30;
        
        // Create a grayscale copy for grid detection
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        
        // Detect grid in the image
        gridResult = detectGrid(cv, gray);
        
        // Use the original image for the final output
        progressMessage.value = 'Processing image...';
        progress.value = 50;
        
        // Create a copy of the source image for drawing
        const dst = new cv.Mat();
        src.copyTo(dst);
        
        // Draw grid lines if we have any
        if (gridResult && 
            gridResult.horizontalLines && gridResult.horizontalLines.length > 0 && 
            gridResult.verticalLines && gridResult.verticalLines.length > 0 && 
            gridResult.gridArea) {
          // Draw grid lines with thinner lines (1px)
          drawGridLines(cv, dst, gridResult.horizontalLines, gridResult.verticalLines, gridResult.gridArea, 1);
        }
        
        // Convert back to canvas
        progressMessage.value = 'Finalizing image...';
        cv.imshow(canvas, dst);
        progress.value = 80;
        
        // Clean up OpenCV resources
        gray.delete();
        dst.delete();
      } catch (e) {
        // Handle OpenCV processing errors
        console.error('[ChartProcessing] Error processing chart:', e);
        
        // Try to clean up any resources that might have been created
        if (gray && !gray.isDeleted) gray.delete();
        if (dst && !dst.isDeleted) dst.delete();
        
        throw e;
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
  
      // Extract grid cells if grid was detected
      let cellImages = [];
      if (gridResult && gridResult.gridCells && gridResult.gridCells.length > 0) {
        progressMessage.value = 'Extracting grid cells...';
        progress.value = 90;
        
        // Extract each cell as a separate image
        cellImages = extractGridCells(cv, src, gridResult.gridCells);
      }
      
      return { 
        success: true, 
        blob,
        gridCells: gridResult ? gridResult.gridCells : [],
        cellImages
      };
      
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
  
  // Detect grid in an image
  const detectGrid = (cv, grayImage) => {
    // Step 1: Try to identify the chart area
    const chartRegion = findChartRegion(cv, grayImage);
    
    // If we found a chart region, use it for grid detection
    const workingImage = chartRegion ? chartRegion : grayImage;
    
    // Store the region coordinates
    const regionX = chartRegion && chartRegion.regionX ? chartRegion.regionX : 0;
    const regionY = chartRegion && chartRegion.regionY ? chartRegion.regionY : 0;
    
    // Step 2: Apply adaptive thresholding to better separate grid lines
    const thresholded = new cv.Mat();
    cv.adaptiveThreshold(
      workingImage,
      thresholded,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      11,
      2
    );
    
    // Step 3: Apply morphological operations to enhance grid lines
    const kernelSize = new cv.Size(2, 2);
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, kernelSize);
    const processed = new cv.Mat();
    cv.morphologyEx(thresholded, processed, cv.MORPH_CLOSE, kernel);
    kernel.delete();
    thresholded.delete();
    
    // Step 4: Apply Canny edge detection
    const edges = new cv.Mat();
    cv.Canny(processed, edges, 50, 150, 3, false);
    processed.delete();
    
    // Step 5: Use Hough transform to detect lines
    const lines = new cv.Mat();
    // For larger charts, use more conservative parameters to avoid detecting too many lines
    // Increase the threshold and minimum line length
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 40, 30, 10);
    
    // Step 6: Separate horizontal and vertical lines
    const horizontalLines = [];
    const verticalLines = [];
    
    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.data32S[i * 4];
      const y1 = lines.data32S[i * 4 + 1];
      const x2 = lines.data32S[i * 4 + 2];
      const y2 = lines.data32S[i * 4 + 3];
      
      // Calculate line length and angle
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      const angle = Math.abs(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI);
      
      // For knitting charts, we need a minimum line length
      // For larger charts, use a slightly higher threshold to avoid detecting too many lines
      if (length < 10) continue;
      
      // Use angle tolerance to classify lines
      if (angle < 45 || angle > 135) {
        horizontalLines.push({ x1, y1, x2, y2, length });
      } else if (angle >= 45 && angle <= 135) {
        verticalLines.push({ x1, y1, x2, y2, length });
      }
    }
    
    // Step 7: Find the densest grid area (where most lines intersect)
    const gridArea = findDensestGridArea(horizontalLines, verticalLines, workingImage.cols, workingImage.rows);
    
    // Adjust grid area coordinates to account for the chart region offset
    gridArea.x += regionX;
    gridArea.y += regionY;
    
    // Ensure the grid area is properly sized - expand it if it's too small
    // This helps with zooming in on the actual chart content
    const minGridSize = Math.min(grayImage.cols, grayImage.rows) * 0.5; // At least 50% of the image
    if (gridArea.width < minGridSize || gridArea.height < minGridSize) {
      console.log(`Grid area too small (${gridArea.width}x${gridArea.height}), expanding...`);
      
      // Find the center of the detected grid area
      const centerX = gridArea.x + gridArea.width / 2;
      const centerY = gridArea.y + gridArea.height / 2;
      
      // Expand the grid area while maintaining the center point
      const newWidth = Math.max(gridArea.width, minGridSize);
      const newHeight = Math.max(gridArea.height, minGridSize);
      
      gridArea.x = Math.max(0, centerX - newWidth / 2);
      gridArea.y = Math.max(0, centerY - newHeight / 2);
      gridArea.width = Math.min(grayImage.cols - gridArea.x, newWidth);
      gridArea.height = Math.min(grayImage.rows - gridArea.y, newHeight);
      
      console.log(`Expanded grid area: ${gridArea.width}x${gridArea.height}`);
    }
    
    // Adjust line coordinates to account for the chart region offset
    for (const line of horizontalLines) {
      line.x1 += regionX;
      line.x2 += regionX;
      line.y1 += regionY;
      line.y2 += regionY;
    }
    
    for (const line of verticalLines) {
      line.x1 += regionX;
      line.x2 += regionX;
      line.y1 += regionY;
      line.y2 += regionY;
    }
    
    // For large charts, we need to limit the number of lines to avoid performance issues
    // Group nearby lines to reduce the total number
    let mergedHorizontal = [];
    let mergedVertical = [];
    
    try {
      // For very large charts (>1000 lines), use more aggressive filtering
      if (horizontalLines.length > 1000 || verticalLines.length > 1000) {
        console.log('Very large chart detected - using aggressive line filtering');
        
        // Sort lines by position before filtering
        const sortedHorizontal = [...horizontalLines].sort((a, b) => {
          return ((a.y1 + a.y2) / 2) - ((b.y1 + b.y2) / 2);
        });
        
        const sortedVertical = [...verticalLines].sort((a, b) => {
          return ((a.x1 + a.x2) / 2) - ((b.x1 + b.x2) / 2);
        });
        
        // For large charts, try to detect the grid cell size
        // This helps us select lines at regular intervals that match the actual grid
        const estimatedCellHeight = estimateGridCellSize(sortedHorizontal, 'y');
        const estimatedCellWidth = estimateGridCellSize(sortedVertical, 'x');
        
        console.log(`Estimated cell size: ${estimatedCellWidth}x${estimatedCellHeight}px`);
        
        // Filter lines based on estimated cell size
        if (estimatedCellHeight > 0) {
          mergedHorizontal = filterLinesByInterval(sortedHorizontal, estimatedCellHeight, 'y');
        } else {
          // Fallback to simple sampling
          const hSkip = Math.max(1, Math.floor(horizontalLines.length / 200));
          mergedHorizontal = sortedHorizontal.filter((_, i) => i % hSkip === 0);
        }
        
        if (estimatedCellWidth > 0) {
          // For vertical lines, use a larger interval to reduce density
          // Multiply by 2 to get half as many vertical lines
          const adjustedCellWidth = estimatedCellWidth * 2;
          mergedVertical = filterLinesByInterval(sortedVertical, adjustedCellWidth, 'x');
        } else {
          // Fallback to simple sampling with higher skip for vertical lines
          const vSkip = Math.max(2, Math.floor(verticalLines.length / 100));
          mergedVertical = sortedVertical.filter((_, i) => i % vSkip === 0);
        }
        
        console.log(`After intelligent filtering: ${mergedHorizontal.length} horizontal, ${mergedVertical.length} vertical lines`);
      } else {
        // For smaller charts, use the grouping approach
        const groupedHorizontal = groupNearbyLines(horizontalLines, 'y');
        const groupedVertical = groupNearbyLines(verticalLines, 'x');
        
        // Filter out null values and ensure we have valid groups
        const validHorizontalGroups = groupedHorizontal.filter(group => group !== null);
        const validVerticalGroups = groupedVertical.filter(group => group !== null);
        
        // Convert groups back to individual lines (averaged within each group)
        mergedHorizontal = validHorizontalGroups.map(group => averageLine(group, 'y')).filter(line => line !== null);
        mergedVertical = validVerticalGroups.map(group => averageLine(group, 'x')).filter(line => line !== null);
        
        console.log(`After grouping: ${mergedHorizontal.length} horizontal, ${mergedVertical.length} vertical lines`);
      }
    } catch (e) {
      console.error('Error during line grouping:', e);
      // Fallback to original lines if grouping fails
      mergedHorizontal = horizontalLines;
      mergedVertical = verticalLines;
    }
    
    // Step 8: Filter lines to only include those in the grid area
    const filteredHorizontal = filterLinesByRegion(mergedHorizontal, gridArea);
    const filteredVertical = filterLinesByRegion(mergedVertical, gridArea);
    
    // Step 9: Find grid cells by identifying intersections
    const gridCells = findGridCells(filteredHorizontal, filteredVertical, workingImage.cols, workingImage.rows);
    
    // Clean up
    if (chartRegion && chartRegion !== grayImage) {
      chartRegion.delete();
    }
    
    return {
      edges,
      lines,
      horizontalLines: filteredHorizontal,
      verticalLines: filteredVertical,
      gridArea,
      gridCells
    };
  };
  
  // Find the chart region in the image (excluding text areas)
  const findChartRegion = (cv, grayImage) => {
    try {
      // For knitting charts, we need to detect content areas first
      // Let's try to find the actual content (symbols) in the chart
      const binary = new cv.Mat();
      
      // Use binary thresholding to separate content from background
      cv.threshold(grayImage, binary, 180, 255, cv.THRESH_BINARY_INV);
      
      // Apply morphological operations to enhance content
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      const morphed = new cv.Mat();
      cv.morphologyEx(binary, morphed, cv.MORPH_CLOSE, kernel);
      kernel.delete();
      binary.delete();
      
      // Find contours of the content
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      morphed.delete();
      
      // Find all significant content areas
      const significantContours = [];
      const imageArea = grayImage.rows * grayImage.cols;
      const minArea = imageArea * 0.001; // Lower threshold to catch smaller symbols
      
      // Create a mask to visualize all detected content
      const contentMask = cv.Mat.zeros(grayImage.rows, grayImage.cols, cv.CV_8UC1);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        
        if (area > minArea) {
          // Draw this contour on our mask
          cv.drawContours(contentMask, contours, i, new cv.Scalar(255), cv.FILLED);
          
          const rect = cv.boundingRect(contour);
          significantContours.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            area: area
          });
        }
      }
      
      // Clean up
      contours.delete();
      hierarchy.delete();
      
      // Now find the bounding box of all content
      if (significantContours.length > 0) {
        // Find the bounding rectangle that contains all content
        let minX = grayImage.cols;
        let minY = grayImage.rows;
        let maxX = 0;
        let maxY = 0;
        
        for (const rect of significantContours) {
          minX = Math.min(minX, rect.x);
          minY = Math.min(minY, rect.y);
          maxX = Math.max(maxX, rect.x + rect.width);
          maxY = Math.max(maxY, rect.y + rect.height);
        }
        
        // Add a generous margin to ensure we get the full chart
        const margin = Math.max(50, Math.min(grayImage.cols, grayImage.rows) * 0.05);
        const x = Math.max(0, minX - margin);
        const y = Math.max(0, minY - margin);
        const width = Math.min(grayImage.cols - x, (maxX - minX) + 2 * margin);
        const height = Math.min(grayImage.rows - y, (maxY - minY) + 2 * margin);
        
        // Extract the region
        const roi = new cv.Rect(x, y, width, height);
        const chartRegion = grayImage.roi(roi);
        
        // Store the region coordinates for later use
        chartRegion.regionX = x;
        chartRegion.regionY = y;
        chartRegion.regionWidth = width;
        chartRegion.regionHeight = height;
        
        contentMask.delete();
        return chartRegion;
      }
      
      contentMask.delete();
    } catch (e) {
      console.error('Error finding chart region:', e);
    }
    
    // If we couldn't find a good chart region, return the full image
    return grayImage;
  };
  
  // Find the densest grid area (where most lines intersect)
  const findDensestGridArea = (horizontalLines, verticalLines, imageWidth, imageHeight) => {
    // If we don't have enough lines, return the whole image
    if (horizontalLines.length < 3 || verticalLines.length < 3) {
      return { x: 0, y: 0, width: imageWidth, height: imageHeight };
    }
    
    // Sort lines by position
    const sortedHorizontal = [...horizontalLines].sort((a, b) => (a.y1 + a.y2) / 2 - (b.y1 + b.y2) / 2);
    const sortedVertical = [...verticalLines].sort((a, b) => (a.x1 + a.x2) / 2 - (b.x1 + b.x2) / 2);
    
    // For knitting charts, we want to be more inclusive
    // Instead of looking for the densest area, let's find the full extent of the grid
    
    // Get the extents of all lines
    let minX = imageWidth;
    let maxX = 0;
    let minY = imageHeight;
    let maxY = 0;
    
    // Process horizontal lines
    for (const line of horizontalLines) {
      minX = Math.min(minX, line.x1, line.x2);
      maxX = Math.max(maxX, line.x1, line.x2);
      const y = (line.y1 + line.y2) / 2;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    // Process vertical lines
    for (const line of verticalLines) {
      minY = Math.min(minY, line.y1, line.y2);
      maxY = Math.max(maxY, line.y1, line.y2);
      const x = (line.x1 + line.x2) / 2;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    
    // Add a small margin
    const margin = 10;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(imageWidth, maxX + margin);
    maxY = Math.min(imageHeight, maxY + margin);
    
    // Return the full grid area
    return {
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY)
    };
  };
  
  // Find the density of lines along an axis
  const findLineDensity = (lines, axis, maxValue) => {
    const density = new Array(maxValue).fill(0);
    
    for (const line of lines) {
      const pos = axis === 'y' ? 
        Math.floor((line.y1 + line.y2) / 2) : 
        Math.floor((line.x1 + line.x2) / 2);
      
      if (pos >= 0 && pos < maxValue) {
        // Add weight based on line length
        density[pos] += line.length / 100;
      }
    }
    
    return density;
  };
  
  // Find the region with the highest density of lines
  const findDensestRegion = (density, maxValue) => {
    const windowSize = Math.floor(maxValue / 3); // Look for regions about 1/3 of the image size
    let maxDensity = 0;
    let bestStart = 0;
    
    for (let i = 0; i < maxValue - windowSize; i++) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += density[i + j];
      }
      
      if (sum > maxDensity) {
        maxDensity = sum;
        bestStart = i;
      }
    }
    
    return {
      start: bestStart,
      end: Math.min(bestStart + windowSize, maxValue)
    };
  };
  
  // Filter lines to only include those in the specified region
  const filterLinesByRegion = (lines, region) => {
    return lines.filter(line => {
      // Calculate midpoint of the line
      const midX = (line.x1 + line.x2) / 2;
      const midY = (line.y1 + line.y2) / 2;
      
      // Check if midpoint is within the region
      return midX >= region.x && midX <= region.x + region.width &&
             midY >= region.y && midY <= region.y + region.height;
    });
  };
  
  // Find grid cells by identifying intersections of horizontal and vertical lines
  const findGridCells = (horizontalLines, verticalLines, width, height) => {
    // Sort lines by position
    horizontalLines.sort((a, b) => (a.y1 + a.y2) / 2 - (b.y1 + b.y2) / 2);
    verticalLines.sort((a, b) => (a.x1 + a.x2) / 2 - (b.x1 + b.x2) / 2);
    
    // Group nearby lines (to handle multiple detections of the same line)
    const groupedHorizontal = groupNearbyLines(horizontalLines, 'y');
    const groupedVertical = groupNearbyLines(verticalLines, 'x');
    
    // Create grid cells from intersections
    const cells = [];
    
    for (let i = 0; i < groupedHorizontal.length - 1; i++) {
      for (let j = 0; j < groupedVertical.length - 1; j++) {
        const top = groupedHorizontal[i];
        const bottom = groupedHorizontal[i + 1];
        const left = groupedVertical[j];
        const right = groupedVertical[j + 1];
        
        // Calculate average y and x values for the lines
        const topY = (top.y1 + top.y2) / 2;
        const bottomY = (bottom.y1 + bottom.y2) / 2;
        const leftX = (left.x1 + left.x2) / 2;
        const rightX = (right.x1 + right.x2) / 2;
        
        // Create a cell with some margin
        cells.push({
          x: Math.round(leftX),
          y: Math.round(topY),
          width: Math.round(rightX - leftX),
          height: Math.round(bottomY - topY),
          row: i,
          col: j
        });
      }
    }
    
    return cells;
  };
  
  // Group nearby lines to handle multiple detections of the same line
  const groupNearbyLines = (lines, axis) => {
    // Handle null or undefined input
    if (!lines || !Array.isArray(lines)) {
      console.error('Invalid lines input to groupNearbyLines:', lines);
      return [];
    }
    
    if (lines.length === 0) return [];
    if (lines.length === 1) return [lines[0]];
    
    // For large charts with many cells, we need to be more aggressive with grouping
    // Calculate the appropriate threshold based on the number of lines
    const lineCount = lines.length;
    let threshold;
    
    if (lineCount > 1000) {
      threshold = 30; // Very aggressive grouping for very large charts
    } else if (lineCount > 500) {
      threshold = 20; // More aggressive grouping for large charts
    } else if (lineCount > 200) {
      threshold = 15; // Medium grouping for medium charts
    } else {
      threshold = 10; // Standard grouping for small charts
    }
    
    console.log(`Grouping ${lineCount} ${axis}-axis lines with threshold ${threshold}px`);
    
    try {
      // Sort lines by position to ensure consistent grouping
      const sortedLines = [...lines].sort((a, b) => {
        const aPos = axis === 'y' ? (a.y1 + a.y2) / 2 : (a.x1 + a.x2) / 2;
        const bPos = axis === 'y' ? (b.y1 + b.y2) / 2 : (b.x1 + b.x2) / 2;
        return aPos - bPos;
      });
    
      const groups = [];
      let currentGroup = [sortedLines[0]];
      
      for (let i = 1; i < sortedLines.length; i++) {
        const current = sortedLines[i];
        const prev = sortedLines[i - 1];
        
        // Calculate position based on axis
        const currentPos = axis === 'y' ? 
          (current.y1 + current.y2) / 2 : 
          (current.x1 + current.x2) / 2;
        
        const prevPos = axis === 'y' ? 
          (prev.y1 + prev.y2) / 2 : 
          (prev.x1 + prev.x2) / 2;
        
        if (Math.abs(currentPos - prevPos) < threshold) {
          // Add to current group if close enough
          currentGroup.push(current);
        } else {
          // Start a new group
          groups.push(averageLine(currentGroup, axis));
          currentGroup = [current];
        }
      }
      
      // Add the last group
      if (currentGroup.length > 0) {
        const avgLine = averageLine(currentGroup, axis);
        if (avgLine !== null) {
          groups.push(avgLine);
        }
      }
      
      return groups;
    } catch (e) {
      console.error(`Error in groupNearbyLines for ${axis}-axis:`, e);
      // Return original lines as individual groups if grouping fails
      return lines.map(line => line);
    }
  };
  
  // Calculate average line from a group of lines
  const averageLine = (lines, axis) => {
    // Handle null or undefined input
    if (!lines || !Array.isArray(lines)) {
      console.error('Invalid lines input to averageLine:', lines);
      return null;
    }
    
    if (lines.length === 0) return null;
    if (lines.length === 1) return lines[0];
    
    let sumX1 = 0, sumY1 = 0, sumX2 = 0, sumY2 = 0;
    let totalLength = 0;
    
    try {
      for (const line of lines) {
        sumX1 += line.x1;
        sumY1 += line.y1;
        sumX2 += line.x2;
        sumY2 += line.y2;
        totalLength += line.length || 0;
      }
    } catch (e) {
      console.error('Error processing lines in averageLine:', e);
      return lines[0]; // Fallback to first line if there's an error
    }
    
    return {
      x1: Math.round(sumX1 / lines.length),
      y1: Math.round(sumY1 / lines.length),
      x2: Math.round(sumX2 / lines.length),
      y2: Math.round(sumY2 / lines.length)
    };
  };
  
  // Draw grid lines on the image
  const drawGridLines = (cv, image, horizontalLines, verticalLines, gridArea, lineThickness = 1) => {
    const color = new cv.Scalar(0, 255, 0, 255); // Bright green color for better visibility
    const thickness = lineThickness; // Thinner lines (1px instead of 2px)
    
    console.log(`Drawing grid: ${horizontalLines.length} horizontal, ${verticalLines.length} vertical lines`);
    console.log(`Grid area: x=${gridArea.x}, y=${gridArea.y}, width=${gridArea.width}, height=${gridArea.height}`);
    
    // Draw the grid area boundary in red
    const rectColor = new cv.Scalar(255, 0, 0, 255); // Red
    const rectPt1 = new cv.Point(gridArea.x, gridArea.y);
    const rectPt2 = new cv.Point(gridArea.x + gridArea.width, gridArea.y + gridArea.height);
    cv.rectangle(image, rectPt1, rectPt2, rectColor, 2);
    
    // Draw horizontal lines
    for (const line of horizontalLines) {
      // Extend horizontal lines to span the full width of the grid area
      const y = (line.y1 + line.y2) / 2;
      const pt1 = new cv.Point(gridArea.x, y);
      const pt2 = new cv.Point(gridArea.x + gridArea.width, y);
      cv.line(image, pt1, pt2, color, thickness);
    }
    
    // Draw vertical lines
    for (const line of verticalLines) {
      // Extend vertical lines to span the full height of the grid area
      const x = (line.x1 + line.x2) / 2;
      const pt1 = new cv.Point(x, gridArea.y);
      const pt2 = new cv.Point(x, gridArea.y + gridArea.height);
      cv.line(image, pt1, pt2, color, thickness);
    }
    
    // If we have a grid area, draw a rectangle around it
    if (gridArea) {
      const pt1 = new cv.Point(gridArea.x, gridArea.y);
      const pt2 = new cv.Point(gridArea.x + gridArea.width, gridArea.y + gridArea.height);
      cv.rectangle(image, pt1, pt2, new cv.Scalar(255, 0, 0, 255), 3); // Red rectangle
    }
  };
  
  // Estimate the grid cell size based on line spacing
  const estimateGridCellSize = (lines, axis) => {
    if (!lines || lines.length < 5) return 0;
    
    // Calculate distances between adjacent lines
    const distances = [];
    for (let i = 1; i < lines.length; i++) {
      const current = lines[i];
      const prev = lines[i - 1];
      
      let currentPos, prevPos;
      if (axis === 'y') {
        currentPos = (current.y1 + current.y2) / 2;
        prevPos = (prev.y1 + prev.y2) / 2;
      } else {
        currentPos = (current.x1 + current.x2) / 2;
        prevPos = (prev.x1 + prev.x2) / 2;
      }
      
      const distance = Math.abs(currentPos - prevPos);
      if (distance > 0 && distance < 100) { // Ignore outliers
        distances.push(distance);
      }
    }
    
    if (distances.length < 3) return 0;
    
    // Find the most common distance (mode) - this is likely our cell size
    const distanceGroups = {};
    let maxCount = 0;
    let mostCommonDistance = 0;
    
    // Group distances with 1px tolerance
    for (const distance of distances) {
      const roundedDistance = Math.round(distance);
      distanceGroups[roundedDistance] = (distanceGroups[roundedDistance] || 0) + 1;
      
      if (distanceGroups[roundedDistance] > maxCount) {
        maxCount = distanceGroups[roundedDistance];
        mostCommonDistance = roundedDistance;
      }
    }
    
    // Only return if we have a clear consensus
    if (maxCount >= distances.length * 0.3) {
      return mostCommonDistance;
    }
    
    return 0;
  };
  
  // Filter lines to keep only those at regular intervals matching the cell size
  const filterLinesByInterval = (lines, interval, axis) => {
    if (!lines || lines.length === 0 || interval <= 0) return lines;
    
    const result = [];
    const positions = [];
    
    // Extract positions
    for (const line of lines) {
      let pos;
      if (axis === 'y') {
        pos = (line.y1 + line.y2) / 2;
      } else {
        pos = (line.x1 + line.x2) / 2;
      }
      positions.push({ pos, line });
    }
    
    // Sort by position
    positions.sort((a, b) => a.pos - b.pos);
    
    // Start with the first line
    let currentPos = positions[0].pos;
    result.push(positions[0].line);
    
    // Use different tolerances for horizontal vs vertical lines
    // Horizontal lines (axis=y) should be more precise, vertical lines (axis=x) more sparse
    const tolerance = axis === 'y' ? 0.2 : 0.1;
    
    // For vertical lines (axis=x), we want to be more selective
    const skipFactor = axis === 'x' ? 2 : 1; // Skip every other line for vertical lines
    let skipCount = 0;
    
    // Find the next line at approximately interval distance
    for (let i = 1; i < positions.length; i++) {
      const { pos, line } = positions[i];
      const distance = pos - currentPos;
      
      // If we're close to a multiple of the interval, include this line
      const intervalMultiple = Math.round(distance / interval);
      
      if (intervalMultiple >= 1 && Math.abs(distance - intervalMultiple * interval) < interval * tolerance) {
        // For vertical lines, only include every skipFactor-th line
        if (axis === 'x') {
          skipCount++;
          if (skipCount % skipFactor !== 0) {
            continue; // Skip this line
          }
        }
        
        result.push(line);
        currentPos = pos;
      }
    }
    
    return result;
  };
  
  // Extract grid cells as separate images
  const extractGridCells = (cv, sourceImage, cells) => {
    const cellImages = [];
    
    for (const cell of cells) {
      try {
        // Define the region of interest (ROI)
        const rect = new cv.Rect(cell.x, cell.y, cell.width, cell.height);
        
        // Check if the ROI is within the image bounds
        if (rect.x >= 0 && rect.y >= 0 && 
            rect.x + rect.width <= sourceImage.cols && 
            rect.y + rect.height <= sourceImage.rows) {
          
          // Extract the cell from the source image
          const cellMat = sourceImage.roi(rect);
          
          // Create a canvas for this cell
          const canvas = document.createElement('canvas');
          canvas.width = cell.width;
          canvas.height = cell.height;
          
          // Convert the cell to canvas
          cv.imshow(canvas, cellMat);
          
          // Convert to blob/base64
          const dataUrl = canvas.toDataURL('image/png');
          
          // Add to the result
          cellImages.push({
            dataUrl,
            row: cell.row,
            col: cell.col,
            x: cell.x,
            y: cell.y,
            width: cell.width,
            height: cell.height
          });
          
          // Clean up
          cellMat.delete();
          canvas.remove();
        }
      } catch (e) {
        // Skip this cell if there's an error
        console.error('Error extracting cell:', e);
      }
    }
    
    return cellImages;
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
