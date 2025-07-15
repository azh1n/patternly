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

    // Wrap the detection in a timeout to prevent hanging
    return new Promise((resolve, reject) => {
      // Set a timeout to prevent hanging (10 seconds for faster feedback)
      const timeout = setTimeout(() => {
        console.warn('[GridProcessing] Grid detection timed out after 10 seconds, returning basic result');
        resolve({
          horizontalLines: [],
          verticalLines: [],
          cells: [],
          gridFound: false,
          timedOut: true
        });
      }, 10000);

      try {
        const result = detectGridSync(cv, grayImage);
        clearTimeout(timeout);
        console.log('[GridProcessing] Grid detection completed successfully');
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        console.error('[GridProcessing] Error during grid detection:', error);
        resolve({
          horizontalLines: [],
          verticalLines: [],
          cells: [],
          gridFound: false,
          error: error.message
        });
      }
    });
  };

  /**
   * Synchronous grid detection function (wrapped by timeout)
   */
  const detectGridSync = (cv, grayImage) => {
    // Create result object
    const result = {
      horizontalLines: [],
      verticalLines: [],
      cells: [],
      gridFound: false
    };

    console.log("Step 1");
    // Step 1: Apply adaptive threshold to enhance grid lines
    console.log('[GridProcessing] Step 1: Applying adaptive threshold...');
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
    // Step 2: Find grid patterns by detecting regular patterns of lines (SIMPLIFIED)
    console.log('[GridProcessing] Step 2: Creating morphological kernels...');
    // Create kernels for horizontal and vertical line detection
    const horizontalKernelSize = new cv.Size(Math.floor(grayImage.cols * 0.1), 1);
    const verticalKernelSize = new cv.Size(1, Math.floor(grayImage.rows * 0.1));

    const horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, horizontalKernelSize);
    const verticalKernel = cv.getStructuringElement(cv.MORPH_RECT, verticalKernelSize);

    console.log('[GridProcessing] Step 2: Detecting horizontal and vertical lines...');
    // Detect horizontal and vertical lines separately
    const horizontalLines = new cv.Mat();
    const verticalLinesMat = new cv.Mat();

    // Morphological operations to extract horizontal lines
    cv.morphologyEx(binary, horizontalLines, cv.MORPH_OPEN, horizontalKernel);

    // Morphological operations to extract vertical lines
    cv.morphologyEx(binary, verticalLinesMat, cv.MORPH_OPEN, verticalKernel);

    console.log('[GridProcessing] Step 2: Combining line structures...');
    // Combine horizontal and vertical lines to get grid structure
    const gridStructure = new cv.Mat();
    cv.add(horizontalLines, verticalLinesMat, gridStructure);

    // Apply morphological closing to connect nearby lines
    const morphedGrid = new cv.Mat();
    const closeKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(gridStructure, morphedGrid, cv.MORPH_CLOSE, closeKernel);

    console.log("Step 3");
    // Step 3: Find contours to detect the grid structure
    console.log('[GridProcessing] Step 3: Finding contours...');
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(morphedGrid, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    console.log(`[GridProcessing] Step 3: Found ${contours.size()} contours, analyzing...`);
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

      console.log('[GridProcessing] Grid border detected, starting internal line detection');
      
      // If we found a grid, detect vertical lines within it
      if (result.gridFound && result.gridArea) {
        try {
          // Create a region of interest (ROI) for the grid area
          const { x, y, width, height } = result.gridArea;
          const roiRect = new cv.Rect(x, y, width, height);
          const gridROI = new cv.Mat();
          grayImage.roi(roiRect).copyTo(gridROI);

          console.log('[GridProcessing] Starting multi-step vertical line detection...');
          console.log(`[GridProcessing] Grid ROI dimensions: ${width}x${height} pixels`);
          
          // Determine image resolution category and set parameters accordingly
          const isHighRes = width > 2000 || height > 2000;
          const isMediumRes = !isHighRes && (width > 1000 || height > 1000);
          const isStandardRes = !isHighRes && !isMediumRes;
          
          const resolutionCategory = isHighRes ? 'High Resolution' : isMediumRes ? 'Medium Resolution' : 'Standard Resolution';
          console.log(`[GridProcessing] Image classification: ${resolutionCategory}`);
          
          // Resolution-aware parameter configuration
          const params = {
            // Adaptive threshold parameters
            blockSize: isHighRes ? Math.max(3, Math.min(21, Math.floor(Math.min(width, height) / 100) | 1)) : 
                      isMediumRes ? 9 : 7,
            adaptiveConstant: isHighRes ? Math.max(1, Math.floor(Math.min(width, height) / 500)) : 
                             isMediumRes ? 2 : 1,
            
            // Vertical kernel height
            verticalKernelHeight: isHighRes ? Math.max(10, Math.floor(height * 0.2)) :
                                 isMediumRes ? Math.floor(height * 0.25) : Math.floor(height * 0.3),
            
            // Hough Line parameters
            houghThreshold: isHighRes ? Math.max(3, Math.floor(height * 0.08)) :
                           isMediumRes ? Math.floor(height * 0.09) : Math.floor(height * 0.1),
            houghMinLength: isHighRes ? Math.max(10, Math.floor(height * 0.15)) :
                           isMediumRes ? Math.floor(height * 0.18) : Math.floor(height * 0.2),
            houghMaxGap: isHighRes ? Math.max(5, Math.floor(height * 0.02)) :
                        isMediumRes ? 8 : 10,
            
            // Tolerance values
            verticalLineTolerance: isHighRes ? Math.max(5, Math.floor(width * 0.005)) :
                                  isMediumRes ? 4 : 5,
            
            // Vertical line detection criteria
            maxHorizontalDeviation: isHighRes ? Math.max(10, Math.floor(width * 0.01)) :
                                   isMediumRes ? 8 : 10,
            minVerticalLength: isHighRes ? height * 0.15 :
                              isMediumRes ? height * 0.18 : height * 0.2,
            
            // Light gray detection parameters
            lightGrayMinHeight: isHighRes ? Math.max(height * 0.2, 20) :
                               isMediumRes ? height * 0.25 : height * 0.3,
            lightGrayRange: isHighRes ? [120, 220] : [140, 200],
            lightGrayMinRatio: isHighRes ? Math.max(0.25, 0.4 - 0.15) :
                              isMediumRes ? 0.35 : 0.4,
            lightGrayLineTolerance: isHighRes ? Math.max(3, Math.floor(width * 0.003)) :
                                   isMediumRes ? 3 : 3,
            lightGrayEdgeKernelHeight: isHighRes ? Math.floor(height * 0.15) :
                                      isMediumRes ? Math.floor(height * 0.18) : Math.floor(height * 0.2),
            lightGrayHoughThreshold: isHighRes ? Math.max(5, Math.floor(height * 0.08)) :
                                    isMediumRes ? Math.floor(height * 0.12) : Math.floor(height * 0.15),
            lightGrayHoughMinLength: isHighRes ? Math.max(10, Math.floor(height * 0.15)) :
                                    isMediumRes ? Math.floor(height * 0.2) : Math.floor(height * 0.25),
            lightGrayHoughMaxGap: isHighRes ? Math.max(5, Math.floor(height * 0.02)) :
                                 isMediumRes ? 6 : 8,
            lightGrayMaxHorizontalDev: isHighRes ? Math.max(5, Math.floor(width * 0.008)) :
                                      isMediumRes ? 4 : 5,
            lightGrayMinDistance: isHighRes ? Math.max(8, Math.floor(width * 0.008)) :
                                 isMediumRes ? 10 : 12,
            lightGrayEdgeMargin: isHighRes ? Math.max(5, Math.floor(width * 0.005)) :
                                isMediumRes ? 5 : 5,
            
            // Medium gray detection parameters
            mediumGrayMinHeight: isHighRes ? Math.max(height * 0.1, 15) :
                                isMediumRes ? height * 0.12 : height * 0.15,
            mediumGrayRange: [60, 180],
            mediumGrayMinRatio: isHighRes ? Math.max(0.15, 0.2 - 0.05) :
                               isMediumRes ? 0.18 : 0.2,
            mediumGrayMinConsistency: isHighRes ? Math.max(0.08, 0.1 - 0.02) :
                                     isMediumRes ? 0.09 : 0.1,
            mediumGrayMinConsecutiveRatio: isHighRes ? Math.max(0.08, 0.1 - 0.02) :
                                          isMediumRes ? 0.09 : 0.1,
            mediumGrayEdgeKernelHeight: isHighRes ? Math.max(5, Math.floor(height * 0.08)) :
                                       isMediumRes ? Math.floor(height * 0.09) : Math.floor(height * 0.1),
            mediumGrayHoughThreshold: isHighRes ? Math.max(3, Math.floor(height * 0.05)) :
                                     isMediumRes ? Math.floor(height * 0.07) : Math.floor(height * 0.08),
            mediumGrayHoughMinLength: isHighRes ? Math.max(8, Math.floor(height * 0.12)) :
                                     isMediumRes ? Math.floor(height * 0.14) : Math.floor(height * 0.15),
            mediumGrayHoughMaxGap: isHighRes ? Math.max(8, Math.floor(height * 0.03)) :
                                  isMediumRes ? 12 : 15,
            mediumGrayLineTolerance: isHighRes ? Math.max(4, Math.floor(width * 0.004)) :
                                    isMediumRes ? 4 : 5,
            mediumGrayMaxHorizontalDev: isHighRes ? Math.max(8, Math.floor(width * 0.01)) :
                                       isMediumRes ? 7 : 8,
            mediumGrayMinVerticalLength: isHighRes ? height * 0.08 :
                                        isMediumRes ? height * 0.09 : height * 0.1,
            mediumGrayMinDistance: isHighRes ? Math.max(10, Math.floor(width * 0.01)) :
                                  isMediumRes ? 12 : 15,
            mediumGrayEdgeMargin: isHighRes ? Math.max(5, Math.floor(width * 0.005)) :
                                 isMediumRes ? 5 : 5
          };

          // STEP 1: Original approach - detect black/dark lines using adaptive threshold and morphological operations
          console.log('[GridProcessing] Step 1: Detecting black/dark lines with adaptive threshold...');
          
          // Apply adaptive threshold to enhance grid lines
          const binaryLight = new cv.Mat();
          
          if (isStandardRes) {
            // Use original hardcoded parameters for standard resolution
            cv.adaptiveThreshold(
              gridROI,
              binaryLight,
              255,
              cv.ADAPTIVE_THRESH_GAUSSIAN_C,
              cv.THRESH_BINARY_INV,
              7,  // Original block size
              1   // Original constant
            );
          } else {
            // Use dynamic parameters for medium/high resolution
            cv.adaptiveThreshold(
              gridROI,
              binaryLight,
              255,
              cv.ADAPTIVE_THRESH_GAUSSIAN_C,
              cv.THRESH_BINARY_INV,
              params.blockSize,
              params.adaptiveConstant
            );
          }

          // Create a vertical kernel for detecting vertical lines
          const verticalLineKernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            isStandardRes ? 
              new cv.Size(1, Math.floor(height * 0.3)) : // Original kernel size
              new cv.Size(1, params.verticalKernelHeight)
          );

          // Create a horizontal kernel for detecting horizontal lines
          const horizontalLineKernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            isStandardRes ? 
              new cv.Size(Math.floor(width * 0.3), 1) : // Similar approach as vertical but for horizontal
              new cv.Size(params.verticalKernelHeight, 1) // Reusing the same parameter but for width
          );

          // Apply morphological operations to extract vertical lines
          const verticalLinesMat = new cv.Mat();
          cv.morphologyEx(binaryLight, verticalLinesMat, cv.MORPH_OPEN, verticalLineKernel);

          // Apply morphological operations to extract horizontal lines
          const horizontalLinesMat = new cv.Mat();
          cv.morphologyEx(binaryLight, horizontalLinesMat, cv.MORPH_OPEN, horizontalLineKernel);

          // Apply Hough Line Transform to detect vertical lines
          const verticalLines = new cv.Mat();
          
          if (isStandardRes) {
            // Use original hardcoded parameters
            cv.HoughLinesP(
              verticalLinesMat,
              verticalLines,
              1,                   // rho resolution (pixels)
              Math.PI / 180,      // theta resolution (radians)
              Math.floor(height * 0.1), // Original threshold
              Math.floor(height * 0.2), // Original minLineLength
              10                  // Original maxLineGap
            );
          } else {
            // Use dynamic parameters for medium/high resolution
            cv.HoughLinesP(
              verticalLinesMat,
              verticalLines,
              1,                   // rho resolution (pixels)
              Math.PI / 180,      // theta resolution (radians)
              params.houghThreshold,
              params.houghMinLength,
              params.houghMaxGap
            );
          }
          
          // Apply Hough Line Transform to detect horizontal lines
          const horizontalLines = new cv.Mat();
          
          if (isStandardRes) {
            // Use original hardcoded parameters adapted for horizontal lines
            cv.HoughLinesP(
              horizontalLinesMat,
              horizontalLines,
              1,                   // rho resolution (pixels)
              Math.PI / 180,      // theta resolution (radians)
              Math.floor(width * 0.1), // Threshold adapted for horizontal
              Math.floor(width * 0.2), // MinLineLength adapted for horizontal
              10                  // Original maxLineGap
            );
          } else {
            // Use dynamic parameters for medium/high resolution
            cv.HoughLinesP(
              horizontalLinesMat,
              horizontalLines,
              1,                   // rho resolution (pixels)
              Math.PI / 180,      // theta resolution (radians)
              params.houghThreshold,
              params.houghMinLength,
              params.houghMaxGap
            );
          }

          console.log(`[GridProcessing] Step 1 detected ${verticalLines.rows} potential vertical grid lines and ${horizontalLines.rows} potential horizontal grid lines`);

          // Process detected lines and add vertical lines to result
          const verticalLinePositions = [];
          const verticalLineTolerance = isStandardRes ? 5 : params.verticalLineTolerance; // Original value for standard res

          for (let i = 0; i < verticalLines.rows; i++) {
            const line = verticalLines.data32S.subarray(i * 4, (i + 1) * 4);
            const x1 = line[0] + x; // Adjust for ROI offset
            const y1 = line[1] + y;
            const x2 = line[2] + x;
            const y2 = line[3] + y;

            // Check if this is a vertical line (x1 ≈ x2)
            const dx = Math.abs(x2 - x1);
            const dy = Math.abs(y2 - y1);

            if (isStandardRes) {
              // Use original hardcoded criteria for standard resolution
              if (dx < 10 && dy > height * 0.2) {
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
            } else {

              // Use dynamic criteria for medium/high resolution
              const maxHorizontalDeviation = params.maxHorizontalDeviation;
              const minVerticalLength = params.minVerticalLength;

              if (dx < maxHorizontalDeviation && dy > minVerticalLength) {
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
          }

          // Process detected horizontal lines and add to result
          const horizontalLinePositions = [];
          const horizontalLineTolerance = isStandardRes ? 5 : params.verticalLineTolerance; // Reuse vertical tolerance

          for (let i = 0; i < horizontalLines.rows; i++) {
            const line = horizontalLines.data32S.subarray(i * 4, (i + 1) * 4);
            const x1 = line[0] + x; // Adjust for ROI offset
            const y1 = line[1] + y;
            const x2 = line[2] + x;
            const y2 = line[3] + y;

            // Check if this is a horizontal line (y1 ≈ y2)
            const dx = Math.abs(x2 - x1);
            const dy = Math.abs(y2 - y1);

            if (isStandardRes) {
              // Use criteria adapted for horizontal lines
              if (dy < 10 && dx > width * 0.2) {
                // Check if we already have a line at similar y position
                const yPosition = Math.round((y1 + y2) / 2);
                const existingLineIndex = horizontalLinePositions.findIndex(
                  pos => Math.abs(pos - yPosition) < horizontalLineTolerance
                );

                if (existingLineIndex === -1) {
                  // This is a new horizontal line
                  horizontalLinePositions.push(yPosition);

                  // Add to result with width constrained to grid area
                  result.horizontalLines.push({
                    x1: x,
                    y1: yPosition,
                    x2: x + width,
                    y2: yPosition,
                    isGridBorder: false,
                    isHorizontalGridLine: true, // Mark as a detected horizontal grid line
                    detectionMethod: 'adaptive-threshold'
                  });
                }
              }
            } else {
              // Use dynamic criteria for medium/high resolution
              if (dy < params.verticalLineTolerance && dx > width * params.houghMinLengthRatio) {
                // Check if we already have a line at similar y position
                const yPosition = Math.round((y1 + y2) / 2);
                const existingLineIndex = horizontalLinePositions.findIndex(
                  pos => Math.abs(pos - yPosition) < horizontalLineTolerance
                );

                if (existingLineIndex === -1) {
                  // This is a new horizontal line
                  horizontalLinePositions.push(yPosition);

                  // Add to result with width constrained to grid area
                  result.horizontalLines.push({
                    x1: x,
                    y1: yPosition,
                    x2: x + width,
                    y2: yPosition,
                    isGridBorder: false,
                    isHorizontalGridLine: true, // Mark as a detected horizontal grid line
                    detectionMethod: 'adaptive-threshold'
                  });
                }
              }
            }
          }

          console.log(`[GridProcessing] Detected ${result.horizontalLines.length - 2} internal horizontal grid lines`);

          // STEP 2: Supplementary detection for light gray lines using improved pixel analysis
          console.log('[GridProcessing] Step 2: Detecting light gray lines with pixel analysis...');
          
          // Get existing vertical line positions to avoid duplicates
          const existingLinePositions = result.verticalLines
            .filter(line => !line.isGridBorder)
            .map(line => line.x1 - x); // Convert back to ROI coordinates
          
          // Analyze pixel columns to find consistent vertical patterns for light gray lines
          const lightGrayPositions = [];
          
          if (isStandardRes) {
            // Use original hardcoded parameters for standard resolution
            const minLineHeight = height * 0.3; // Original minimum height
            const grayThresholdRange = [140, 200]; // Original gray values
            
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
              if (grayRatio > 0.4 && verticalGrayPixels > minLineHeight) { // Original thresholds
                lightGrayPositions.push({
                  position: col,
                  strength: grayRatio,
                  grayPixels: verticalGrayPixels
                });
              }
            }
          } else {
            // Use dynamic parameters for medium/high resolution
            const minLineHeight = params.lightGrayMinHeight;
            const grayThresholdRange = params.lightGrayRange;
            
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
              
              // Scale threshold with image size
              const grayRatio = verticalGrayPixels / totalPixels;
              const minGrayRatio = params.lightGrayMinRatio;
              
              if (grayRatio > minGrayRatio && verticalGrayPixels > minLineHeight) {
                lightGrayPositions.push({
                  position: col,
                  strength: grayRatio,
                  grayPixels: verticalGrayPixels
                });
              }
            }
          }
          
          console.log(`[GridProcessing] Found ${lightGrayPositions.length} potential light gray column positions`);
          
          // Edge detection for better line boundary detection of light gray lines
          const edges = new cv.Mat();
          cv.Canny(gridROI, edges, 30, 90, 3, false);
          
          // Apply vertical morphological operation to enhance vertical edges
          const verticalKernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            isStandardRes ?
              new cv.Size(1, Math.floor(height * 0.2)) : // Original kernel size
              new cv.Size(1, params.lightGrayEdgeKernelHeight)
          );
          
          const verticalEdges = new cv.Mat();
          cv.morphologyEx(edges, verticalEdges, cv.MORPH_OPEN, verticalKernel);
          
          // Use Hough Line Transform on edges with more precise parameters
          const edgeLines = new cv.Mat();
          
          if (isStandardRes) {
            // Use original hardcoded parameters
            cv.HoughLinesP(
              verticalEdges,
              edgeLines,
              1,                          // rho resolution
              Math.PI / 180,             // theta resolution  
              Math.floor(height * 0.15), // Original threshold
              Math.floor(height * 0.25), // Original minimum line length
              8                          // Original maximum gap
            );
          } else {
            // Use dynamic parameters for medium/high resolution
            cv.HoughLinesP(
              verticalEdges,
              edgeLines,
              1,                          // rho resolution
              Math.PI / 180,             // theta resolution  
              params.lightGrayHoughThreshold,
              params.lightGrayHoughMinLength,
              params.lightGrayHoughMaxGap
            );
          }
          
          console.log(`[GridProcessing] Edge detection found ${edgeLines.rows} potential light gray lines`);
          
          // Combine pixel analysis and edge detection for light gray lines
          const lightGrayLines = [];
          const lineTolerance = isStandardRes ? 3 : params.lightGrayLineTolerance; // Original value for standard res
          
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
            
            if (isStandardRes) {
              // Use original hardcoded criteria
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
            } else {
              // Use dynamic criteria for medium/high resolution
              const maxHorizontalDeviation = params.lightGrayMaxHorizontalDev;
              const minVerticalLength = params.minVerticalLength;
              
              if (dx < maxHorizontalDeviation && dy > minVerticalLength) {
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
          const minDistanceFromExisting = isStandardRes ? 12 : params.lightGrayMinDistance; // Original value
          
          for (const lightLine of lightGrayLines) {
            // Check if this line is too close to existing lines from Step 1
            const isNewLine = !existingLinePositions.some(pos => Math.abs(pos - lightLine.position) < minDistanceFromExisting);
            
            const edgeMargin = isStandardRes ? 5 : params.lightGrayEdgeMargin; // Original value
            
            if (isNewLine && lightLine.position > edgeMargin && lightLine.position < width - edgeMargin) {
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

          // STEP 3: Detection for medium gray lines
          console.log('[GridProcessing] Step 3: Detecting medium gray lines...');
          console.log('[GridProcessing] Using pixel-analysis-focused approach to avoid edge detection double lines');
          
          // Create a new ROI for medium gray detection
          const mediumGrayROI = new cv.Mat();
          grayImage.roi(roiRect).copyTo(mediumGrayROI);
          
          // Get existing vertical line positions to avoid duplicates
          const allExistingPositions = result.verticalLines
            .filter(line => !line.isGridBorder)
            .map(line => line.x1 - x); // Convert back to ROI coordinates
          
          // Focus on pixel analysis to find CENTER of gray columns (not edges)
          const mediumGrayPositions = [];
          
          if (isStandardRes) {
            // Use original hardcoded parameters for standard resolution
            const mediumGrayThresholdRange = [60, 180]; // Original range
            const minMediumLineHeight = height * 0.15; // Original minimum height
            
            for (let col = 0; col < width; col++) {
              let mediumGrayPixels = 0;
              let totalPixels = 0;
              let consecutiveGrayPixels = 0;
              let maxConsecutiveGray = 0;
              
              // Count medium gray pixels in this column
              for (let row = 0; row < height; row++) {
                const pixelValue = mediumGrayROI.ucharPtr(row, col)[0];
                totalPixels++;
                
                // Check if pixel is in the medium gray range
                if (pixelValue >= mediumGrayThresholdRange[0] && pixelValue <= mediumGrayThresholdRange[1]) {
                  mediumGrayPixels++;
                  consecutiveGrayPixels++;
                  maxConsecutiveGray = Math.max(maxConsecutiveGray, consecutiveGrayPixels);
                } else {
                  consecutiveGrayPixels = 0;
                }
              }
              
              // Check if this column has enough medium gray pixels and good consistency
              const grayRatio = mediumGrayPixels / totalPixels;
              const consistencyScore = maxConsecutiveGray / height;
              
              // Use original much more lenient thresholds
              if (grayRatio > 0.2 && // Original threshold
                  mediumGrayPixels > minMediumLineHeight && 
                  consistencyScore > 0.1 && // Original threshold
                  maxConsecutiveGray > height * 0.1) { // Original threshold
                mediumGrayPositions.push({
                  position: col,
                  strength: grayRatio,
                  consistency: consistencyScore,
                  maxConsecutive: maxConsecutiveGray,
                  grayPixels: mediumGrayPixels
                });
              }
            }
          } else {
            // Use dynamic parameters for medium/high resolution
            const mediumGrayThresholdRange = params.mediumGrayRange;
            const minMediumLineHeight = params.mediumGrayMinHeight;
            
            for (let col = 0; col < width; col++) {
              let mediumGrayPixels = 0;
              let totalPixels = 0;
              let consecutiveGrayPixels = 0;
              let maxConsecutiveGray = 0;
              
              // Count medium gray pixels in this column
              for (let row = 0; row < height; row++) {
                const pixelValue = mediumGrayROI.ucharPtr(row, col)[0];
                totalPixels++;
                
                // Check if pixel is in the medium gray range
                if (pixelValue >= mediumGrayThresholdRange[0] && pixelValue <= mediumGrayThresholdRange[1]) {
                  mediumGrayPixels++;
                  consecutiveGrayPixels++;
                  maxConsecutiveGray = Math.max(maxConsecutiveGray, consecutiveGrayPixels);
                } else {
                  consecutiveGrayPixels = 0;
                }
              }
              
              // Check if this column has enough medium gray pixels and good consistency
              const grayRatio = mediumGrayPixels / totalPixels;
              const consistencyScore = maxConsecutiveGray / height;
              
              // Scale thresholds with image size - more lenient for larger images
              const minGrayRatio = params.mediumGrayMinRatio;
              const minConsistency = params.mediumGrayMinConsistency;
              const minConsecutiveRatio = params.mediumGrayMinConsecutiveRatio;
              
              if (grayRatio > minGrayRatio && 
                  mediumGrayPixels > minMediumLineHeight && 
                  consistencyScore > minConsistency && 
                  maxConsecutiveGray > height * minConsecutiveRatio) {
                mediumGrayPositions.push({
                  position: col,
                  strength: grayRatio,
                  consistency: consistencyScore,
                  maxConsecutive: maxConsecutiveGray,
                  grayPixels: mediumGrayPixels
                });
              }
            }
          }
          
          console.log(`[GridProcessing] Found ${mediumGrayPositions.length} potential medium gray column positions using pixel analysis`);
          
          // Group adjacent columns into single lines and find their centers
          console.log(`[GridProcessing] Grouping adjacent columns to find center lines...`);
          
          const groupedLines = [];
          const processedColumns = new Set();
          
          // Sort positions by column number for easier grouping
          mediumGrayPositions.sort((a, b) => a.position - b.position);
          
          for (let i = 0; i < mediumGrayPositions.length; i++) {
            if (processedColumns.has(i)) continue;
            
            const startPos = mediumGrayPositions[i];
            const group = [startPos];
            processedColumns.add(i);
            
            // Find all adjacent columns that should be part of this line
            for (let j = i + 1; j < mediumGrayPositions.length; j++) {
              if (processedColumns.has(j)) continue;
              
              const nextPos = mediumGrayPositions[j];
              const lastInGroup = group[group.length - 1];
              
              // If this column is adjacent (within 2 pixels) to the last one in the group, add it
              if (Math.abs(nextPos.position - lastInGroup.position) <= 2) {
                group.push(nextPos);
                processedColumns.add(j);
              } else {
                // Gap found, stop extending this group
                break;
              }
            }
            
            // Calculate the center of this group
            const minPos = group[0].position;
            const maxPos = group[group.length - 1].position;
            const centerPos = Math.round((minPos + maxPos) / 2);
            
            // Calculate combined confidence (average of all columns in group)
            const combinedConfidence = group.reduce((sum, pos) => sum + pos.strength, 0) / group.length;
            
            groupedLines.push({
              position: centerPos,
              confidence: combinedConfidence,
              groupSize: group.length,
              minPosition: minPos,
              maxPosition: maxPos
            });
            
            console.log(`[GridProcessing] Grouped ${group.length} adjacent columns (${minPos}-${maxPos}) into center line at ${centerPos}`);
          }
          
          console.log(`[GridProcessing] Reduced ${mediumGrayPositions.length} columns to ${groupedLines.length} center lines`);
          
          // Add grouped medium gray lines that don't conflict with existing lines
          const minDistanceFromAllExisting = isStandardRes ? 15 : params.mediumGrayMinDistance; // Original value
          
          for (const groupedLine of groupedLines) {
            // Check if this line is too close to existing lines from previous steps
            const isNewLine = !allExistingPositions.some(pos => Math.abs(pos - groupedLine.position) < minDistanceFromAllExisting);
            
            const edgeMargin = isStandardRes ? 5 : params.mediumGrayEdgeMargin; // Original value
            
            if (isNewLine && groupedLine.position > edgeMargin && groupedLine.position < width - edgeMargin) {
              console.log(`[GridProcessing] Found new medium gray line at column ${groupedLine.position} (center of ${groupedLine.groupSize} columns: ${groupedLine.minPosition}-${groupedLine.maxPosition})`);
              
              // Add to result
              result.verticalLines.push({
                x1: groupedLine.position + x, // Adjust for ROI offset
                y1: y,
                x2: groupedLine.position + x,
                y2: y + height,
                isGridBorder: false,
                isVerticalGridLine: true,
                detectionMethod: 'medium-gray-pixel-analysis-grouped',
                confidence: groupedLine.confidence
              });
            }
          }

          console.log(`[GridProcessing] Total internal vertical lines detected: ${result.verticalLines.filter(line => !line.isGridBorder).length}`);

          // Clean up all resources
          gridROI.delete();
          binaryLight.delete();
          verticalLinesMat.delete();
          verticalLineKernel.delete();
          lines.delete();
          edges.delete();
          verticalKernel.delete();
          verticalEdges.delete();
          edgeLines.delete();
          mediumGrayROI.delete();

        } catch (roiError) {
          console.warn('[GridProcessing] Error in ROI processing:', roiError);
          // Continue without internal line detection
        }
      }
    }

    // Clean up resources
    try {
      binary.delete();
      horizontalKernel.delete();
      verticalKernel.delete();
      verticalLinesMat.delete();
      horizontalLinesMat.delete();
      verticalLines.delete();
      horizontalLines.delete();
      gridStructure.delete();
      morphedGrid.delete();
      closeKernel.delete();
      contours.delete();
      hierarchy.delete();
    } catch (cleanupError) {
      console.warn('[GridProcessing] Error during cleanup:', cleanupError);
    }

    console.log('[GridProcessing] Grid detection completed successfully');
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
      // Draw horizontal lines - red for detected grid lines, green for border
      if (horizontalLines && horizontalLines.length > 0) {
        for (const line of horizontalLines) {
          const pt1 = new cv.Point(line.x1, line.y1);
          const pt2 = new cv.Point(line.x2, line.y2);
          
          // Use red for detected horizontal grid lines, green for border lines
          const lineColor = line.isHorizontalGridLine ? new cv.Scalar(255, 0, 0, 255) : greenColor;
          cv.line(image, pt1, pt2, lineColor, thickness);
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