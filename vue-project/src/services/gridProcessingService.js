/**
 * Grid Processing Service
 * Provides functions for detecting and processing grid patterns in images
 */
import { ref } from 'vue';

/**
 * Vue composable for grid processing functionality
 * @returns {Object} - Grid processing methods and state
 */
export function useGridProcessing() {
  /**
   * Detects the grid in an image using OpenCV
   * @param {Object} cv - OpenCV instance
   * @param {cv.Mat} grayImage - Grayscale image as OpenCV Mat
   * @returns {Object} - Grid detection result with lines and cells
   */
  const detectGrid = (cv, grayImage) => {
    console.log('[GridProcessing] Detecting grid structure...');

    // Create result object
    const result = {
      horizontalLines: [],
      verticalLines: [],
      cells: [],
      gridFound: false
    };

    try {
      console.log("Step 1");
      // Step 1: Apply adaptive threshold to enhance grid lines
      const binary = new cv.Mat();
      cv.adaptiveThreshold(
        grayImage,
        binary,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        11,  // Block size
        2    // Constant subtracted from mean
      );

      console.log("Step 2");
      // Step 2: Find grid patterns by detecting regular patterns of lines
      // Create kernels for horizontal and vertical line detection
      const horizontalKernelSize = new cv.Size(Math.floor(grayImage.cols * 0.1), 1);
      const verticalKernelSize = new cv.Size(1, Math.floor(grayImage.rows * 0.1));
      
      const horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, horizontalKernelSize);
      const verticalKernel = cv.getStructuringElement(cv.MORPH_RECT, verticalKernelSize);
      
      // Detect horizontal and vertical lines separately
      const horizontalLines = new cv.Mat();
      const verticalLines = new cv.Mat();
      
      // Morphological operations to extract horizontal lines
      cv.morphologyEx(binary, horizontalLines, cv.MORPH_OPEN, horizontalKernel);
      
      // Morphological operations to extract vertical lines
      cv.morphologyEx(binary, verticalLines, cv.MORPH_OPEN, verticalKernel);
      
      // Combine horizontal and vertical lines to get grid structure
      const gridStructure = new cv.Mat();
      cv.add(horizontalLines, verticalLines, gridStructure);
      
      // Apply morphological closing to connect nearby lines
      const morphedGrid = new cv.Mat();
      const closeKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.morphologyEx(gridStructure, morphedGrid, cv.MORPH_CLOSE, closeKernel);

      console.log("Step 3");
      // Step 3: Find contours to detect the grid structure
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(morphedGrid, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      // Find the largest rectangular-like contour which is likely the grid
      let maxGridScore = 0;
      let maxContourIndex = -1;

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        
        // Skip very small contours
        if (area < (grayImage.cols * grayImage.rows * 0.05)) {
          continue;
        }
        
        // Calculate rectangularity - how rectangular is this contour?
        const rect = cv.boundingRect(contour);
        const rectArea = rect.width * rect.height;
        const rectangularity = area / rectArea;
        
        // Calculate aspect ratio - grids are typically more square-like
        const aspectRatio = Math.max(rect.width / rect.height, rect.height / rect.width);
        
        // Score based on size, rectangularity and aspect ratio
        // Higher score for larger, more rectangular contours with aspect ratio closer to 1
        const gridScore = area * rectangularity * (1 / aspectRatio);
        
        if (gridScore > maxGridScore) {
          maxGridScore = gridScore;
          maxContourIndex = i;
        }
      }

      console.log("SignificantContour");
      // If we found a significant contour
      if (maxContourIndex >= 0) {
        result.gridFound = true;
        const gridContour = contours.get(maxContourIndex);

        // Get bounding rectangle of the grid
        const rect = cv.boundingRect(gridContour);
        
        // Add gridArea property needed by drawGridLines
        result.gridArea = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        };

        // Store the grid border as lines
        // Top horizontal line
        result.horizontalLines.push({
          x1: rect.x,
          y1: rect.y,
          x2: rect.x + rect.width,
          y2: rect.y,
          isGridBorder: true
        });

        // Bottom horizontal line
        result.horizontalLines.push({
          x1: rect.x,
          y1: rect.y + rect.height,
          x2: rect.x + rect.width,
          y2: rect.y + rect.height,
          isGridBorder: true
        });

        // Left vertical line
        result.verticalLines.push({
          x1: rect.x,
          y1: rect.y,
          x2: rect.x,
          y2: rect.y + rect.height,
          isGridBorder: true
        });

        // Right vertical line
        result.verticalLines.push({
          x1: rect.x + rect.width,
          y1: rect.y,
          x2: rect.x + rect.width,
          y2: rect.y + rect.height,
          isGridBorder: true
        });
        
        // We're only keeping the outer border, no internal grid lines
        console.log('[GridProcessing] Grid border detected:', result);
      }

      // Clean up OpenCV resources
      binary.delete();
      horizontalLines.delete();
      verticalLines.delete();
      gridStructure.delete();
      morphedGrid.delete();
      horizontalKernel.delete();
      verticalKernel.delete();
      closeKernel.delete();
      contours.delete();
      hierarchy.delete();

    } catch (error) {
      console.error('[GridProcessing] Error detecting grid:', error);
    }

    return result;
  };

  /**
   * Detects the outside border of a grid in an image
   * @param {ImageData} imageData - The image data to process
   * @returns {Object} - Information about the detected grid border
   */
  const detectGridBorder = (imageData) => {
    const { width, height, data } = imageData;

    // Store the border points
    const borderPoints = {
      top: [],
      right: [],
      bottom: [],
      left: []
    };

    // Parameters for line detection
    const blackThreshold = 50; // RGB value below this is considered "black"
    const minLineLength = Math.min(width, height) * 0.1; // Minimum length for a line to be considered part of the grid

    // Detect horizontal lines (top and bottom borders)
    for (let y = 0; y < height; y++) {
      let consecutiveBlackPixels = 0;
      let startX = -1;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Check if this pixel is "black" (dark enough)
        if (r < blackThreshold && g < blackThreshold && b < blackThreshold) {
          if (consecutiveBlackPixels === 0) {
            startX = x;
          }
          consecutiveBlackPixels++;
        } else {
          // If we found a line of sufficient length
          if (consecutiveBlackPixels >= minLineLength) {
            // Determine if this is likely a top or bottom border
            if (y < height / 2) {
              borderPoints.top.push({ startX, endX: x - 1, y });
            } else {
              borderPoints.bottom.push({ startX, endX: x - 1, y });
            }
          }
          consecutiveBlackPixels = 0;
          startX = -1;
        }
      }

      // Check for line that ends at the edge of the image
      if (consecutiveBlackPixels >= minLineLength) {
        if (y < height / 2) {
          borderPoints.top.push({ startX, endX: width - 1, y });
        } else {
          borderPoints.bottom.push({ startX, endX: width - 1, y });
        }
      }
    }

    // Detect vertical lines (left and right borders)
    for (let x = 0; x < width; x++) {
      let consecutiveBlackPixels = 0;
      let startY = -1;

      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (r < blackThreshold && g < blackThreshold && b < blackThreshold) {
          if (consecutiveBlackPixels === 0) {
            startY = y;
          }
          consecutiveBlackPixels++;
        } else {
          if (consecutiveBlackPixels >= minLineLength) {
            if (x < width / 2) {
              borderPoints.left.push({ x, startY, endY: y - 1 });
            } else {
              borderPoints.right.push({ x, startY, endY: y - 1 });
            }
          }
          consecutiveBlackPixels = 0;
          startY = -1;
        }
      }

      if (consecutiveBlackPixels >= minLineLength) {
        if (x < width / 2) {
          borderPoints.left.push({ x, startY, endY: height - 1 });
        } else {
          borderPoints.right.push({ x, startY, endY: height - 1 });
        }
      }
    }

    return borderPoints;
  };

  /**
   * Highlights the detected grid border with lime green color
   * @param {ImageData} imageData - The original image data
   * @param {Object} borderPoints - The detected border points
   * @returns {ImageData} - New image data with highlighted border
   */
  const highlightGridBorder = (imageData, borderPoints) => {
    // Create a copy of the image data to avoid modifying the original
    const newImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    const { width, height, data } = newImageData;

    // Lime green color (RGB: 0, 255, 0)
    const borderColor = {
      r: 0,
      g: 255,
      b: 0
    };

    // Highlight horizontal lines (top and bottom)
    for (const line of [...borderPoints.top, ...borderPoints.bottom]) {
      const { startX, endX, y } = line;
      for (let x = startX; x <= endX; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = borderColor.r;     // R
        data[idx + 1] = borderColor.g; // G
        data[idx + 2] = borderColor.b; // B
        // Alpha channel remains unchanged
      }
    }

    // Highlight vertical lines (left and right)
    for (const line of [...borderPoints.left, ...borderPoints.right]) {
      const { x, startY, endY } = line;
      for (let y = startY; y <= endY; y++) {
        const idx = (y * width + x) * 4;
        data[idx] = borderColor.r;     // R
        data[idx + 1] = borderColor.g; // G
        data[idx + 2] = borderColor.b; // B
        // Alpha channel remains unchanged
      }
    }

    return newImageData;
  };

  /**
   * Cleans up grid resources to prevent memory leaks
   * @param {Object} gridResources - Grid resources to clean up
   */
  const cleanup = (gridResources) => {
    try {
      // Clean up horizontal lines
      if (gridResources.horizontalLines && Array.isArray(gridResources.horizontalLines)) {
        gridResources.horizontalLines.forEach(line => {
          if (line && typeof line.delete === 'function') {
            line.delete();
          }
        });
      }

      // Clean up vertical lines
      if (gridResources.verticalLines && Array.isArray(gridResources.verticalLines)) {
        gridResources.verticalLines.forEach(line => {
          if (line && typeof line.delete === 'function') {
            line.delete();
          }
        });
      }

      // Clean up cells
      if (gridResources.cells && Array.isArray(gridResources.cells)) {
        gridResources.cells.forEach(cell => {
          if (cell && typeof cell.delete === 'function') {
            cell.delete();
          }
        });
      }
    } catch (e) {
      console.error('[GridProcessing] Error during resource cleanup:', e);
    }
  };

  /**
   * Draws grid lines on an image
   * @param {Object} cv - OpenCV instance
   * @param {cv.Mat} image - Image to draw on
   * @param {Array} horizontalLines - Horizontal grid lines
   * @param {Array} verticalLines - Vertical grid lines
   * @param {Object} gridArea - Grid area information
   * @param {Number} lineThickness - Line thickness in pixels
   * @returns {cv.Mat} - The modified image (modifies in place)
   */
  const drawGridLines = (cv, image, horizontalLines, verticalLines, gridArea, lineThickness = 2) => {
    console.log('[GridProcessing] Drawing grid lines with lime green color');
    
    // Define line color (lime green: RGB 0,255,0)
    const color = new cv.Scalar(0, 255, 0, 255);
    
    // Use provided thickness or default to 2
    const thickness = lineThickness || 2;
    
    try {
      // Draw horizontal lines
      if (horizontalLines && horizontalLines.length > 0) {
        for (const line of horizontalLines) {
          const pt1 = new cv.Point(line.x1, line.y1);
          const pt2 = new cv.Point(line.x2, line.y2);
          cv.line(image, pt1, pt2, color, thickness);
        }
      }
      
      // Draw vertical lines
      if (verticalLines && verticalLines.length > 0) {
        for (const line of verticalLines) {
          const pt1 = new cv.Point(line.x1, line.y1);
          const pt2 = new cv.Point(line.x2, line.y2);
          cv.line(image, pt1, pt2, color, thickness);
        }
      }
      
      // Draw grid area border with thicker line if available
      if (gridArea) {
        const { x, y, width, height } = gridArea;
        
        // Draw rectangle around grid area
        const topLeft = new cv.Point(x, y);
        const bottomRight = new cv.Point(x + width, y + height);
        cv.rectangle(image, topLeft, bottomRight, color, thickness + 1);
      }
    } catch (error) {
      console.error('[GridProcessing] Error drawing grid lines:', error);
    }
    
    // Return the modified image (modified in place)
    return image;
  };

  /**
   * Extracts individual cells from the grid
   * @param {Object} cv - OpenCV instance
   * @param {cv.Mat} image - Source image
   * @param {Object} gridResult - Grid detection result
   * @returns {Array} - Array of cell images and their positions
   */
  const extractGridCells = (cv, image, gridResult) => {
    const cells = [];

    // If no grid was found, return empty array
    if (!gridResult.gridFound ||
      !gridResult.horizontalLines || gridResult.horizontalLines.length < 2 ||
      !gridResult.verticalLines || gridResult.verticalLines.length < 2) {
      return cells;
    }

    // For now, we'll just extract the entire grid as one cell
    // This can be expanded later to extract individual cells
    try {
      // Find the grid boundaries from the border lines
      let minX = image.cols;
      let minY = image.rows;
      let maxX = 0;
      let maxY = 0;

      // Check horizontal lines
      for (const line of gridResult.horizontalLines) {
        if (line.isGridBorder) {
          minX = Math.min(minX, line.x1, line.x2);
          maxX = Math.max(maxX, line.x1, line.x2);
          minY = Math.min(minY, line.y1, line.y2);
          maxY = Math.max(maxY, line.y1, line.y2);
        }
      }

      // Check vertical lines
      for (const line of gridResult.verticalLines) {
        if (line.isGridBorder) {
          minX = Math.min(minX, line.x1, line.x2);
          maxX = Math.max(maxX, line.x1, line.x2);
          minY = Math.min(minY, line.y1, line.y2);
          maxY = Math.max(maxY, line.y1, line.y2);
        }
      }

      // Extract the grid region
      const width = maxX - minX;
      const height = maxY - minY;

      if (width > 0 && height > 0) {
        const rect = new cv.Rect(minX, minY, width, height);
        const cell = image.roi(rect);

        cells.push({
          image: cell,
          x: minX,
          y: minY,
          width: width,
          height: height
        });
      }
    } catch (error) {
      console.error('[GridProcessing] Error extracting grid cells:', error);
    }

    return cells;
  };

  return {
    detectGrid,
    detectGridBorder,
    highlightGridBorder,
    drawGridLines,
    extractGridCells,
    cleanup
  };
}