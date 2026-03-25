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
   * Attempts border detection at a given morphological kernel scale.
   * Returns { found, gridContour, binary, ...mats, cleanup } on success,
   * or { found: false, cleanup } on failure (cleanup frees all allocated Mats).
   */
  const attemptBorderDetection = (cv, grayImage, kernelScale, minAreaFraction = 0.05) => {
    // console.log(`[GridProcessing] Attempting border detection at ${(kernelScale * 100).toFixed(0)}% kernel scale (${Math.floor(grayImage.cols * kernelScale)}x1 horizontal, 1x${Math.floor(grayImage.rows * kernelScale)} vertical), minArea=${(minAreaFraction * 100).toFixed(1)}%`);
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

    const cleanup = () => {
      try {
        if (binary) binary.delete();
        if (horizontalKernel) horizontalKernel.delete();
        if (verticalKernel) verticalKernel.delete();
        if (horizontalLines) horizontalLines.delete();
        if (verticalLinesMat) verticalLinesMat.delete();
        if (gridStructure) gridStructure.delete();
        if (morphedGrid) morphedGrid.delete();
        if (closeKernel) closeKernel.delete();
        if (contours) contours.delete();
        if (hierarchy) hierarchy.delete();
      } catch (e) {
        console.warn('[GridProcessing] Error cleaning up border detection Mats:', e);
      }
    };

    // Adaptive threshold to enhance grid lines
    binary = new cv.Mat();
    cv.adaptiveThreshold(
      grayImage,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      11,
      2
    );

    // Morphological open with scale-dependent kernels
    const hKernelWidth = Math.max(1, Math.floor(grayImage.cols * kernelScale));
    const vKernelHeight = Math.max(1, Math.floor(grayImage.rows * kernelScale));

    horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(hKernelWidth, 1));
    verticalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, vKernelHeight));

    horizontalLines = new cv.Mat();
    verticalLinesMat = new cv.Mat();

    cv.morphologyEx(binary, horizontalLines, cv.MORPH_OPEN, horizontalKernel);
    cv.morphologyEx(binary, verticalLinesMat, cv.MORPH_OPEN, verticalKernel);

    gridStructure = new cv.Mat();
    cv.add(horizontalLines, verticalLinesMat, gridStructure);

    morphedGrid = new cv.Mat();
    closeKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(gridStructure, morphedGrid, cv.MORPH_CLOSE, closeKernel);

    // Find contours and score them
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(morphedGrid, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    // console.log(`[GridProcessing] Border detection (${(kernelScale * 100).toFixed(0)}%): found ${contours.size()} contours`);

    let maxGridScore = 0;
    let maxContourIndex = -1;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      if (area < (grayImage.cols * grayImage.rows * minAreaFraction)) {
        continue;
      }

      const rect = cv.boundingRect(contour);
      const rectArea = rect.width * rect.height;
      const rectangularity = area / rectArea;

      // A grid border should be a proper rectangle, not a jagged fragment
      if (rectangularity < 0.5) {
        // console.log(`[GridProcessing] Border detection (${(kernelScale * 100).toFixed(0)}%): contour ${i} — SKIPPED (rectangularity ${rectangularity.toFixed(2)} < 0.5), rect=${rect.width}x${rect.height} at (${rect.x},${rect.y})`);
        continue;
      }

      const aspectRatio = Math.max(rect.width / rect.height, rect.height / rect.width);
      const gridScore = area * rectangularity * (1 / aspectRatio);
      // console.log(`[GridProcessing] Border detection (${(kernelScale * 100).toFixed(0)}%): contour ${i} — area=${area.toFixed(0)}, rect=${rect.width}x${rect.height} at (${rect.x},${rect.y}), rectangularity=${rectangularity.toFixed(2)}, aspect=${aspectRatio.toFixed(2)}, score=${gridScore.toFixed(0)}`);

      if (gridScore > maxGridScore) {
        maxGridScore = gridScore;
        maxContourIndex = i;
      }
    }

    if (maxContourIndex >= 0) {
      const winRect = cv.boundingRect(contours.get(maxContourIndex));
      // console.log(`[GridProcessing] Border detection (${(kernelScale * 100).toFixed(0)}%): SUCCESS — grid border at (${winRect.x},${winRect.y}) ${winRect.width}x${winRect.height}`);
      return {
        found: true,
        gridContour: contours.get(maxContourIndex),
        binary,
        horizontalKernel,
        verticalKernel,
        horizontalLines,
        verticalLinesMat,
        gridStructure,
        morphedGrid,
        closeKernel,
        contours,
        hierarchy,
        cleanup
      };
    }

    // console.log(`[GridProcessing] Border detection (${(kernelScale * 100).toFixed(0)}%): FAILED — no qualifying contour found`);
    return { found: false, cleanup };
  };

  /**
   * Fallback border detection via contour clustering.
   * Instead of morphological line isolation (which requires knowing the right kernel scale),
   * this finds small rectangular contours on the binary image and clusters them spatially.
   * A crochet chart grid produces a dense cluster of uniformly-sized rectangles — the
   * bounding box of that cluster is the grid border.
   *
   * Returns { found, gridArea } or { found: false }.
   */
  const detectBorderViaContourClustering = (cv, grayImage) => {
    // console.log(`[GridProcessing] Contour clustering: starting on ${grayImage.cols}x${grayImage.rows} image`);
    let binary = null;
    let contours = null;
    let hierarchy = null;

    try {
      // Adaptive threshold — same as morph-based path
      binary = new cv.Mat();
      cv.adaptiveThreshold(
        grayImage, binary, 255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV,
        11, 2
      );

      // Find all contours directly (no morphological filtering)
      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(binary, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      // console.log(`[GridProcessing] Contour clustering: found ${contours.size()} total contours`);

      const imgArea = grayImage.cols * grayImage.rows;
      // Cell size bounds: cells should be between 0.001% and 1% of image area.
      // For a 1190x1684 image this is ~20px² to ~20000px² — covers cells from ~5px to ~140px per side.
      const minCellArea = imgArea * 0.00001;
      const maxCellArea = imgArea * 0.01;
      // console.log(`[GridProcessing] Contour clustering: cell area bounds [${minCellArea.toFixed(0)}, ${maxCellArea.toFixed(0)}]`);

      // Collect cell-like rectangular contours
      const cellRects = [];
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        if (area < minCellArea || area > maxCellArea) continue;

        const rect = cv.boundingRect(contour);
        const rectArea = rect.width * rect.height;
        if (rectArea === 0) continue;

        const rectangularity = area / rectArea;
        if (rectangularity < 0.6) continue;

        // Reject very elongated shapes (aspect ratio > 3:1) — these are lines, not cells
        const aspect = Math.max(rect.width / rect.height, rect.height / rect.width);
        if (aspect > 3) continue;

        cellRects.push(rect);
      }

      // console.log(`[GridProcessing] Contour clustering: ${cellRects.length} cell-like rectangular contours passed filters`);
      if (cellRects.length < 6) {
        // console.log(`[GridProcessing] Contour clustering: FAILED — too few cell contours (${cellRects.length} < 6)`);
        return { found: false };
      }

      // Find the dominant cell size — the mode of cell dimensions.
      // Bin widths/heights into buckets of 4px to find the most common cell size.
      const binSize = 4;
      const widthBins = {};
      const heightBins = {};
      for (const r of cellRects) {
        const wBin = Math.round(r.width / binSize) * binSize;
        const hBin = Math.round(r.height / binSize) * binSize;
        widthBins[wBin] = (widthBins[wBin] || 0) + 1;
        heightBins[hBin] = (heightBins[hBin] || 0) + 1;
      }

      const modeWidth = +Object.entries(widthBins).sort((a, b) => b[1] - a[1])[0][0];
      const modeHeight = +Object.entries(heightBins).sort((a, b) => b[1] - a[1])[0][0];
      // console.log(`[GridProcessing] Contour clustering: dominant cell size ${modeWidth}x${modeHeight}px (bin size=${binSize})`);
      // console.log(`[GridProcessing] Contour clustering: width bins: ${JSON.stringify(widthBins)}`);
      // console.log(`[GridProcessing] Contour clustering: height bins: ${JSON.stringify(heightBins)}`);

      // Keep only contours whose dimensions are within ±50% of the mode
      const filtered = cellRects.filter(r => {
        const wRatio = r.width / modeWidth;
        const hRatio = r.height / modeHeight;
        return wRatio > 0.5 && wRatio < 1.5 && hRatio > 0.5 && hRatio < 1.5;
      });

      // console.log(`[GridProcessing] Contour clustering: ${filtered.length} contours after size filtering (±50% of mode)`);
      if (filtered.length < 6) {
        // console.log(`[GridProcessing] Contour clustering: FAILED — too few contours after size filter (${filtered.length} < 6)`);
        return { found: false };
      }

      // Find the densest rectangular sub-region of cells.
      // Grid cells are packed tightly; text characters are spread across the page.
      // Strategy: divide image into coarse blocks (5x5 cells each), count cells
      // per block, flood fill from the densest block to find the connected grid region.
      const blockW = Math.max(1, modeWidth * 5);
      const blockH = Math.max(1, modeHeight * 5);
      const gridCols = Math.ceil(grayImage.cols / blockW);
      const gridRows = Math.ceil(grayImage.rows / blockH);
      const densityMap = new Array(gridRows).fill(null).map(() => new Array(gridCols).fill(0));

      for (const r of filtered) {
        const col = Math.min(gridCols - 1, Math.floor((r.x + r.width / 2) / blockW));
        const row = Math.min(gridRows - 1, Math.floor((r.y + r.height / 2) / blockH));
        densityMap[row][col]++;
      }

      // Step 2: Find connected region of high-density blocks.
      // A grid block should have at least 1 cell. Use flood fill from the densest block.
      let maxDensity = 0;
      let maxRow = 0, maxCol = 0;
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          if (densityMap[r][c] > maxDensity) {
            maxDensity = densityMap[r][c];
            maxRow = r;
            maxCol = c;
          }
        }
      }

      // Flood fill from the densest block.
      // A 5x5 cell block in a grid should contain multiple cells.
      // Use a threshold of 25% of peak density to separate grid from sparse text.
      const fillThreshold = Math.max(2, Math.floor(maxDensity * 0.25));
      // console.log(`[GridProcessing] Contour clustering: flood fill threshold = ${fillThreshold} (25% of peak ${maxDensity})`);
      const visited = new Array(gridRows).fill(null).map(() => new Array(gridCols).fill(false));
      const regionBlocks = [];
      const queue = [[maxRow, maxCol]];
      visited[maxRow][maxCol] = true;

      while (queue.length > 0) {
        const [r, c] = queue.shift();
        if (densityMap[r][c] < fillThreshold) continue;
        regionBlocks.push([r, c]);
        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols && !visited[nr][nc]) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }

      // Step 3: Bounding box of the flood-filled region
      let minBlockCol = Infinity, maxBlockCol = 0, minBlockRow = Infinity, maxBlockRow = 0;
      for (const [r, c] of regionBlocks) {
        minBlockCol = Math.min(minBlockCol, c);
        maxBlockCol = Math.max(maxBlockCol, c);
        minBlockRow = Math.min(minBlockRow, r);
        maxBlockRow = Math.max(maxBlockRow, r);
      }

      // Check that the region is grid-like: should span multiple columns AND rows
      const regionColSpan = maxBlockCol - minBlockCol + 1;
      const regionRowSpan = maxBlockRow - minBlockRow + 1;
      // console.log(`[GridProcessing] Contour clustering: densest region spans ${regionColSpan}x${regionRowSpan} blocks (${regionBlocks.length} filled blocks), peak density=${maxDensity}`);

      if (regionColSpan < 3 || regionRowSpan < 3) {
        // console.log(`[GridProcessing] Contour clustering: FAILED — region too small to be a grid`);
        return { found: false };
      }

      // Check density: the region should be mostly filled (grid is dense, not sparse)
      const regionFill = regionBlocks.length / (regionColSpan * regionRowSpan);
      // console.log(`[GridProcessing] Contour clustering: region fill ratio = ${regionFill.toFixed(2)} (${regionBlocks.length}/${regionColSpan * regionRowSpan})`);

      if (regionFill < 0.3) {
        // console.log(`[GridProcessing] Contour clustering: FAILED — region too sparse (fill ${regionFill.toFixed(2)} < 0.3)`);
        return { found: false };
      }

      // Convert block coordinates to pixel coordinates
      // Use actual cell positions within the region for a tighter bounding box
      const regionCells = filtered.filter(r => {
        const col = Math.min(gridCols - 1, Math.floor((r.x + r.width / 2) / blockW));
        const row = Math.min(gridRows - 1, Math.floor((r.y + r.height / 2) / blockH));
        return col >= minBlockCol && col <= maxBlockCol && row >= minBlockRow && row <= maxBlockRow;
      });

      let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
      for (const r of regionCells) {
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
      }

      // Sanity check: the cluster should cover a reasonable area (at least 2% of image)
      const clusterArea = (maxX - minX) * (maxY - minY);
      if (clusterArea < imgArea * 0.02) {
        // console.log(`[GridProcessing] Contour clustering: FAILED — cluster area too small (${clusterArea.toFixed(0)} < ${(imgArea * 0.02).toFixed(0)}, ${(clusterArea / imgArea * 100).toFixed(1)}% of image)`);
        return { found: false };
      }

      // Derive grid line positions from cell boundaries.
      // Collect all cell edge positions, then deduplicate nearby edges.
      const rawVEdges = [];
      const rawHEdges = [];
      for (const r of regionCells) {
        rawVEdges.push(r.x, r.x + r.width);
        rawHEdges.push(r.y, r.y + r.height);
      }
      rawVEdges.sort((a, b) => a - b);
      rawHEdges.sort((a, b) => a - b);

      // Merge edges within 50% of cell size — same grid line seen from adjacent cells
      const mergeDistance = Math.max(4, Math.round(modeWidth * 0.5));
      const mergeEdges = (sorted) => {
        const merged = [];
        let i = 0;
        while (i < sorted.length) {
          let sum = sorted[i];
          let count = 1;
          let j = i + 1;
          while (j < sorted.length && sorted[j] - sorted[i] <= mergeDistance) {
            sum += sorted[j];
            count++;
            j++;
          }
          merged.push(Math.round(sum / count));
          i = j;
        }
        return merged;
      };

      const vLinePositions = mergeEdges(rawVEdges);
      const hLinePositions = mergeEdges(rawHEdges);
      // console.log(`[GridProcessing] Contour clustering: derived ${vLinePositions.length} vertical, ${hLinePositions.length} horizontal line positions from cell edges (merge distance=${mergeDistance}px)`);

      // console.log(`[GridProcessing] Contour clustering: SUCCESS — grid border at (${minX},${minY}) ${maxX - minX}x${maxY - minY} (${(clusterArea / imgArea * 100).toFixed(1)}% of image, ${regionCells.length} cells in region)`);
      return {
        found: true,
        gridArea: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        cellSize: { width: modeWidth, height: modeHeight },
        vLinePositions,
        hLinePositions
      };

    } finally {
      if (binary) binary.delete();
      if (contours) contours.delete();
      if (hierarchy) hierarchy.delete();
    }
  };

  /**
   * Synchronous grid detection function (wrapped by timeout)
   */
  const detectGridSync = (cv, grayImage, options = {}) => {
    // console.log(`[GridProcessing] Detecting grid structure... ${options.assumeFullGrid ? '(tile mode — assuming full grid)' : ''} Image: ${grayImage.cols}x${grayImage.rows}`);
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
      // console.log('[GridProcessing] Tile mode: using full image as grid area');
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
      // ── NORMAL MODE: multi-scale border detection ──
      // Try progressively smaller morph kernels to find the grid border.
      // Large kernels (10%) work for charts that fill the page but erase
      // grid lines on charts that occupy only part of the image.
      // Each entry: [kernelScale, minAreaFraction]
      // Smaller kernels find smaller grids, so we lower the area threshold too.
      const BORDER_ATTEMPTS = [
        [0.10, 0.05],  // 10% kernel, grid must be ≥5% of image
        [0.05, 0.03],  // 5% kernel, grid must be ≥3% of image
        [0.03, 0.01],  // 3% kernel, grid must be ≥1% of image
      ];

      for (const [scale, minArea] of BORDER_ATTEMPTS) {
        const detection = attemptBorderDetection(cv, grayImage, scale, minArea);

        if (detection.found) {
          // Transfer ownership of Mats that need outer-scope cleanup
          binary = detection.binary;
          horizontalKernel = detection.horizontalKernel;
          verticalKernel = detection.verticalKernel;
          horizontalLines = detection.horizontalLines;
          verticalLinesMat = detection.verticalLinesMat;
          gridStructure = detection.gridStructure;
          morphedGrid = detection.morphedGrid;
          closeKernel = detection.closeKernel;
          contours = detection.contours;
          hierarchy = detection.hierarchy;

          result.gridFound = true;
          const rect = cv.boundingRect(detection.gridContour);

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
          const deskewAngle = computeDeskewAngle(cv, detection.gridContour);
          if (deskewAngle !== 0) {
            // console.log(`[GridProcessing] Deskewing image by ${deskewAngle.toFixed(2)} degrees`);
            deskewedImage = deskewImage(cv, grayImage, deskewAngle);
          } else {
            // console.log('[GridProcessing] Image is already aligned, skipping deskew');
          }

          break;
        } else {
          // This scale failed — clean up its Mats before trying the next scale
          detection.cleanup();
        }
      }

      // Contour clustering fallback: find the grid as a dense cluster of cell-sized rectangles
      if (!result.gridFound) {
        const clustering = detectBorderViaContourClustering(cv, grayImage);
        if (clustering.found) {
          result.gridFound = true;
          const { x, y, width, height } = clustering.gridArea;
          result.gridArea = clustering.gridArea;
          // Pass cell size hint and derived line positions to internal line detection
          result.cellSizeHint = clustering.cellSize;
          result.clusterLinePositions = {
            vertical: clustering.vLinePositions,
            horizontal: clustering.hLinePositions
          };

          result.horizontalLines.push(
            { x1: x, y1: y, x2: x + width, y2: y, isGridBorder: true },
            { x1: x, y1: y + height, x2: x + width, y2: y + height, isGridBorder: true }
          );
          result.verticalLines.push(
            { x1: x, y1: y, x2: x, y2: y + height, isGridBorder: true },
            { x1: x + width, y1: y, x2: x + width, y2: y + height, isGridBorder: true }
          );
        }
      }

      // Final fallback: treat entire image as grid. The interactive editor is the safety net.
      if (!result.gridFound) {
        // console.log('[GridProcessing] All border detection methods failed — using full image as grid area');
        result.gridFound = true;
        result.gridArea = {
          x: 0,
          y: 0,
          width: grayImage.cols,
          height: grayImage.rows
        };

        result.horizontalLines.push(
          { x1: 0, y1: 0, x2: grayImage.cols, y2: 0, isGridBorder: true },
          { x1: 0, y1: grayImage.rows, x2: grayImage.cols, y2: grayImage.rows, isGridBorder: true }
        );
        result.verticalLines.push(
          { x1: 0, y1: 0, x2: 0, y2: grayImage.rows, isGridBorder: true },
          { x1: grayImage.cols, y1: 0, x2: grayImage.cols, y2: grayImage.rows, isGridBorder: true }
        );
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
          // console.log(`[GridProcessing] Grid ROI dimensions: ${width}x${height} pixels`);
          // console.log(`[GridProcessing] Image classification: ${resolutionCategory}`);
          
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
          // console.log('[GridProcessing] Step 1: Detecting black/dark lines with adaptive threshold...');
          
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

          // console.log(`[GridProcessing] Step 1: Hough detected ${verticalLines.rows} potential vertical and ${horizontalLines.rows} potential horizontal lines`);

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


          // console.log(`[GridProcessing] Step 1 result: ${result.verticalLines.filter(l => !l.isGridBorder).length} vertical, ${result.horizontalLines.filter(l => !l.isGridBorder).length} horizontal internal lines`);

          // STEP 2: Supplementary detection for light gray lines using improved pixel analysis
          // console.log('[GridProcessing] Step 2: Detecting light gray lines with pixel analysis...');
          
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

          // console.log(`[GridProcessing] Step 2 result: ${result.verticalLines.filter(l => !l.isGridBorder).length} vertical lines total (after light gray)`);

          // STEP 3: Detection for medium gray lines
          // console.log('[GridProcessing] Step 3: Detecting medium gray lines...');

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


          // console.log(`[GridProcessing] Step 3 result: ${result.verticalLines.filter(l => !l.isGridBorder).length} vertical lines total (after medium gray)`);

          // STEP 3b: Horizontal medium gray line detection via row-wise pixel scanning
          // Mirrors the vertical column scan from Step 3 but scans rows instead of columns.
          // console.log('[GridProcessing] Step 3b: Detecting horizontal medium gray lines...');

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


          // console.log(`[GridProcessing] Step 3b result: ${result.horizontalLines.filter(l => !l.isGridBorder).length} horizontal lines total (after horizontal medium gray)`);

          // STEP 4: Projection profile analysis + regularity enforcement
          // console.log('[GridProcessing] Step 4: Projection profile analysis + regularity enforcement...');
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
          // console.log(`[GridProcessing] Step 4: Projection profiles found ${vPeaks.length} vertical peaks, ${hPeaks.length} horizontal peaks`);

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
            // console.log(`[GridProcessing] Step 4: Using projection peaks for vertical spacing (only ${existingVerticalPositions.length} detected lines)`);
            medianVerticalSpacing = computeMedianSpacing(vPeakPositions);
          }
          if (existingHorizontalPositions.length < 3 && hPeakPositions.length >= 3) {
            // console.log(`[GridProcessing] Step 4: Using projection peaks for horizontal spacing (only ${existingHorizontalPositions.length} detected lines)`);
            medianHorizontalSpacing = computeMedianSpacing(hPeakPositions);
          }

          // If contour clustering detected cell size, use it as a sanity check.
          // Override spacing and clear noisy lines when:
          // 1. Computed spacing is unreasonably small (< 50% of hint), or
          // 2. Detected line count is far below expected (< 50% of what the hint predicts)
          if (result.cellSizeHint) {
            const hintW = result.cellSizeHint.width;
            const hintH = result.cellSizeHint.height;
            const expectedFromHintV = Math.round(width / hintW);
            const expectedFromHintH = Math.round(height / hintH);
            const detectedV = existingVerticalPositions.length;
            const detectedH = existingHorizontalPositions.length;

            if (medianVerticalSpacing < hintW * 0.5 || (expectedFromHintV > 5 && detectedV < expectedFromHintV * 0.5)) {
              // console.log(`[GridProcessing] Step 4: Vertical — spacing=${medianVerticalSpacing.toFixed(1)}px, detected=${detectedV}, expected~${expectedFromHintV} from hint ${hintW}px — overriding and clearing noisy lines`);
              medianVerticalSpacing = hintW;
              result.verticalLines = result.verticalLines.filter(l => l.isGridBorder);
            }
            if (medianHorizontalSpacing < hintH * 0.5 || (expectedFromHintH > 5 && detectedH < expectedFromHintH * 0.5)) {
              // console.log(`[GridProcessing] Step 4: Horizontal — spacing=${medianHorizontalSpacing.toFixed(1)}px, detected=${detectedH}, expected~${expectedFromHintH} from hint ${hintH}px — overriding and clearing noisy lines`);
              medianHorizontalSpacing = hintH;
              result.horizontalLines = result.horizontalLines.filter(l => l.isGridBorder);
            }
          }

          // console.log(`[GridProcessing] Step 4: Median spacing: vertical=${medianVerticalSpacing.toFixed(1)}px, horizontal=${medianHorizontalSpacing.toFixed(1)}px`);

          // Recompute positions after potential noise clearing (include borders as anchors)
          const currentVerticalPositions = [
            0,  // left border
            ...result.verticalLines.filter(l => !l.isGridBorder).map(l => l.x1 - x),
            width  // right border
          ].sort((a, b) => a - b);
          const currentHorizontalPositions = [
            0,  // top border
            ...result.horizontalLines.filter(l => !l.isGridBorder).map(l => l.y1 - y),
            height  // bottom border
          ].sort((a, b) => a - b);

          // If contour clustering provided line positions, use them directly
          // (they're derived from actual cell edges, so they're more accurate than interpolation)
          if (result.clusterLinePositions) {
            const clusterV = result.clusterLinePositions.vertical;
            const clusterH = result.clusterLinePositions.horizontal;

            // Convert from image coordinates to ROI-relative, filter to within ROI
            const existingV = new Set(result.verticalLines.map(l => l.x1));
            for (const pos of clusterV) {
              const roiPos = pos - x;
              if (roiPos > 5 && roiPos < width - 5 && !existingV.has(pos)) {
                result.verticalLines.push({
                  x1: pos,
                  y1: y,
                  x2: pos,
                  y2: y + height,
                  isGridBorder: false,
                  isVerticalGridLine: true,
                  detectionMethod: 'cluster-derived',
                  confidence: 0.7
                });
              }
            }

            const existingH = new Set(result.horizontalLines.map(l => l.y1));
            for (const pos of clusterH) {
              const roiPos = pos - y;
              if (roiPos > 5 && roiPos < height - 5 && !existingH.has(pos)) {
                result.horizontalLines.push({
                  x1: x,
                  y1: pos,
                  x2: x + width,
                  y2: pos,
                  isGridBorder: false,
                  isHorizontalGridLine: true,
                  detectionMethod: 'cluster-derived',
                  confidence: 0.7
                });
              }
            }
            // console.log(`[GridProcessing] Step 4: Added ${clusterV.length} vertical, ${clusterH.length} horizontal lines from cluster cell edges`);
          } else {
            // Standard interpolation path (no cluster data)
            const interpTolerance = 0.25;

            // Interpolate missing vertical lines
            if (medianVerticalSpacing > 0 && currentVerticalPositions.length >= 2) {
              const interpolated = interpolateMissingLines(currentVerticalPositions, medianVerticalSpacing, interpTolerance);
              const newPositions = interpolated.filter(
                pos => !currentVerticalPositions.some(existing => Math.abs(existing - pos) < medianVerticalSpacing * 0.2)
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
          }

          // Interpolate missing horizontal lines (only for non-cluster path)
          if (!result.clusterLinePositions && medianHorizontalSpacing > 0 && currentHorizontalPositions.length >= 2) {
            const interpolated = interpolateMissingLines(currentHorizontalPositions, medianHorizontalSpacing, 0.25);
            const newPositions = interpolated.filter(
              pos => !currentHorizontalPositions.some(existing => Math.abs(existing - pos) < medianHorizontalSpacing * 0.2)
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
          // console.log(`[GridProcessing] Step 4 result: ${totalVertical} vertical, ${totalHorizontal} horizontal lines after regularity enforcement`);

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
              // console.log(`[GridProcessing] Step 5: CC fallback triggered (detected ${detectedCols}/${expectedCols} cols=${colRatio.toFixed(2)}, ${detectedRows}/${expectedRows} rows=${rowRatio.toFixed(2)})`);

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
                  // console.log(`[GridProcessing] Step 5: CC fallback found ${validCells.length} cell-sized components, added ${ccVerticalAdded} vertical + ${ccHorizontalAdded} horizontal lines`);
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
              // console.log(`[GridProcessing] Step 5: Skipping CC fallback (detection ratio: cols=${colRatio.toFixed(2)}, rows=${rowRatio.toFixed(2)})`);
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

    // console.log(`[GridProcessing] Grid detection completed: ${result.verticalLines.filter(l => !l.isGridBorder).length} vertical + ${result.horizontalLines.filter(l => !l.isGridBorder).length} horizontal internal lines, gridArea=${result.gridArea ? `(${result.gridArea.x},${result.gridArea.y}) ${result.gridArea.width}x${result.gridArea.height}` : 'none'}`);
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