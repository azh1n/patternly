import { ref } from 'vue';

/**
 * Grid processing service for knitting charts
 * This service handles all grid detection and processing functionality
 */
export function useGridProcessing() {
  const error = ref(null);
  const isProcessing = ref(false);

  /**
   * Detect grid in an image
   * @param {Object} cv - OpenCV instance
   * @param {Mat} sourceImage - Source image as OpenCV Mat
   * @returns {Object} Grid detection results
   */
  const detectGrid = (cv, sourceImage) => {
    try {
      isProcessing.value = true;
      
      // Create a copy of the source image to work with
      const workingImage = sourceImage.clone();
      
      // Convert to grayscale if needed
      let grayImage;
      if (workingImage.channels() === 1) {
        grayImage = workingImage.clone();
      } else {
        grayImage = new cv.Mat();
        cv.cvtColor(workingImage, grayImage, cv.COLOR_RGBA2GRAY);
        workingImage.delete();
      }
      
      // Apply adaptive thresholding to enhance grid lines
      const thresholded = new cv.Mat();
      cv.adaptiveThreshold(
        grayImage,
        thresholded,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        11,
        2
      );
      
      // Apply morphological operations to enhance grid lines
      const kernelSize = new cv.Size(2, 2);
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, kernelSize);
      const processed = new cv.Mat();
      cv.morphologyEx(thresholded, processed, cv.MORPH_CLOSE, kernel);
      
      // Apply Canny edge detection
      const edges = new cv.Mat();
      cv.Canny(processed, edges, 50, 150, 3, false);
      
      // Use Hough transform to detect lines
      const lines = new cv.Mat();
      cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 40, 30, 10);
      
      // Separate horizontal and vertical lines
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
        
        // Filter out very short lines
        if (length < 15) continue;
        
        // Classify lines as horizontal or vertical based on angle
        if (angle < 20 || angle > 160) {
          horizontalLines.push({ x1, y1, x2, y2, length });
        } else if (angle > 70 && angle < 110) {
          verticalLines.push({ x1, y1, x2, y2, length });
        }
      }
      
      // Group nearby lines to reduce duplicates
      const groupedHorizontal = groupNearbyLines(horizontalLines, 'horizontal');
      const groupedVertical = groupNearbyLines(verticalLines, 'vertical');
      
      // Calculate the grid area
      const gridArea = calculateGridArea(groupedHorizontal, groupedVertical, grayImage.cols, grayImage.rows);
      
      // Find grid cells
      const cells = findGridCells(groupedHorizontal, groupedVertical, gridArea);
      
      // Calculate cell size
      const cellSize = estimateGridCellSize(groupedHorizontal, groupedVertical);
      
      // Clean up OpenCV resources
      kernel.delete();
      thresholded.delete();
      processed.delete();
      edges.delete();
      lines.delete();
      grayImage.delete();
      
      isProcessing.value = false;
      
      return {
        horizontalLines: groupedHorizontal,
        verticalLines: groupedVertical,
        gridArea,
        cells,
        cellSize
      };
    } catch (err) {
      console.error('[GridProcessing] Error during grid detection:', err);
      error.value = `Error during grid detection: ${err.message}`;
      isProcessing.value = false;
      throw err;
    }
  };

  /**
   * Group nearby lines to reduce duplicates
   * @param {Array} lines - Array of line objects
   * @param {String} orientation - 'horizontal' or 'vertical'
   * @returns {Array} Grouped lines
   */
  const groupNearbyLines = (lines, orientation) => {
    if (!lines || lines.length === 0) return [];
    
    // Sort lines by position
    const sortedLines = [...lines].sort((a, b) => {
      if (orientation === 'horizontal') {
        // Sort horizontal lines by y position
        return ((a.y1 + a.y2) / 2) - ((b.y1 + b.y2) / 2);
      } else {
        // Sort vertical lines by x position
        return ((a.x1 + a.x2) / 2) - ((b.x1 + b.x2) / 2);
      }
    });
    
    const groupedLines = [];
    let currentGroup = [sortedLines[0]];
    
    // Threshold for grouping (pixels)
    const threshold = orientation === 'horizontal' ? 10 : 10;
    
    for (let i = 1; i < sortedLines.length; i++) {
      const currentLine = sortedLines[i];
      const previousLine = sortedLines[i - 1];
      
      let distance;
      if (orientation === 'horizontal') {
        // For horizontal lines, compare y positions
        distance = Math.abs((currentLine.y1 + currentLine.y2) / 2 - (previousLine.y1 + previousLine.y2) / 2);
      } else {
        // For vertical lines, compare x positions
        distance = Math.abs((currentLine.x1 + currentLine.x2) / 2 - (previousLine.x1 + previousLine.x2) / 2);
      }
      
      if (distance <= threshold) {
        // Add to current group
        currentGroup.push(currentLine);
      } else {
        // Average the current group and start a new one
        groupedLines.push(averageLine(currentGroup, orientation));
        currentGroup = [currentLine];
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groupedLines.push(averageLine(currentGroup, orientation));
    }
    
    return groupedLines;
  };

  /**
   * Calculate average line from a group of lines
   * @param {Array} lines - Array of line objects
   * @param {String} orientation - 'horizontal' or 'vertical'
   * @returns {Object} Averaged line
   */
  const averageLine = (lines, orientation) => {
    if (!lines || lines.length === 0) return null;
    
    if (lines.length === 1) return lines[0];
    
    let sumX1 = 0, sumY1 = 0, sumX2 = 0, sumY2 = 0, totalLength = 0;
    
    for (const line of lines) {
      sumX1 += line.x1;
      sumY1 += line.y1;
      sumX2 += line.x2;
      sumY2 += line.y2;
      totalLength += line.length;
    }
    
    const avgX1 = Math.round(sumX1 / lines.length);
    const avgY1 = Math.round(sumY1 / lines.length);
    const avgX2 = Math.round(sumX2 / lines.length);
    const avgY2 = Math.round(sumY2 / lines.length);
    const avgLength = totalLength / lines.length;
    
    // For horizontal lines, ensure x2 > x1
    // For vertical lines, ensure y2 > y1
    if (orientation === 'horizontal' && avgX2 < avgX1) {
      return { x1: avgX2, y1: avgY2, x2: avgX1, y2: avgY1, length: avgLength };
    } else if (orientation === 'vertical' && avgY2 < avgY1) {
      return { x1: avgX2, y1: avgY2, x2: avgX1, y2: avgY1, length: avgLength };
    }
    
    return { x1: avgX1, y1: avgY1, x2: avgX2, y2: avgY2, length: avgLength };
  };

  /**
   * Calculate the grid area based on line intersections
   * @param {Array} horizontalLines - Array of horizontal line objects
   * @param {Array} verticalLines - Array of vertical line objects
   * @param {Number} imageWidth - Width of the image
   * @param {Number} imageHeight - Height of the image
   * @returns {Object} Grid area rectangle
   */
  const calculateGridArea = (horizontalLines, verticalLines, imageWidth, imageHeight) => {
    if (horizontalLines.length === 0 || verticalLines.length === 0) {
      // If no lines detected, use the entire image
      return { x: 0, y: 0, width: imageWidth, height: imageHeight };
    }
    
    // Find the bounding box of all line intersections
    let minX = imageWidth, minY = imageHeight, maxX = 0, maxY = 0;
    
    // Find the min/max coordinates from horizontal lines
    for (const line of horizontalLines) {
      minX = Math.min(minX, line.x1, line.x2);
      maxX = Math.max(maxX, line.x1, line.x2);
      minY = Math.min(minY, line.y1, line.y2);
      maxY = Math.max(maxY, line.y1, line.y2);
    }
    
    // Find the min/max coordinates from vertical lines
    for (const line of verticalLines) {
      minX = Math.min(minX, line.x1, line.x2);
      maxX = Math.max(maxX, line.x1, line.x2);
      minY = Math.min(minY, line.y1, line.y2);
      maxY = Math.max(maxY, line.y1, line.y2);
    }
    
    // Add a small margin
    const margin = 10;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(imageWidth, maxX + margin);
    maxY = Math.min(imageHeight, maxY + margin);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  /**
   * Find grid cells by identifying intersections of horizontal and vertical lines
   * @param {Array} horizontalLines - Array of horizontal line objects
   * @param {Array} verticalLines - Array of vertical line objects
   * @param {Object} gridArea - Grid area rectangle
   * @returns {Array} Array of cell objects
   */
  const findGridCells = (horizontalLines, verticalLines, gridArea) => {
    if (horizontalLines.length < 2 || verticalLines.length < 2) {
      return [];
    }
    
    const cells = [];
    
    // Sort lines by position
    const sortedHorizontal = [...horizontalLines].sort((a, b) => {
      return ((a.y1 + a.y2) / 2) - ((b.y1 + b.y2) / 2);
    });
    
    const sortedVertical = [...verticalLines].sort((a, b) => {
      return ((a.x1 + a.x2) / 2) - ((b.x1 + b.x2) / 2);
    });
    
    // Create cells from adjacent line pairs
    for (let i = 0; i < sortedHorizontal.length - 1; i++) {
      const topLine = sortedHorizontal[i];
      const bottomLine = sortedHorizontal[i + 1];
      
      for (let j = 0; j < sortedVertical.length - 1; j++) {
        const leftLine = sortedVertical[j];
        const rightLine = sortedVertical[j + 1];
        
        // Calculate cell coordinates
        const x = Math.round((leftLine.x1 + leftLine.x2) / 2);
        const y = Math.round((topLine.y1 + topLine.y2) / 2);
        const width = Math.round((rightLine.x1 + rightLine.x2) / 2) - x;
        const height = Math.round((bottomLine.y1 + bottomLine.y2) / 2) - y;
        
        // Filter out invalid cells
        if (width <= 0 || height <= 0) continue;
        
        // Check if the cell is within the grid area
        if (x >= gridArea.x && y >= gridArea.y && 
            x + width <= gridArea.x + gridArea.width && 
            y + height <= gridArea.y + gridArea.height) {
          
          cells.push({
            x,
            y,
            width,
            height,
            row: i,
            col: j
          });
        }
      }
    }
    
    return cells;
  };

  /**
   * Estimate the grid cell size based on line spacing
   * @param {Array} horizontalLines - Array of horizontal line objects
   * @param {Array} verticalLines - Array of vertical line objects
   * @returns {Object} Estimated cell width and height
   */
  const estimateGridCellSize = (horizontalLines, verticalLines) => {
    let cellWidth = 0;
    let cellHeight = 0;
    
    if (horizontalLines.length >= 2) {
      // Sort horizontal lines by y position
      const sortedHorizontal = [...horizontalLines].sort((a, b) => {
        return ((a.y1 + a.y2) / 2) - ((b.y1 + b.y2) / 2);
      });
      
      // Calculate average vertical spacing
      let totalSpacing = 0;
      let spacingCount = 0;
      
      for (let i = 0; i < sortedHorizontal.length - 1; i++) {
        const currentLine = sortedHorizontal[i];
        const nextLine = sortedHorizontal[i + 1];
        
        const currentY = (currentLine.y1 + currentLine.y2) / 2;
        const nextY = (nextLine.y1 + nextLine.y2) / 2;
        const spacing = nextY - currentY;
        
        if (spacing > 0) {
          totalSpacing += spacing;
          spacingCount++;
        }
      }
      
      if (spacingCount > 0) {
        cellHeight = Math.round(totalSpacing / spacingCount);
      }
    }
    
    if (verticalLines.length >= 2) {
      // Sort vertical lines by x position
      const sortedVertical = [...verticalLines].sort((a, b) => {
        return ((a.x1 + a.x2) / 2) - ((b.x1 + b.x2) / 2);
      });
      
      // Calculate average horizontal spacing
      let totalSpacing = 0;
      let spacingCount = 0;
      
      for (let i = 0; i < sortedVertical.length - 1; i++) {
        const currentLine = sortedVertical[i];
        const nextLine = sortedVertical[i + 1];
        
        const currentX = (currentLine.x1 + currentLine.x2) / 2;
        const nextX = (nextLine.x1 + nextLine.x2) / 2;
        const spacing = nextX - currentX;
        
        if (spacing > 0) {
          totalSpacing += spacing;
          spacingCount++;
        }
      }
      
      if (spacingCount > 0) {
        cellWidth = Math.round(totalSpacing / spacingCount);
      }
    }
    
    return { width: cellWidth, height: cellHeight };
  };

  /**
   * Draw grid lines on an image for visualization
   * @param {Object} cv - OpenCV instance
   * @param {Mat} image - Target image as OpenCV Mat
   * @param {Array} horizontalLines - Array of horizontal line objects
   * @param {Array} verticalLines - Array of vertical line objects
   * @param {Object} gridArea - Grid area rectangle
   * @param {Number} lineThickness - Line thickness
   */
  const drawGridLines = (cv, image, horizontalLines, verticalLines, gridArea, lineThickness = 1) => {
    // Draw grid area rectangle if it exists and has valid properties
    if (gridArea && typeof gridArea.x === 'number' && typeof gridArea.y === 'number' && 
        typeof gridArea.width === 'number' && typeof gridArea.height === 'number') {
      const color = new cv.Scalar(0, 255, 0, 255); // Green
      
      // Create points for rectangle instead of using Rect
      const pt1 = new cv.Point(gridArea.x, gridArea.y);
      const pt2 = new cv.Point(gridArea.x + gridArea.width, gridArea.y + gridArea.height);
      cv.rectangle(image, pt1, pt2, color, 2);
    }
    
    // Draw horizontal lines
    const hColor = new cv.Scalar(255, 0, 0, 255); // Red
    for (const line of horizontalLines) {
      const pt1 = new cv.Point(line.x1, line.y1);
      const pt2 = new cv.Point(line.x2, line.y2);
      cv.line(image, pt1, pt2, hColor, lineThickness);
    }
    
    // Draw vertical lines
    const vColor = new cv.Scalar(0, 0, 255, 255); // Blue
    for (const line of verticalLines) {
      const pt1 = new cv.Point(line.x1, line.y1);
      const pt2 = new cv.Point(line.x2, line.y2);
      cv.line(image, pt1, pt2, vColor, lineThickness);
    }
  };

  /**
   * Extract grid cells as separate images
   * @param {Object} cv - OpenCV instance
   * @param {Mat} sourceImage - Source image as OpenCV Mat
   * @param {Array} cells - Array of cell objects
   * @returns {Array} Array of cell image objects
   */
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
          
          // Convert to data URL
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
        console.error('[GridProcessing] Error extracting cell:', e);
      }
    }
    
    return cellImages;
  };

  /**
   * Clean up OpenCV resources
   * @param {Object} resources - Object containing OpenCV resources to clean up
   */
  const cleanup = (resources) => {
    try {
      for (const key in resources) {
        if (resources[key] && typeof resources[key].delete === 'function') {
          resources[key].delete();
        }
      }
    } catch (e) {
      console.error('[GridProcessing] Error during cleanup:', e);
    }
  };

  return {
    error,
    isProcessing,
    detectGrid,
    groupNearbyLines,
    averageLine,
    calculateGridArea,
    findGridCells,
    estimateGridCellSize,
    drawGridLines,
    extractGridCells,
    cleanup
  };
}
