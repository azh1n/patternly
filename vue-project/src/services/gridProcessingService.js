/**
 * Grid Processing Service
 * Provides functions for detecting and processing grid patterns in images
 */
import { findPeaks, computeMedianSpacing, interpolateMissingLines, scoreLineConfidence, deduplicateLines, filterComponentsByArea, buildCellGrid } from '@/utils/gridAnalysis';

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
  /**
   * @param {Object} cv - OpenCV instance
   * @param {cv.Mat} grayImage - Grayscale image as OpenCV Mat
   * @param {Object} [options]
   * @param {boolean} [options.assumeFullGrid] - Skip border detection and treat the entire image as the grid ROI (used for tiled processing)
   */
  const detectGrid = (cv, grayImage, options = {}) => {

    // Wrap the detection in a timeout to prevent hanging
    return new Promise((resolve, reject) => {
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
        const result = detectGridSync(cv, grayImage, options);
        clearTimeout(timeout);
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
   * Computes the deskew angle from a contour using minAreaRect.
   * Returns the angle in degrees needed to straighten the image,
   * or 0 if the image is already aligned (below threshold).
   * OpenCV's minAreaRect returns angles in [-90, 0).
   */
  const computeDeskewAngle = (cv, contour) => {
    // Only trust minAreaRect angle if the contour is sufficiently rectangular.
    // Non-rectangular contours (jagged edges, merged fragments) produce misleading angles.
    const contourArea = cv.contourArea(contour);
    const boundingRect = cv.boundingRect(contour);
    const boundingArea = boundingRect.width * boundingRect.height;
    const rectangularity = boundingArea > 0 ? contourArea / boundingArea : 0;

    if (rectangularity < 0.7) {
      return 0;
    }

    const rotatedRect = cv.minAreaRect(contour);
    let angle = rotatedRect.angle;

    // OpenCV minAreaRect angle convention:
    // Returns angle in [-90, 0). We need to normalize:
    // - Angle near 0 or near -90 means nearly aligned
    // - Angle near -45 means ~45 degree rotation
    if (angle < -45) {
      angle = 90 + angle; // Convert to positive small angle
    }

    // Clamp to ±15 degrees — beyond that, contour detection itself is unreliable
    angle = Math.max(-15, Math.min(15, angle));

    // Below 0.5 degrees, don't bother deskewing (avoids interpolation artifacts)
    if (Math.abs(angle) < 0.5) {
      return 0;
    }

    return angle;
  };

  /**
   * Applies rotation correction to a grayscale image.
   * Returns the deskewed image (caller must delete it).
   */
  const deskewImage = (cv, grayImage, angleDegrees) => {
    const center = new cv.Point(grayImage.cols / 2, grayImage.rows / 2);
    const rotationMatrix = cv.getRotationMatrix2D(center, angleDegrees, 1.0);
    const deskewed = new cv.Mat();
    cv.warpAffine(
      grayImage,
      deskewed,
      rotationMatrix,
      new cv.Size(grayImage.cols, grayImage.rows),
      cv.INTER_LINEAR,
      cv.BORDER_REPLICATE
    );
    rotationMatrix.delete();
    return deskewed;
  };

  /**
   * Synchronous grid detection function (wrapped by timeout)
   */
  const detectGridSync = (cv, grayImage, options = {}) => {
    // Create result object
    const result = {
      horizontalLines: [],
      verticalLines: [],
      cells: [],
      gridFound: false
    };

    // Deskewed image reference (set later if rotation correction is needed)
    let deskewedImage = null;

    // Mats used by the border detection path (declared here so cleanup works for both paths)
    let binary = null;
    let horizontalKernel = null;
    let verticalKernel = null;
    let horizontalLines = null;
    let verticalLinesMat = null;
    let gridStructure = null;
    let morphedGrid = null;
    let closeKernel = null;
    let contours = null;
    let hierarchy = null;

    if (options.assumeFullGrid) {
      // ── TILE MODE: skip border detection, treat entire image as grid ──
      result.gridFound = true;
      result.gridArea = {
        x: 0,
        y: 0,
        width: grayImage.cols,
        height: grayImage.rows
      };

      // Add border lines at image edges
      result.horizontalLines.push(
        { x1: 0, y1: 0, x2: grayImage.cols, y2: 0, isGridBorder: true },
        { x1: 0, y1: grayImage.rows, x2: grayImage.cols, y2: grayImage.rows, isGridBorder: true }
      );
      result.verticalLines.push(
        { x1: 0, y1: 0, x2: 0, y2: grayImage.rows, isGridBorder: true },
        { x1: grayImage.cols, y1: 0, x2: grayImage.cols, y2: grayImage.rows, isGridBorder: true }
      );

    } else {
      // ── NORMAL MODE: detect grid border via contours ──

      // Step 1: Apply adaptive threshold to enhance grid lines
      binary = new cv.Mat();
      cv.adaptiveThreshold(
        grayImage,
        binary,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        11,  // Block size
        2    // Constant subtracted from mean
      );

      // Step 2: Find grid patterns by detecting regular patterns of lines (SIMPLIFIED)
      const horizontalKernelSize = new cv.Size(Math.floor(grayImage.cols * 0.1), 1);
      const verticalKernelSize = new cv.Size(1, Math.floor(grayImage.rows * 0.1));

      horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, horizontalKernelSize);
      verticalKernel = cv.getStructuringElement(cv.MORPH_RECT, verticalKernelSize);

      horizontalLines = new cv.Mat();
      verticalLinesMat = new cv.Mat();

      cv.morphologyEx(binary, horizontalLines, cv.MORPH_OPEN, horizontalKernel);
      cv.morphologyEx(binary, verticalLinesMat, cv.MORPH_OPEN, verticalKernel);

      gridStructure = new cv.Mat();
      cv.add(horizontalLines, verticalLinesMat, gridStructure);

      morphedGrid = new cv.Mat();
      closeKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.morphologyEx(gridStructure, morphedGrid, cv.MORPH_CLOSE, closeKernel);

      // Step 3: Find contours to detect the grid structure
      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(morphedGrid, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let maxGridScore = 0;
      let maxContourIndex = -1;

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);

        if (area < (grayImage.cols * grayImage.rows * 0.05)) {
          continue;
        }

        const rect = cv.boundingRect(contour);
        const rectArea = rect.width * rect.height;
        const rectangularity = area / rectArea;
        const aspectRatio = Math.max(rect.width / rect.height, rect.height / rect.width);
        const gridScore = area * rectangularity * (1 / aspectRatio);

        if (gridScore > maxGridScore) {
          maxGridScore = gridScore;
          maxContourIndex = i;
        }
      }

      if (maxContourIndex >= 0) {
        result.gridFound = true;
        const gridContour = contours.get(maxContourIndex);
        const rect = cv.boundingRect(gridContour);

        result.gridArea = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        };

        result.horizontalLines.push(
          { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y, isGridBorder: true },
          { x1: rect.x, y1: rect.y + rect.height, x2: rect.x + rect.width, y2: rect.y + rect.height, isGridBorder: true }
        );
        result.verticalLines.push(
          { x1: rect.x, y1: rect.y, x2: rect.x, y2: rect.y + rect.height, isGridBorder: true },
          { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height, isGridBorder: true }
        );


        // Deskew: check if the grid contour is rotated and straighten the image
        const deskewAngle = computeDeskewAngle(cv, gridContour);
        if (deskewAngle !== 0) {
          deskewedImage = deskewImage(cv, grayImage, deskewAngle);
        } else {
        }
      }
    }

    // Internal line detection (runs for both normal and tile mode when grid is found)
    if (result.gridFound && result.gridArea) {
      let workingImage = deskewedImage || grayImage;
        try {
          // Create a region of interest (ROI) for the grid area
          const { x, y, width, height } = result.gridArea;
          const roiRect = new cv.Rect(x, y, width, height);
          const gridROI = new cv.Mat();
          workingImage.roi(roiRect).copyTo(gridROI);

          
          // Determine image resolution category and set parameters accordingly
          const isHighRes = width > 2000 || height > 2000;
          const isMediumRes = !isHighRes && (width > 1000 || height > 1000);
          const isStandardRes = !isHighRes && !isMediumRes;
          
          const resolutionCategory = isHighRes ? 'High Resolution' : isMediumRes ? 'Medium Resolution' : 'Standard Resolution';
          
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
              if (dy < params.verticalLineTolerance && dx > params.houghMinLength) {
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


          // STEP 2: Supplementary detection for light gray lines using improved pixel analysis
          
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
          
          
          // Edge detection for better line boundary detection of light gray lines
          // Use adaptive Canny thresholds derived from image brightness
          const roiMean = cv.mean(gridROI);
          const roiMedian = roiMean[0]; // grayscale mean as proxy for median
          const cannyLower = Math.max(0, Math.floor(0.67 * roiMedian));
          const cannyUpper = Math.min(255, Math.floor(1.33 * roiMedian));
          const edges = new cv.Mat();
          cv.Canny(gridROI, edges, cannyLower, cannyUpper, 3, false);
          
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
          
          
          // Group adjacent columns into single lines and find their centers
          
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
            
          }
          
          
          // Add grouped medium gray lines that don't conflict with existing lines
          const minDistanceFromAllExisting = isStandardRes ? 15 : params.mediumGrayMinDistance; // Original value
          
          for (const groupedLine of groupedLines) {
            // Check if this line is too close to existing lines from previous steps
            const isNewLine = !allExistingPositions.some(pos => Math.abs(pos - groupedLine.position) < minDistanceFromAllExisting);
            
            const edgeMargin = isStandardRes ? 5 : params.mediumGrayEdgeMargin; // Original value
            
            if (isNewLine && groupedLine.position > edgeMargin && groupedLine.position < width - edgeMargin) {
              
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


          // STEP 3b: Horizontal medium gray line detection via row-wise pixel scanning
          // Mirrors the vertical column scan from Step 3 but scans rows instead of columns.

          const horizontalGrayPositions = [];

          if (isStandardRes) {
            const hGrayRange = [60, 180];
            const minHLineWidth = width * 0.15;

            for (let row = 0; row < height; row++) {
              let grayPixels = 0;
              let totalPixels = 0;
              let consecutiveGray = 0;
              let maxConsecutiveGray = 0;

              for (let col = 0; col < width; col++) {
                const pixelValue = gridROI.ucharPtr(row, col)[0];
                totalPixels++;

                if (pixelValue >= hGrayRange[0] && pixelValue <= hGrayRange[1]) {
                  grayPixels++;
                  consecutiveGray++;
                  maxConsecutiveGray = Math.max(maxConsecutiveGray, consecutiveGray);
                } else {
                  consecutiveGray = 0;
                }
              }

              const grayRatio = grayPixels / totalPixels;
              const consistencyScore = maxConsecutiveGray / width;

              if (grayRatio > 0.2 && grayPixels > minHLineWidth &&
                  consistencyScore > 0.1 && maxConsecutiveGray > width * 0.1) {
                horizontalGrayPositions.push({
                  position: row,
                  strength: grayRatio,
                  consistency: consistencyScore,
                  maxConsecutive: maxConsecutiveGray,
                  grayPixels: grayPixels
                });
              }
            }
          } else {
            const hGrayRange = params.mediumGrayRange;
            const minHLineWidth = params.mediumGrayMinHeight; // reuse same scale factor

            for (let row = 0; row < height; row++) {
              let grayPixels = 0;
              let totalPixels = 0;
              let consecutiveGray = 0;
              let maxConsecutiveGray = 0;

              for (let col = 0; col < width; col++) {
                const pixelValue = gridROI.ucharPtr(row, col)[0];
                totalPixels++;

                if (pixelValue >= hGrayRange[0] && pixelValue <= hGrayRange[1]) {
                  grayPixels++;
                  consecutiveGray++;
                  maxConsecutiveGray = Math.max(maxConsecutiveGray, consecutiveGray);
                } else {
                  consecutiveGray = 0;
                }
              }

              const grayRatio = grayPixels / totalPixels;
              const consistencyScore = maxConsecutiveGray / width;
              const minGrayRatio = params.mediumGrayMinRatio;
              const minConsistency = params.mediumGrayMinConsistency;
              const minConsecutiveRatio = params.mediumGrayMinConsecutiveRatio;

              if (grayRatio > minGrayRatio && grayPixels > minHLineWidth &&
                  consistencyScore > minConsistency && maxConsecutiveGray > width * minConsecutiveRatio) {
                horizontalGrayPositions.push({
                  position: row,
                  strength: grayRatio,
                  consistency: consistencyScore,
                  maxConsecutive: maxConsecutiveGray,
                  grayPixels: grayPixels
                });
              }
            }
          }


          // Group adjacent rows into single lines and find their centers
          const hGroupedLines = [];
          const hProcessedRows = new Set();

          horizontalGrayPositions.sort((a, b) => a.position - b.position);

          for (let i = 0; i < horizontalGrayPositions.length; i++) {
            if (hProcessedRows.has(i)) continue;

            const startPos = horizontalGrayPositions[i];
            const group = [startPos];
            hProcessedRows.add(i);

            for (let j = i + 1; j < horizontalGrayPositions.length; j++) {
              if (hProcessedRows.has(j)) continue;

              const nextPos = horizontalGrayPositions[j];
              const lastInGroup = group[group.length - 1];

              if (Math.abs(nextPos.position - lastInGroup.position) <= 2) {
                group.push(nextPos);
                hProcessedRows.add(j);
              } else {
                break;
              }
            }

            const minPos = group[0].position;
            const maxPos = group[group.length - 1].position;
            const centerPos = Math.round((minPos + maxPos) / 2);
            const combinedConfidence = group.reduce((sum, pos) => sum + pos.strength, 0) / group.length;

            hGroupedLines.push({
              position: centerPos,
              confidence: combinedConfidence,
              groupSize: group.length,
              minPosition: minPos,
              maxPosition: maxPos
            });
          }


          // Add horizontal lines that don't conflict with existing ones
          const existingHPositions = result.horizontalLines
            .filter(line => !line.isGridBorder)
            .map(line => line.y1 - y);
          const hMinDistance = isStandardRes ? 3 : params.mediumGrayMinDistance;
          const hEdgeMargin = isStandardRes ? 5 : params.mediumGrayEdgeMargin;

          for (const groupedLine of hGroupedLines) {
            const isNewLine = !existingHPositions.some(pos => Math.abs(pos - groupedLine.position) < hMinDistance);

            if (isNewLine && groupedLine.position > hEdgeMargin && groupedLine.position < height - hEdgeMargin) {
              result.horizontalLines.push({
                x1: x,
                y1: groupedLine.position + y,
                x2: x + width,
                y2: groupedLine.position + y,
                isGridBorder: false,
                isHorizontalGridLine: true,
                detectionMethod: 'medium-gray-pixel-analysis-grouped',
                confidence: groupedLine.confidence
              });
            }
          }


          // STEP 4: Projection profile analysis + regularity enforcement
          // Use morphologically-filtered images (which isolate long lines and suppress content)
          // for projection profiles, then use median spacing to interpolate missing lines.

          // Compute projection profiles on morphologically-filtered images (not raw binary)
          // verticalLinesMat has vertical lines isolated, horizontalLinesMat has horizontal lines isolated
          const verticalProjection = new cv.Mat();
          cv.reduce(verticalLinesMat, verticalProjection, 0, cv.REDUCE_SUM, cv.CV_32S);

          const horizontalProjection = new cv.Mat();
          cv.reduce(horizontalLinesMat, horizontalProjection, 1, cv.REDUCE_SUM, cv.CV_32S);

          // Extract profiles as plain arrays for pure-function analysis
          const vProfile = [];
          for (let col = 0; col < verticalProjection.cols; col++) {
            vProfile.push(verticalProjection.intAt(0, col));
          }
          const hProfile = [];
          for (let row = 0; row < horizontalProjection.rows; row++) {
            hProfile.push(horizontalProjection.intAt(row, 0));
          }

          // Find peaks in the projection profiles
          const vPeaks = findPeaks(vProfile, 0.25);
          const hPeaks = findPeaks(hProfile, 0.25);

          // Get existing detected line positions (ROI-relative)
          const existingVerticalPositions = result.verticalLines
            .filter(l => !l.isGridBorder)
            .map(l => l.x1 - x)
            .sort((a, b) => a - b);
          const existingHorizontalPositions = result.horizontalLines
            .filter(l => !l.isGridBorder)
            .map(l => l.y1 - y)
            .sort((a, b) => a - b);

          const vPeakPositions = vPeaks.map(p => p.index);
          const hPeakPositions = hPeaks.map(p => p.index);

          // Compute median spacing primarily from detected line positions (ground truth from Steps 1-3).
          // Fall back to projection peaks only if detection found too few lines.
          let medianVerticalSpacing = computeMedianSpacing(existingVerticalPositions);
          let medianHorizontalSpacing = computeMedianSpacing(existingHorizontalPositions);

          // If detection found fewer than 3 lines, use projection peaks as fallback
          if (existingVerticalPositions.length < 3 && vPeakPositions.length >= 3) {
            medianVerticalSpacing = computeMedianSpacing(vPeakPositions);
          }
          if (existingHorizontalPositions.length < 3 && hPeakPositions.length >= 3) {
            medianHorizontalSpacing = computeMedianSpacing(hPeakPositions);
          }


          // Interpolate missing vertical lines using detected positions (not noisy peaks)
          if (medianVerticalSpacing > 0 && existingVerticalPositions.length >= 2) {
            const interpolated = interpolateMissingLines(existingVerticalPositions, medianVerticalSpacing, 0.25);
            const newPositions = interpolated.filter(
              pos => !existingVerticalPositions.some(existing => Math.abs(existing - pos) < medianVerticalSpacing * 0.2)
            );

            for (const pos of newPositions) {
              if (pos > 5 && pos < width - 5) {
                result.verticalLines.push({
                  x1: pos + x,
                  y1: y,
                  x2: pos + x,
                  y2: y + height,
                  isGridBorder: false,
                  isVerticalGridLine: true,
                  detectionMethod: 'projection-interpolated',
                  confidence: scoreLineConfidence({ interpolated: true })
                });
              }
            }
          }

          // Interpolate missing horizontal lines using detected positions (not noisy peaks)
          if (medianHorizontalSpacing > 0 && existingHorizontalPositions.length >= 2) {
            const interpolated = interpolateMissingLines(existingHorizontalPositions, medianHorizontalSpacing, 0.25);
            const newPositions = interpolated.filter(
              pos => !existingHorizontalPositions.some(existing => Math.abs(existing - pos) < medianHorizontalSpacing * 0.2)
            );

            for (const pos of newPositions) {
              if (pos > 5 && pos < height - 5) {
                result.horizontalLines.push({
                  x1: x,
                  y1: pos + y,
                  x2: x + width,
                  y2: pos + y,
                  isGridBorder: false,
                  isHorizontalGridLine: true,
                  detectionMethod: 'projection-interpolated',
                  confidence: scoreLineConfidence({ interpolated: true })
                });
              }
            }
          }

          // Update confidence scores on existing lines based on projection support
          const projectionTolerance = Math.max(3, Math.floor(medianVerticalSpacing * 0.1));
          for (const line of result.verticalLines) {
            if (line.isGridBorder || line.detectionMethod === 'projection-interpolated') continue;
            const roiPos = line.x1 - x;
            const hasProjectionSupport = vPeakPositions.some(p => Math.abs(p - roiPos) <= projectionTolerance);
            const sources = {
              hough: line.detectionMethod === 'adaptive-threshold',
              projection: hasProjectionSupport,
              pixelScan: line.detectionMethod === 'light-gray-analysis' || line.detectionMethod === 'medium-gray-pixel-analysis-grouped'
            };
            line.confidence = scoreLineConfidence(sources);
          }
          for (const line of result.horizontalLines) {
            if (line.isGridBorder || line.detectionMethod === 'projection-interpolated') continue;
            const roiPos = line.y1 - y;
            const hasProjectionSupport = hPeakPositions.some(p => Math.abs(p - roiPos) <= projectionTolerance);
            const sources = {
              hough: line.detectionMethod === 'adaptive-threshold',
              projection: hasProjectionSupport,
              pixelScan: line.detectionMethod === 'medium-gray-pixel-analysis-grouped'
            };
            line.confidence = scoreLineConfidence(sources);
          }

          // Store median spacing for downstream use (cell extraction)
          result.medianCellWidth = medianVerticalSpacing;
          result.medianCellHeight = medianHorizontalSpacing;

          const totalVertical = result.verticalLines.filter(l => !l.isGridBorder).length;
          const totalHorizontal = result.horizontalLines.filter(l => !l.isGridBorder).length;

          // Clean up projection Mats
          verticalProjection.delete();
          horizontalProjection.delete();

          // STEP 5: Connected component fallback
          // If line detection found significantly fewer lines than expected, try detecting
          // cells directly via connected components as an alternative strategy.
          if (medianVerticalSpacing > 0 && medianHorizontalSpacing > 0) {
            const expectedCols = Math.round(width / medianVerticalSpacing);
            const expectedRows = Math.round(height / medianHorizontalSpacing);
            const detectedCols = result.verticalLines.filter(l => !l.isGridBorder).length;
            const detectedRows = result.horizontalLines.filter(l => !l.isGridBorder).length;
            const colRatio = expectedCols > 0 ? detectedCols / expectedCols : 1;
            const rowRatio = expectedRows > 0 ? detectedRows / expectedRows : 1;

            if (colRatio < 0.7 || rowRatio < 0.7) {

              try {
                // Close small gaps in grid lines
                const ccCloseKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
                const ccClosed = new cv.Mat();
                cv.morphologyEx(binaryLight, ccClosed, cv.MORPH_CLOSE, ccCloseKernel);

                // Invert so cells become white blobs on black background
                const ccInverted = new cv.Mat();
                cv.bitwise_not(ccClosed, ccInverted);

                // Find connected components
                const labels = new cv.Mat();
                const stats = new cv.Mat();
                const centroids = new cv.Mat();
                const numComponents = cv.connectedComponentsWithStats(ccInverted, labels, stats, centroids);

                // Extract component stats into plain objects
                const expectedCellArea = medianVerticalSpacing * medianHorizontalSpacing;
                const componentStats = [];
                for (let i = 1; i < numComponents; i++) { // Skip background (0)
                  componentStats.push({
                    area: stats.intAt(i, cv.CC_STAT_AREA),
                    x: stats.intAt(i, cv.CC_STAT_LEFT),
                    y: stats.intAt(i, cv.CC_STAT_TOP),
                    width: stats.intAt(i, cv.CC_STAT_WIDTH),
                    height: stats.intAt(i, cv.CC_STAT_HEIGHT)
                  });
                }

                // Filter to cell-sized components
                const validCells = filterComponentsByArea(componentStats, expectedCellArea, 0.5);

                if (validCells.length > 0) {
                  // Derive line positions from cell boundaries
                  const ccVerticalEdges = new Set();
                  const ccHorizontalEdges = new Set();
                  for (const cell of validCells) {
                    ccVerticalEdges.add(cell.x);
                    ccVerticalEdges.add(cell.x + cell.width);
                    ccHorizontalEdges.add(cell.y);
                    ccHorizontalEdges.add(cell.y + cell.height);
                  }

                  // Add CC-derived lines that don't conflict with existing ones
                  const existingVSet = result.verticalLines.map(l => l.x1 - x);
                  const existingHSet = result.horizontalLines.map(l => l.y1 - y);
                  const ccMinDistance = Math.max(5, medianVerticalSpacing * 0.2);

                  for (const vEdge of ccVerticalEdges) {
                    const isNew = !existingVSet.some(pos => Math.abs(pos - vEdge) < ccMinDistance);
                    if (isNew && vEdge > 5 && vEdge < width - 5) {
                      result.verticalLines.push({
                        x1: vEdge + x,
                        y1: y,
                        x2: vEdge + x,
                        y2: y + height,
                        isGridBorder: false,
                        isVerticalGridLine: true,
                        detectionMethod: 'connected-component',
                        confidence: 0.5
                      });
                    }
                  }

                  for (const hEdge of ccHorizontalEdges) {
                    const isNew = !existingHSet.some(pos => Math.abs(pos - hEdge) < ccMinDistance);
                    if (isNew && hEdge > 5 && hEdge < height - 5) {
                      result.horizontalLines.push({
                        x1: x,
                        y1: hEdge + y,
                        x2: x + width,
                        y2: hEdge + y,
                        isGridBorder: false,
                        isHorizontalGridLine: true,
                        detectionMethod: 'connected-component',
                        confidence: 0.5
                      });
                    }
                  }

                  const ccVerticalAdded = result.verticalLines.filter(l => l.detectionMethod === 'connected-component').length;
                  const ccHorizontalAdded = result.horizontalLines.filter(l => l.detectionMethod === 'connected-component').length;
                }

                // Clean up CC Mats
                ccCloseKernel.delete();
                ccClosed.delete();
                ccInverted.delete();
                labels.delete();
                stats.delete();
                centroids.delete();
              } catch (ccError) {
                console.warn('[GridProcessing] Connected component fallback failed:', ccError);
              }
            } else {
            }
          }

          // Clean up all resources
          gridROI.delete();
          binaryLight.delete();
          verticalLinesMat.delete();
          verticalLineKernel.delete();
          horizontalLineKernel.delete();
          horizontalLinesMat.delete();
          verticalLines.delete();
          horizontalLines.delete();
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

    // Clean up resources (only delete Mats that were created)
    try {
      if (binary) binary.delete();
      if (horizontalKernel) horizontalKernel.delete();
      if (verticalKernel) verticalKernel.delete();
      if (verticalLinesMat) verticalLinesMat.delete();
      if (horizontalLines) horizontalLines.delete();
      if (gridStructure) gridStructure.delete();
      if (morphedGrid) morphedGrid.delete();
      if (closeKernel) closeKernel.delete();
      if (contours) contours.delete();
      if (hierarchy) hierarchy.delete();
      if (deskewedImage) deskewedImage.delete();
    } catch (cleanupError) {
      console.warn('[GridProcessing] Error during cleanup:', cleanupError);
    }

    return result;
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
   * Extracts individual cells from the grid using detected line positions.
   * Uses buildCellGrid for coordinate math, then extracts each cell as an OpenCV ROI.
   *
   * @param {Object} cv - OpenCV instance
   * @param {cv.Mat} image - Source image
   * @param {Object} gridResult - Grid detection result with lines and medianCellWidth/Height
   * @returns {{ cells: Array, gridDimensions: Object }} Structured cell data
   */
  const extractGridCells = (cv, image, gridResult) => {
    const emptyResult = { cells: [], gridDimensions: null };

    if (!gridResult.gridFound ||
      !gridResult.horizontalLines || gridResult.horizontalLines.length < 2 ||
      !gridResult.verticalLines || gridResult.verticalLines.length < 2) {
      return emptyResult;
    }

    try {
      // Sort and deduplicate horizontal lines by y-position
      const hLines = deduplicateLines(
        gridResult.horizontalLines
          .map(l => ({ position: l.y1, confidence: l.confidence ?? 1, isGridBorder: l.isGridBorder }))
          .sort((a, b) => a.position - b.position),
        Math.max(3, (gridResult.medianCellHeight || 10) * 0.15)
      );

      // Sort and deduplicate vertical lines by x-position
      const vLines = deduplicateLines(
        gridResult.verticalLines
          .map(l => ({ position: l.x1, confidence: l.confidence ?? 1, isGridBorder: l.isGridBorder }))
          .sort((a, b) => a.position - b.position),
        Math.max(3, (gridResult.medianCellWidth || 10) * 0.15)
      );

      if (hLines.length < 2 || vLines.length < 2) return emptyResult;

      const medianW = gridResult.medianCellWidth || computeMedianSpacing(vLines.map(l => l.position));
      const medianH = gridResult.medianCellHeight || computeMedianSpacing(hLines.map(l => l.position));

      if (medianW <= 0 || medianH <= 0) return emptyResult;

      // Use pure function to compute cell coordinates
      const cellCoords = buildCellGrid(hLines, vLines, medianW, medianH);


      // Extract each cell as an OpenCV ROI
      const cells = [];
      for (const coord of cellCoords) {
        // Clamp to image bounds
        const cx = Math.max(0, Math.min(coord.x, image.cols - 1));
        const cy = Math.max(0, Math.min(coord.y, image.rows - 1));
        const cw = Math.min(coord.width, image.cols - cx);
        const ch = Math.min(coord.height, image.rows - cy);

        if (cw > 0 && ch > 0) {
          const rect = new cv.Rect(cx, cy, cw, ch);
          const cellMat = new cv.Mat();
          image.roi(rect).copyTo(cellMat);

          cells.push({
            image: cellMat,
            row: coord.row,
            col: coord.col,
            x: cx,
            y: cy,
            width: cw,
            height: ch,
            confidence: coord.confidence
          });
        }
      }

      const gridDimensions = {
        rows: hLines.length - 1,
        cols: vLines.length - 1,
        cellWidth: medianW,
        cellHeight: medianH
      };


      return { cells, gridDimensions };
    } catch (error) {
      console.error('[GridProcessing] Error extracting grid cells:', error);
      return emptyResult;
    }
  };

  return {
    detectGrid,
    drawGridLines,
    extractGridCells,
    cleanup
  };
}