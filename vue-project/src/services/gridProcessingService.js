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
      
      // First approach: Try to detect grid using edge detection and line finding
      const result = detectGridUsingEdges(cv, workingImage, sourceImage);
      
      // If the first approach didn't find enough lines, try the grid pattern approach
      if (!result || !result.horizontalLines || !result.verticalLines || 
          result.horizontalLines.length < 5 || result.verticalLines.length < 5) {
        console.log('[GridProcessing] Edge detection found insufficient lines, trying pattern detection');
        return detectGridUsingPatternMatching(cv, workingImage, sourceImage);
      }
      
      return result;
    } catch (err) {
      console.error('[GridProcessing] Error during grid detection:', err);
      error.value = `Error during grid detection: ${err.message}`;
      isProcessing.value = false;
      throw err;
    }
  };
  
  /**
   * Detect grid using edge detection and line finding
   * @param {Object} cv - OpenCV instance
   * @param {Mat} workingImage - Working image as OpenCV Mat
   * @param {Mat} sourceImage - Source image as OpenCV Mat
   * @returns {Object} Grid detection results
   */
  const detectGridUsingEdges = (cv, workingImage, sourceImage) => {
    // Apply color filtering to better detect gray grid lines
    let colorFiltered;
    if (workingImage.channels() > 1) {
      // Split the image into color channels to better detect gray
      const rgbaPlanes = new cv.MatVector();
      cv.split(workingImage, rgbaPlanes);
      
      // For gray lines, we expect similar values across RGB channels
      const rChannel = rgbaPlanes.get(0);
      const gChannel = rgbaPlanes.get(1);
      const bChannel = rgbaPlanes.get(2);
      
      // Calculate channel differences to find gray areas
      const diffRG = new cv.Mat();
      const diffRB = new cv.Mat();
      const diffGB = new cv.Mat();
      cv.absdiff(rChannel, gChannel, diffRG);
      cv.absdiff(rChannel, bChannel, diffRB);
      cv.absdiff(gChannel, bChannel, diffGB);
      
      // Combine differences - low values indicate gray
      const combinedDiff = new cv.Mat();
      cv.add(diffRG, diffRB, combinedDiff);
      cv.add(combinedDiff, diffGB, combinedDiff);
      
      // Threshold to get gray areas
      const grayMask = new cv.Mat();
      cv.threshold(combinedDiff, grayMask, 25, 255, cv.THRESH_BINARY_INV);
      
      // Convert original to grayscale
      colorFiltered = new cv.Mat();
      cv.cvtColor(workingImage, colorFiltered, cv.COLOR_RGBA2GRAY);
      
      // Apply the mask to enhance gray areas
      const enhancedGray = new cv.Mat();
      cv.bitwise_and(colorFiltered, colorFiltered, enhancedGray, grayMask);
      
      // Clean up temporary resources
      for (let i = 0; i < rgbaPlanes.size(); ++i) {
        rgbaPlanes.get(i).delete();
      }
      rgbaPlanes.delete();
      diffRG.delete();
      diffRB.delete();
      diffGB.delete();
      combinedDiff.delete();
      grayMask.delete();
      colorFiltered.delete();
      
      // Use the enhanced gray image
      colorFiltered = enhancedGray;
    } else {
      // Already grayscale
      colorFiltered = workingImage.clone();
    }
    
    // Apply Gaussian blur to reduce noise
    const blurred = new cv.Mat();
    cv.GaussianBlur(colorFiltered, blurred, new cv.Size(3, 3), 0, 0);
    colorFiltered.delete();
    
    // Enhance contrast with CLAHE for better detection of light gray lines
    const clahe = new cv.CLAHE(3.0, new cv.Size(8, 8));
    const enhanced = new cv.Mat();
    clahe.apply(blurred, enhanced);
    blurred.delete();
    
    // Apply adaptive thresholding with optimized parameters for light gray grid lines
    const thresholded = new cv.Mat();
    cv.adaptiveThreshold(
      enhanced,
      thresholded,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,  // Gaussian method for better light gray detection
      cv.THRESH_BINARY_INV,
      21,  // Larger block size for detecting light gray grid lines
      4     // Adjusted constant for light gray lines
    );
    enhanced.delete();
    
    // Apply morphological operations to enhance grid lines
    const kernelSize = new cv.Size(3, 3); // Larger kernel for better line connectivity
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, kernelSize);
    const processed = new cv.Mat();
    cv.morphologyEx(thresholded, processed, cv.MORPH_CLOSE, kernel);
    thresholded.delete();
    
    // Apply Canny edge detection with optimized thresholds for light gray lines
    const edges = new cv.Mat();
    cv.Canny(processed, edges, 15, 75, 3, false); // Lower thresholds for light gray lines
    processed.delete();
    
    // Use Hough transform to detect lines with adjusted parameters for light gray lines
    const lines = new cv.Mat();
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 15, 25, 10); // More sensitive parameters for light gray lines
    edges.delete();
      
    // Separate horizontal and vertical lines
    const horizontalLines = [];
    const verticalLines = [];
    
    // Collect all lines first
    const allLines = [];
    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.data32S[i * 4];
      const y1 = lines.data32S[i * 4 + 1];
      const x2 = lines.data32S[i * 4 + 2];
      const y2 = lines.data32S[i * 4 + 3];
      
      // Calculate line length and angle
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      const angle = Math.abs(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI);
      
      // Filter out very short lines - lower threshold for gray lines
      if (length < 8) continue;
      
      allLines.push({ x1, y1, x2, y2, length, angle });
    }
    
    // Sort lines by length (longer lines are more likely to be grid lines)
    allLines.sort((a, b) => b.length - a.length);
    
    // Take the top 70% of lines by length
    const significantLines = allLines.slice(0, Math.ceil(allLines.length * 0.7));
    
    // Classify lines as horizontal or vertical based on angle with wider ranges for gray lines
    for (const line of significantLines) {
      if (line.angle < 35 || line.angle > 145) {
        // Make horizontal lines more horizontal by adjusting endpoints
        const avgY = Math.round((line.y1 + line.y2) / 2);
        horizontalLines.push({ 
          x1: line.x1, 
          y1: avgY, 
          x2: line.x2, 
          y2: avgY, 
          length: line.length, 
          angle: line.angle 
        });
      } else if (line.angle > 55 && line.angle < 125) {
        // Make vertical lines more vertical by adjusting endpoints
        const avgX = Math.round((line.x1 + line.x2) / 2);
        verticalLines.push({ 
          x1: avgX, 
          y1: line.y1, 
          x2: avgX, 
          y2: line.y2, 
          length: line.length, 
          angle: line.angle 
        });
      }
    }
      
    // Group nearby lines to reduce duplicates
    const groupedHorizontal = groupNearbyLines(horizontalLines, 'horizontal');
    const groupedVertical = groupNearbyLines(verticalLines, 'vertical');
    
    // Calculate the grid area
    const gridArea = calculateGridArea(groupedHorizontal, groupedVertical, sourceImage.cols, sourceImage.rows);
    
    // Find grid cells
    const cells = findGridCells(groupedHorizontal, groupedVertical, gridArea);
    
    // Calculate cell size
    const cellSize = estimateGridCellSize(groupedHorizontal, groupedVertical);
    
    // Clean up OpenCV resources
    kernel.delete();
    lines.delete();
    
    return {
      horizontalLines: groupedHorizontal,
      verticalLines: groupedVertical,
      gridArea,
      cells,
      cellSize
    };
  };
  
  /**
   * Detect grid using pattern matching approach
   * @param {Object} cv - OpenCV instance
   * @param {Mat} workingImage - Working image as OpenCV Mat
   * @param {Mat} sourceImage - Source image as OpenCV Mat
   * @returns {Object} Grid detection results
   */
  const detectGridUsingPatternMatching = (cv, workingImage, sourceImage) => {
    // Convert to grayscale if needed
    let grayImage;
    if (workingImage.channels() === 1) {
      grayImage = workingImage.clone();
    } else {
      grayImage = new cv.Mat();
      cv.cvtColor(workingImage, grayImage, cv.COLOR_RGBA2GRAY);
    }
    
    // Apply Gaussian blur to reduce noise
    const blurred = new cv.Mat();
    cv.GaussianBlur(grayImage, blurred, new cv.Size(3, 3), 0, 0);
    grayImage.delete();
    
    // Apply adaptive thresholding optimized for light gray grid lines
    const thresholded = new cv.Mat();
    cv.adaptiveThreshold(
      blurred,
      thresholded,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      23, // Larger block size for light gray grid detection
      4   // Adjusted constant for better light gray line detection
    );
    
    // Apply morphological operations to enhance grid lines
    const openKernel = new cv.Size(1, 1);
    const openElement = cv.getStructuringElement(cv.MORPH_RECT, openKernel);
    const opened = new cv.Mat();
    cv.morphologyEx(thresholded, opened, cv.MORPH_OPEN, openElement);
    openElement.delete();
    
    // Apply closing operation to connect nearby grid lines
    const closeKernel = new cv.Size(3, 3);
    const closeElement = cv.getStructuringElement(cv.MORPH_RECT, closeKernel);
    const closed = new cv.Mat();
    cv.morphologyEx(opened, closed, cv.MORPH_CLOSE, closeElement);
    closeElement.delete();
    opened.delete();
    blurred.delete();
    thresholded.delete(); // Move this here after we're done with thresholded
    
    // Find contours to detect grid cells
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(closed, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    
    // Analyze contours to find grid cells
    const cellCandidates = [];
    const minCellArea = 100; // Minimum area for a valid cell
    const maxCellArea = 5000; // Maximum area for a valid cell
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      
      if (area >= minCellArea && area <= maxCellArea) {
        // Get bounding rectangle
        const rect = cv.boundingRect(contour);
        
        // Check if it's approximately square (grid cells are usually square)
        const aspectRatio = rect.width / rect.height;
        if (aspectRatio >= 0.7 && aspectRatio <= 1.3) {
          cellCandidates.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            area: area
          });
        }
      }
    }
    
    // Clean up contour resources
    for (let i = 0; i < contours.size(); ++i) {
      contours.get(i).delete();
    }
    contours.delete();
    hierarchy.delete();
    closed.delete(); // Clean up the closed Mat object
    
    if (cellCandidates.length < 10) {
      // Not enough cells found, return empty result
      workingImage.delete();
      return {
        horizontalLines: [],
        verticalLines: [],
        gridArea: { x: 0, y: 0, width: 0, height: 0 },
        cells: [],
        cellSize: { width: 0, height: 0 }
      };
    }
    
    // Analyze cell candidates to extract grid structure
    // Sort cells by position
    cellCandidates.sort((a, b) => {
      // Sort primarily by y, then by x
      if (Math.abs(a.y - b.y) < 10) {
        return a.x - b.x;
      }
      return a.y - b.y;
    });
    
    // Estimate average cell size
    let totalWidth = 0, totalHeight = 0;
    for (const cell of cellCandidates) {
      totalWidth += cell.width;
      totalHeight += cell.height;
    }
    const avgWidth = Math.round(totalWidth / cellCandidates.length);
    const avgHeight = Math.round(totalHeight / cellCandidates.length);
    
    // Estimate grid area
    const minX = Math.min(...cellCandidates.map(c => c.x));
    const minY = Math.min(...cellCandidates.map(c => c.y));
    const maxX = Math.max(...cellCandidates.map(c => c.x + c.width));
    const maxY = Math.max(...cellCandidates.map(c => c.y + c.height));
    
    const gridArea = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
    
    // Generate synthetic grid lines based on cell positions
    const horizontalLines = [];
    const verticalLines = [];
    
    // Find unique y-positions (rows)
    const rowPositions = new Set();
    for (const cell of cellCandidates) {
      rowPositions.add(cell.y);
      rowPositions.add(cell.y + cell.height);
    }
    
    // Find unique x-positions (columns)
    const colPositions = new Set();
    for (const cell of cellCandidates) {
      colPositions.add(cell.x);
      colPositions.add(cell.x + cell.width);
    }
    
    // Convert to arrays and sort
    const rows = Array.from(rowPositions).sort((a, b) => a - b);
    const cols = Array.from(colPositions).sort((a, b) => a - b);
    
    // Create horizontal lines
    for (const y of rows) {
      horizontalLines.push({
        x1: gridArea.x,
        y1: y,
        x2: gridArea.x + gridArea.width,
        y2: y,
        length: gridArea.width,
        angle: 0
      });
    }
    
    // Create vertical lines
    for (const x of cols) {
      verticalLines.push({
        x1: x,
        y1: gridArea.y,
        x2: x,
        y2: gridArea.y + gridArea.height,
        length: gridArea.height,
        angle: 90
      });
    }
    
    // Create cells from the grid lines
    const cells = [];
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = 0; j < cols.length - 1; j++) {
        const x = cols[j];
        const y = rows[i];
        const width = cols[j + 1] - cols[j];
        const height = rows[i + 1] - rows[i];
        
        if (width > 0 && height > 0) {
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
    
    // Clean up resources
    workingImage.delete();
    
    return {
      horizontalLines,
      verticalLines,
      gridArea,
      cells,
      cellSize: { width: avgWidth, height: avgHeight }
    };
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
        return a.y1 - b.y1;
      } else {
        return a.x1 - b.x1;
      }
    });
    
    // Group lines that are close to each other
    const groups = [];
    let currentGroup = [sortedLines[0]];
    
    // Adaptive distance threshold based on image size and line density
    // This helps with different grid densities and image resolutions
    const lineCount = sortedLines.length;
    const distanceThreshold = lineCount > 30 ? 8 : (lineCount > 15 ? 12 : 15);
    
    for (let i = 1; i < sortedLines.length; i++) {
      const currentLine = sortedLines[i];
      const prevLine = sortedLines[i - 1];
      
      // Calculate distance between lines
      let distance;
      if (orientation === 'horizontal') {
        distance = Math.abs(currentLine.y1 - prevLine.y1);
      } else {
        distance = Math.abs(currentLine.x1 - prevLine.x1);
      }
      
      // If lines are close, add to current group
      if (distance < distanceThreshold) {
        currentGroup.push(currentLine);
      } else {
        // Otherwise, start a new group
        groups.push(currentGroup);
        currentGroup = [currentLine];
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    // Average each group into a single line
    return groups.map(group => averageLine(group, orientation));
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
    
    // Filter out lines that are too close to each other (duplicates that weren't caught by grouping)
    // This is especially important for gray lines which might be detected multiple times
    const filteredHorizontal = [];
    const filteredVertical = [];
    
    // Minimum distance between lines (in pixels)
    const minHorizontalDistance = 5;
    const minVerticalDistance = 5;
    
    // Filter horizontal lines
    if (sortedHorizontal.length > 0) {
      filteredHorizontal.push(sortedHorizontal[0]);
      for (let i = 1; i < sortedHorizontal.length; i++) {
        const currentLine = sortedHorizontal[i];
        const prevLine = filteredHorizontal[filteredHorizontal.length - 1];
        const distance = Math.abs((currentLine.y1 + currentLine.y2) / 2 - (prevLine.y1 + prevLine.y2) / 2);
        
        if (distance > minHorizontalDistance) {
          filteredHorizontal.push(currentLine);
        }
      }
    }
    
    // Filter vertical lines
    if (sortedVertical.length > 0) {
      filteredVertical.push(sortedVertical[0]);
      for (let i = 1; i < sortedVertical.length; i++) {
        const currentLine = sortedVertical[i];
        const prevLine = filteredVertical[filteredVertical.length - 1];
        const distance = Math.abs((currentLine.x1 + currentLine.x2) / 2 - (prevLine.x1 + prevLine.x2) / 2);
        
        if (distance > minVerticalDistance) {
          filteredVertical.push(currentLine);
        }
      }
    }
    
    // Create cells from adjacent line pairs
    for (let i = 0; i < filteredHorizontal.length - 1; i++) {
      const topLine = filteredHorizontal[i];
      const bottomLine = filteredHorizontal[i + 1];
      
      for (let j = 0; j < filteredVertical.length - 1; j++) {
        const leftLine = filteredVertical[j];
        const rightLine = filteredVertical[j + 1];
        
        // Calculate cell coordinates more precisely for gray lines
        // Use the actual intersection points rather than midpoints
        const topLeft = lineIntersection(
          topLine.x1, topLine.y1, topLine.x2, topLine.y2,
          leftLine.x1, leftLine.y1, leftLine.x2, leftLine.y2
        );
        
        const bottomRight = lineIntersection(
          bottomLine.x1, bottomLine.y1, bottomLine.x2, bottomLine.y2,
          rightLine.x1, rightLine.y1, rightLine.x2, rightLine.y2
        );
        
        // Fall back to midpoint calculation if intersection fails
        const x = topLeft ? Math.round(topLeft.x) : Math.round((leftLine.x1 + leftLine.x2) / 2);
        const y = topLeft ? Math.round(topLeft.y) : Math.round((topLine.y1 + topLine.y2) / 2);
        
        let width, height;
        
        if (bottomRight) {
          width = Math.round(bottomRight.x - x);
          height = Math.round(bottomRight.y - y);
        } else {
          width = Math.round((rightLine.x1 + rightLine.x2) / 2) - x;
          height = Math.round((bottomLine.y1 + bottomLine.y2) / 2) - y;
        }
        
        // Filter out invalid cells
        if (width <= 0 || height <= 0) continue;
        
        // Check if the cell is within the grid area with some tolerance for gray lines
        const tolerance = 5; // Pixels of tolerance for gray grid lines
        if (x >= gridArea.x - tolerance && y >= gridArea.y - tolerance && 
            x + width <= gridArea.x + gridArea.width + tolerance && 
            y + height <= gridArea.y + gridArea.height + tolerance) {
          
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
    
    // Helper function to find the intersection point of two lines
    function lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
      // Line 1 represented as a1x + b1y = c1
      const a1 = y2 - y1;
      const b1 = x1 - x2;
      const c1 = a1 * x1 + b1 * y1;
      
      // Line 2 represented as a2x + b2y = c2
      const a2 = y4 - y3;
      const b2 = x3 - x4;
      const c2 = a2 * x3 + b2 * y3;
      
      const determinant = a1 * b2 - a2 * b1;
      
      if (determinant === 0) {
        // Lines are parallel
        return null;
      }
      
      const x = (b2 * c1 - b1 * c2) / determinant;
      const y = (a1 * c2 - a2 * c1) / determinant;
      
      // Check if the intersection point is within the line segments
      const onSegment1 = isPointOnLineSegment(x1, y1, x2, y2, x, y);
      const onSegment2 = isPointOnLineSegment(x3, y3, x4, y4, x, y);
      
      if (onSegment1 && onSegment2) {
        return { x, y };
      }
      
      return null;
    }
    
    // Helper function to check if a point is on a line segment
    function isPointOnLineSegment(x1, y1, x2, y2, x, y) {
      // Add a small epsilon for floating point comparison
      const epsilon = 0.1;
      
      // Check if the point is within the bounding box of the line segment
      const withinBounds = 
        (x >= Math.min(x1, x2) - epsilon && x <= Math.max(x1, x2) + epsilon) &&
        (y >= Math.min(y1, y2) - epsilon && y <= Math.max(y1, y2) + epsilon);
      
      if (!withinBounds) {
        return false;
      }
      
      // For vertical lines
      if (Math.abs(x1 - x2) < epsilon) {
        return Math.abs(x - x1) < epsilon;
      }
      
      // For horizontal lines
      if (Math.abs(y1 - y2) < epsilon) {
        return Math.abs(y - y1) < epsilon;
      }
      
      // For other lines, check if the point lies on the line
      const slope = (y2 - y1) / (x2 - x1);
      const yIntercept = y1 - slope * x1;
      const calculatedY = slope * x + yIntercept;
      
      return Math.abs(y - calculatedY) < epsilon;
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
