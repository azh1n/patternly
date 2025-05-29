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

        // If we found a grid, detect vertical lines within it
        if (result.gridFound && result.gridArea) {
          // Create a region of interest (ROI) for the grid area
          const { x, y, width, height } = result.gridArea;
          const roiRect = new cv.Rect(x, y, width, height);
          const gridROI = new cv.Mat();
          grayImage.roi(roiRect).copyTo(gridROI);

          console.log('[GridProcessing] Starting multi-step vertical line detection...');

          // STEP 1: Original approach - detect black/dark lines using adaptive threshold and morphological operations
          console.log('[GridProcessing] Step 1: Detecting black/dark lines with adaptive threshold...');
          
          // Apply adaptive threshold to enhance grid lines
          const binaryLight = new cv.Mat();
          cv.adaptiveThreshold(
            gridROI,
            binaryLight,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY_INV,
            7,  // Smaller block size to catch finer details
            1    // Lower constant to be more sensitive
          );

          // Create a vertical kernel for detecting vertical lines
          const verticalLineKernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(1, Math.floor(height * 0.3)) // Tall kernel to detect vertical lines
          );

          // Apply morphological operations to extract vertical lines
          const verticalLinesMat = new cv.Mat();
          cv.morphologyEx(binaryLight, verticalLinesMat, cv.MORPH_OPEN, verticalLineKernel);

          // Apply Hough Line Transform to detect vertical lines
          const lines = new cv.Mat();
          cv.HoughLinesP(
            verticalLinesMat,
            lines,
            1,                   // rho resolution (pixels)
            Math.PI / 180,      // theta resolution (radians)
            Math.floor(height * 0.1), // threshold - minimum votes (lower to catch light lines)
            Math.floor(height * 0.2), // minLineLength - minimum line length
            10                  // maxLineGap - maximum gap between line segments
          );

          console.log(`[GridProcessing] Step 1 detected ${lines.rows} potential vertical grid lines`);

          // Process detected lines and add vertical lines to result
          const verticalLinePositions = [];
          const verticalLineTolerance = 5; // pixels

          for (let i = 0; i < lines.rows; i++) {
            const line = lines.data32S.subarray(i * 4, (i + 1) * 4);
            const x1 = line[0] + x; // Adjust for ROI offset
            const y1 = line[1] + y;
            const x2 = line[2] + x;
            const y2 = line[3] + y;

            // Check if this is a vertical line (x1 ≈ x2)
            const dx = Math.abs(x2 - x1);
            const dy = Math.abs(y2 - y1);

            if (dx < 10 && dy > height * 0.2) { // Vertical line with significant height
              // Check if we already have a line at similar x position
              const xPosition = Math.round((x1 + x2) / 2);
              const existingLineIndex = verticalLinePositions.findIndex(
                pos => Math.abs(pos - xPosition) < verticalLineTolerance
              );

              if (existingLineIndex === -1) {
                // This is a new vertical line
                verticalLinePositions.push(xPosition);

                // Add to result with height constrained to grid area
                result.verticalLines.push({
                  x1: xPosition,
                  y1: y,
                  x2: xPosition,
                  y2: y + height,
                  isGridBorder: false,
                  isVerticalGridLine: true, // Mark as a detected vertical grid line
                  detectionMethod: 'adaptive-threshold'
                });
              }
            }
          }

          // STEP 2: Supplementary detection for light gray lines using improved pixel analysis
          console.log('[GridProcessing] Step 2: Detecting light gray lines with pixel analysis...');
          
          // Get existing vertical line positions to avoid duplicates
          const existingLinePositions = result.verticalLines
            .filter(line => !line.isGridBorder)
            .map(line => line.x1 - x); // Convert back to ROI coordinates
          
          // Analyze pixel columns to find consistent vertical patterns for light gray lines
          const lightGrayPositions = [];
          const minLineHeight = height * 0.3; // Minimum height for a line to be considered
          const grayThresholdRange = [140, 200]; // Gray values that represent light grid lines
          
          // Scan each column for vertical patterns
          for (let col = 0; col < width; col++) {
            let verticalGrayPixels = 0;
            let totalPixels = 0;
            
            // Count gray pixels in this column
            for (let row = 0; row < height; row++) {
              const pixelValue = gridROI.ucharPtr(row, col)[0];
              totalPixels++;
              
              // Check if pixel is in the gray range typical of grid lines
              if (pixelValue >= grayThresholdRange[0] && pixelValue <= grayThresholdRange[1]) {
                verticalGrayPixels++;
              }
            }
            
            // If this column has enough gray pixels, it might be a grid line
            const grayRatio = verticalGrayPixels / totalPixels;
            if (grayRatio > 0.4 && verticalGrayPixels > minLineHeight) {
              lightGrayPositions.push({
                position: col,
                strength: grayRatio,
                grayPixels: verticalGrayPixels
              });
            }
          }
          
          console.log(`[GridProcessing] Found ${lightGrayPositions.length} potential light gray column positions`);
          
          // Edge detection for better line boundary detection of light gray lines
          const edges = new cv.Mat();
          cv.Canny(gridROI, edges, 30, 90, 3, false);
          
          // Apply vertical morphological operation to enhance vertical edges
          const verticalKernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(1, Math.floor(height * 0.2))
          );
          
          const verticalEdges = new cv.Mat();
          cv.morphologyEx(edges, verticalEdges, cv.MORPH_OPEN, verticalKernel);
          
          // Use Hough Line Transform on edges with more precise parameters
          const edgeLines = new cv.Mat();
          cv.HoughLinesP(
            verticalEdges,
            edgeLines,
            1,                          // rho resolution
            Math.PI / 180,             // theta resolution  
            Math.floor(height * 0.15), // threshold (lower for more sensitivity)
            Math.floor(height * 0.25), // minimum line length
            8                          // maximum gap between segments
          );
          
          console.log(`[GridProcessing] Edge detection found ${edgeLines.rows} potential light gray lines`);
          
          // Combine pixel analysis and edge detection for light gray lines
          const lightGrayLines = [];
          const lineTolerance = 3; // pixels
          
          // Process edge-detected lines first
          for (let i = 0; i < edgeLines.rows; i++) {
            const line = edgeLines.data32S.subarray(i * 4, (i + 1) * 4);
            const x1 = line[0];
            const y1 = line[1];
            const x2 = line[2];
            const y2 = line[3];
            
            // Check if this is a vertical line
            const dx = Math.abs(x2 - x1);
            const dy = Math.abs(y2 - y1);
            
            if (dx < 5 && dy > height * 0.2) {
              const lineX = Math.round((x1 + x2) / 2);
              
              // Check if this line position is supported by our gray pixel analysis
              const supportingColumn = lightGrayPositions.find(
                pos => Math.abs(pos.position - lineX) <= lineTolerance
              );
              
              if (supportingColumn) {
                // This line has both edge and gray pixel support
                lightGrayLines.push({
                  position: lineX,
                  confidence: supportingColumn.strength + 0.5, // Bonus for edge support
                  source: 'edge+gray'
                });
              } else {
                // Edge-only line
                lightGrayLines.push({
                  position: lineX,
                  confidence: 0.3,
                  source: 'edge'
                });
              }
            }
          }
          
          // Add gray-pixel-only lines that weren't found by edge detection
          for (const grayPos of lightGrayPositions) {
            const existingLine = lightGrayLines.find(
              line => Math.abs(line.position - grayPos.position) <= lineTolerance
            );
            
            if (!existingLine) {
              lightGrayLines.push({
                position: grayPos.position,
                confidence: grayPos.strength,
                source: 'gray'
              });
            }
          }
          
          // Add light gray lines that don't conflict with existing lines
          for (const lightLine of lightGrayLines) {
            // Check if this line is too close to existing lines from Step 1
            const isNewLine = !existingLinePositions.some(pos => Math.abs(pos - lightLine.position) < 12);
            
            if (isNewLine && lightLine.position > 5 && lightLine.position < width - 5) {
              console.log(`[GridProcessing] Found new light gray line at column ${lightLine.position}`);
              
              // Add to result
              result.verticalLines.push({
                x1: lightLine.position + x, // Adjust for ROI offset
                y1: y,
                x2: lightLine.position + x,
                y2: y + height,
                isGridBorder: false,
                isVerticalGridLine: true,
                detectionMethod: 'light-gray-analysis',
                confidence: lightLine.confidence
              });
            }
          }

          // Clean up resources
          gridROI.delete();
          binaryLight.delete();
          verticalLinesMat.delete();
          verticalLineKernel.delete();
          lines.delete();
          edges.delete();
          verticalKernel.delete();
          verticalEdges.delete();
          edgeLines.delete();
          
          // STEP 3: Detection for medium gray lines
          console.log('[GridProcessing] Step 3: Detecting medium gray lines...');
          
          // Create a new ROI for medium gray detection
          const mediumGrayROI = new cv.Mat();
          grayImage.roi(roiRect).copyTo(mediumGrayROI);
          
          // Get existing vertical line positions to avoid duplicates
          const allExistingPositions = result.verticalLines
            .filter(line => !line.isGridBorder)
            .map(line => line.x1 - x); // Convert back to ROI coordinates
          
          // Expanded parameters for medium gray detection - more sensitive
          const mediumGrayThresholdRange = [60, 180]; // Wider range to catch more variations
          const minMediumLineHeight = height * 0.15; // Lower minimum height requirement
          
          // Analyze pixel columns for medium gray patterns
          const mediumGrayPositions = [];
          
          // First, sample some columns to understand the gray value distribution
          console.log('[GridProcessing] Sampling gray values for debugging...');
          for (let sampleCol = Math.floor(width * 0.1); sampleCol < width; sampleCol += Math.floor(width * 0.1)) {
            const grayValues = [];
            for (let row = 0; row < Math.min(height, 50); row += 5) {
              const pixelValue = mediumGrayROI.ucharPtr(row, sampleCol)[0];
              grayValues.push(pixelValue);
            }
            console.log(`[GridProcessing] Column ${sampleCol} sample gray values:`, grayValues.slice(0, 10));
          }
          
          for (let col = 0; col < width; col++) {
            let mediumGrayPixels = 0;
            let totalPixels = 0;
            let consecutiveGrayPixels = 0;
            let maxConsecutiveGray = 0;
            let grayValueSum = 0;
            let grayValueCount = 0;
            
            // Count medium gray pixels in this column
            for (let row = 0; row < height; row++) {
              const pixelValue = mediumGrayROI.ucharPtr(row, col)[0];
              totalPixels++;
              grayValueSum += pixelValue;
              grayValueCount++;
              
              // Check if pixel is in the medium gray range
              if (pixelValue >= mediumGrayThresholdRange[0] && pixelValue <= mediumGrayThresholdRange[1]) {
                mediumGrayPixels++;
                consecutiveGrayPixels++;
                maxConsecutiveGray = Math.max(maxConsecutiveGray, consecutiveGrayPixels);
              } else {
                consecutiveGrayPixels = 0;
              }
            }
            
            // Calculate average gray value for this column
            const avgGrayValue = grayValueSum / grayValueCount;
            
            // Check if this column has enough medium gray pixels and good consistency
            const grayRatio = mediumGrayPixels / totalPixels;
            const consistencyScore = maxConsecutiveGray / height;
            
            // Much more lenient thresholds
            if (grayRatio > 0.2 && // Lowered from 0.3
                mediumGrayPixels > minMediumLineHeight && 
                consistencyScore > 0.1 && // Lowered from 0.2
                maxConsecutiveGray > height * 0.1) { // Lowered from 0.2
              mediumGrayPositions.push({
                position: col,
                strength: grayRatio,
                consistency: consistencyScore,
                maxConsecutive: maxConsecutiveGray,
                grayPixels: mediumGrayPixels,
                avgGrayValue: avgGrayValue
              });
            }
          }
          
          console.log(`[GridProcessing] Found ${mediumGrayPositions.length} potential medium gray column positions`);
          if (mediumGrayPositions.length > 0) {
            console.log('[GridProcessing] Sample medium gray positions:', mediumGrayPositions.slice(0, 5));
          }
          
          // Apply edge detection specifically tuned for medium gray lines - more sensitive
          const mediumEdges = new cv.Mat();
          cv.Canny(mediumGrayROI, mediumEdges, 15, 45, 3, false); // Even lower thresholds
          
          // Apply vertical morphological operation for medium gray edges
          const mediumVerticalKernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(1, Math.floor(height * 0.1)) // Smaller kernel for more sensitivity
          );
          
          const mediumVerticalEdges = new cv.Mat();
          cv.morphologyEx(mediumEdges, mediumVerticalEdges, cv.MORPH_OPEN, mediumVerticalKernel);
          
          // Hough Line Transform for medium gray edges - more sensitive
          const mediumEdgeLines = new cv.Mat();
          cv.HoughLinesP(
            mediumVerticalEdges,
            mediumEdgeLines,
            1,                          // rho resolution
            Math.PI / 180,             // theta resolution  
            Math.floor(height * 0.08), // Much lower threshold
            Math.floor(height * 0.15), // Shorter minimum line length
            15                         // Larger gap tolerance
          );
          
          console.log(`[GridProcessing] Medium gray edge detection found ${mediumEdgeLines.rows} potential lines`);
          
          // Process medium gray lines
          const mediumGrayLines = [];
          const mediumLineTolerance = 5; // Slightly larger tolerance
          
          // Process edge-detected medium gray lines
          for (let i = 0; i < mediumEdgeLines.rows; i++) {
            const line = mediumEdgeLines.data32S.subarray(i * 4, (i + 1) * 4);
            const x1 = line[0];
            const y1 = line[1];
            const x2 = line[2];
            const y2 = line[3];
            
            // Check if this is a vertical line - more lenient
            const dx = Math.abs(x2 - x1);
            const dy = Math.abs(y2 - y1);
            
            if (dx < 8 && dy > height * 0.1) { // More lenient vertical line criteria
              const lineX = Math.round((x1 + x2) / 2);
              
              // Check if this line position is supported by our medium gray pixel analysis
              const supportingColumn = mediumGrayPositions.find(
                pos => Math.abs(pos.position - lineX) <= mediumLineTolerance
              );
              
              if (supportingColumn) {
                // This line has both edge and gray pixel support
                mediumGrayLines.push({
                  position: lineX,
                  confidence: supportingColumn.strength + supportingColumn.consistency + 0.2,
                  source: 'edge+medium-gray',
                  details: supportingColumn
                });
              } else {
                // Edge-only medium gray line - lower confidence but still consider
                mediumGrayLines.push({
                  position: lineX,
                  confidence: 0.2, // Lowered from 0.25
                  source: 'medium-edge'
                });
              }
            }
          }
          
          // Add strong medium gray pixel-only lines that weren't found by edge detection
          for (const grayPos of mediumGrayPositions) {
            const existingLine = mediumGrayLines.find(
              line => Math.abs(line.position - grayPos.position) <= mediumLineTolerance
            );
            
            // Much more lenient criteria for pixel-only lines
            if (!existingLine && grayPos.strength > 0.25 && grayPos.consistency > 0.15) {
              mediumGrayLines.push({
                position: grayPos.position,
                confidence: grayPos.strength + grayPos.consistency,
                source: 'medium-gray-only',
                details: grayPos
              });
            }
          }
          
          // Add medium gray lines that don't conflict with existing lines
          for (const mediumLine of mediumGrayLines) {
            // Check if this line is too close to existing lines
            const isNewLine = !allExistingPositions.some(pos => Math.abs(pos - mediumLine.position) < 8);
            
            // Much lower confidence threshold
            if (isNewLine && 
                mediumLine.position > 2 && 
                mediumLine.position < width - 2 && 
                mediumLine.confidence > 0.2) { // Lowered from 0.4
              
              console.log(`[GridProcessing] Found new medium gray line at column ${mediumLine.position} (confidence: ${mediumLine.confidence.toFixed(2)}, source: ${mediumLine.source})`);
              
              // Add to result
              result.verticalLines.push({
                x1: mediumLine.position + x, // Adjust for ROI offset
                y1: y,
                x2: mediumLine.position + x,
                y2: y + height,
                isGridBorder: false,
                isVerticalGridLine: true,
                detectionMethod: 'medium-gray-analysis',
                confidence: mediumLine.confidence,
                grayRange: 'medium',
                source: mediumLine.source
              });
            }
          }
          
          // Clean up medium gray detection resources
          mediumGrayROI.delete();
          mediumEdges.delete();
          mediumVerticalKernel.delete();
          mediumVerticalEdges.delete();
          mediumEdgeLines.delete();
          
          // STEP 4: Adaptive contrast detection for challenging areas (like color changes)
          console.log('[GridProcessing] Step 4: Adaptive contrast detection for challenging backgrounds...');
          
          // Create a new ROI for adaptive detection
          const adaptiveROI = new cv.Mat();
          grayImage.roi(roiRect).copyTo(adaptiveROI);
          
          // Get all existing vertical line positions
          const allCurrentPositions = result.verticalLines
            .filter(line => !line.isGridBorder)
            .map(line => line.x1 - x);
          
          // Apply histogram equalization to improve contrast
          const equalizedROI = new cv.Mat();
          cv.equalizeHist(adaptiveROI, equalizedROI);
          
          // Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) for better local contrast
          const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
          const claheROI = new cv.Mat();
          clahe.apply(equalizedROI, claheROI);
          
          // Multiple edge detection approaches for different contrast scenarios
          const adaptiveEdges1 = new cv.Mat();
          const adaptiveEdges2 = new cv.Mat();
          const adaptiveEdges3 = new cv.Mat();
          
          // Ultra-sensitive edge detection
          cv.Canny(claheROI, adaptiveEdges1, 10, 30, 3, false);
          
          // Standard edge detection on equalized image
          cv.Canny(equalizedROI, adaptiveEdges2, 20, 60, 3, false);
          
          // Gradient-based edge detection
          cv.Canny(adaptiveROI, adaptiveEdges3, 5, 25, 3, false);
          
          // Combine all edge detections
          const combinedEdges = new cv.Mat();
          cv.add(adaptiveEdges1, adaptiveEdges2, combinedEdges);
          cv.add(combinedEdges, adaptiveEdges3, combinedEdges);
          
          // Apply vertical morphological operation
          const adaptiveVerticalKernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(1, Math.floor(height * 0.08)) // Very small kernel for maximum sensitivity
          );
          
          const adaptiveVerticalEdges = new cv.Mat();
          cv.morphologyEx(combinedEdges, adaptiveVerticalEdges, cv.MORPH_OPEN, adaptiveVerticalKernel);
          
          // Ultra-sensitive Hough Line Transform
          const adaptiveLines = new cv.Mat();
          cv.HoughLinesP(
            adaptiveVerticalEdges,
            adaptiveLines,
            1,                          // rho resolution
            Math.PI / 180,             // theta resolution  
            Math.floor(height * 0.05), // Very low threshold
            Math.floor(height * 0.1),  // Very short minimum line length
            20                         // Large gap tolerance
          );
          
          console.log(`[GridProcessing] Adaptive edge detection found ${adaptiveLines.rows} potential lines`);
          
          // Process adaptive lines with very lenient criteria
          const adaptiveDetectedLines = [];
          
          for (let i = 0; i < adaptiveLines.rows; i++) {
            const line = adaptiveLines.data32S.subarray(i * 4, (i + 1) * 4);
            const x1 = line[0];
            const y1 = line[1];
            const x2 = line[2];
            const y2 = line[3];
            
            // Very lenient vertical line criteria
            const dx = Math.abs(x2 - x1);
            const dy = Math.abs(y2 - y1);
            
            if (dx < 10 && dy > height * 0.08) {
              const lineX = Math.round((x1 + x2) / 2);
              
              // Check if this is a new line
              const isNewLine = !allCurrentPositions.some(pos => Math.abs(pos - lineX) < 6);
              
              if (isNewLine && lineX > 1 && lineX < width - 1) {
                adaptiveDetectedLines.push({
                  position: lineX,
                  confidence: 0.15, // Lower confidence but still valid
                  length: dy,
                  source: 'adaptive-contrast'
                });
              }
            }
          }
          
          // Additionally, try template-based detection for regular grid patterns
          // Analyze spacing between existing lines to predict missing ones
          const existingPositions = allCurrentPositions.sort((a, b) => a - b);
          const spacings = [];
          
          for (let i = 1; i < existingPositions.length; i++) {
            const spacing = existingPositions[i] - existingPositions[i-1];
            if (spacing > 10 && spacing < width * 0.5) { // Reasonable spacing
              spacings.push(spacing);
            }
          }
          
          if (spacings.length > 0) {
            // Calculate most common spacing
            const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
            console.log(`[GridProcessing] Average grid spacing: ${avgSpacing.toFixed(1)} pixels`);
            
            // Look for missing lines based on expected spacing
            for (let i = 0; i < existingPositions.length - 1; i++) {
              const currentPos = existingPositions[i];
              const nextPos = existingPositions[i + 1];
              const gap = nextPos - currentPos;
              
              // If gap is significantly larger than average, there might be a missing line
              if (gap > avgSpacing * 1.8) {
                const expectedPos = Math.round(currentPos + avgSpacing);
                
                // Check if there's a weak line at the expected position
                if (expectedPos > currentPos + 5 && expectedPos < nextPos - 5) {
                  // Analyze this specific column for any vertical pattern
                  let verticalPixels = 0;
                  let totalAnalyzed = 0;
                  
                  for (let row = 0; row < height; row += 2) { // Sample every other row
                    const pixelValue = claheROI.ucharPtr(row, expectedPos)[0];
                    totalAnalyzed++;
                    
                    // Look for any consistent pattern (very broad criteria)
                    if (pixelValue < 200) { // Any non-white pixel
                      verticalPixels++;
                    }
                  }
                  
                  const patternStrength = verticalPixels / totalAnalyzed;
                  if (patternStrength > 0.3) {
                    console.log(`[GridProcessing] Found missing line by spacing analysis at column ${expectedPos}`);
                    adaptiveDetectedLines.push({
                      position: expectedPos,
                      confidence: 0.2 + patternStrength * 0.3,
                      source: 'spacing-analysis',
                      patternStrength: patternStrength
                    });
                  }
                }
              }
            }
          }
          
          // Add all adaptive detected lines
          for (const adaptiveLine of adaptiveDetectedLines) {
            console.log(`[GridProcessing] Found adaptive line at column ${adaptiveLine.position} (confidence: ${adaptiveLine.confidence.toFixed(2)}, source: ${adaptiveLine.source})`);
            
            result.verticalLines.push({
              x1: adaptiveLine.position + x, // Adjust for ROI offset
              y1: y,
              x2: adaptiveLine.position + x,
              y2: y + height,
              isGridBorder: false,
              isVerticalGridLine: true,
              detectionMethod: 'adaptive-contrast',
              confidence: adaptiveLine.confidence,
              grayRange: 'adaptive',
              source: adaptiveLine.source
            });
          }
          
          // Clean up adaptive detection resources
          adaptiveROI.delete();
          equalizedROI.delete();
          claheROI.delete();
          clahe.delete();
          adaptiveEdges1.delete();
          adaptiveEdges2.delete();
          adaptiveEdges3.delete();
          combinedEdges.delete();
          adaptiveVerticalKernel.delete();
          adaptiveVerticalEdges.delete();
          adaptiveLines.delete();
          
          // Sort all vertical lines from left to right
          result.verticalLines.sort((a, b) => a.x1 - b.x1);
          
          console.log(`[GridProcessing] Final vertical line detection complete. Total lines: ${result.verticalLines.filter(line => !line.isGridBorder).length}`);
        }
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
    console.log('[GridProcessing] Drawing grid lines: horizontal in green, vertical in blue');

    // Define line colors
    const greenColor = new cv.Scalar(0, 255, 0, 255);  // lime green: RGB 0,255,0
    const blueColor = new cv.Scalar(0, 0, 255, 255);   // blue: RGB 0,0,255

    // Use provided thickness or default to 2
    const thickness = lineThickness || 2;

    try {
      // Draw horizontal lines in green
      if (horizontalLines && horizontalLines.length > 0) {
        for (const line of horizontalLines) {
          const pt1 = new cv.Point(line.x1, line.y1);
          const pt2 = new cv.Point(line.x2, line.y2);
          cv.line(image, pt1, pt2, greenColor, thickness);
        }
      }

      // Draw vertical lines - blue for detected grid lines, green for border
      if (verticalLines && verticalLines.length > 0) {
        for (const line of verticalLines) {
          const pt1 = new cv.Point(line.x1, line.y1);
          const pt2 = new cv.Point(line.x2, line.y2);

          // Use blue for detected vertical grid lines, green for border lines
          const lineColor = line.isVerticalGridLine ? blueColor : greenColor;
          cv.line(image, pt1, pt2, lineColor, thickness);
        }
      }

      // Draw grid area border with thicker line if available
      if (gridArea) {
        const { x, y, width, height } = gridArea;

        // Draw rectangle around grid area
        const topLeft = new cv.Point(x, y);
        const bottomRight = new cv.Point(x + width, y + height);
        cv.rectangle(image, topLeft, bottomRight, greenColor, thickness + 1);
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